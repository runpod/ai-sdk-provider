import { ImageModelV2, ImageModelV2CallWarning } from '@ai-sdk/provider';
import {
  combineHeaders,
  createJsonResponseHandler,
  createBinaryResponseHandler,
  FetchFunction,
  postJsonToApi,
  getFromApi,
} from '@ai-sdk/provider-utils';
import { InvalidArgumentError } from '@ai-sdk/provider';
import { z } from 'zod';
import { runpodImageFailedResponseHandler } from './runpod-error';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface RunpodImageModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
}

// Runpod supported aspect ratios (only validated working sizes)
const SUPPORTED_ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1328*1328', // ✅ Native support
  '4:3': '1472*1140', // ✅ Native support
  '3:4': '1140*1472', // ✅ Native support
};

// Runpod supported sizes (validated working sizes)
const SUPPORTED_SIZES = new Set([
  // Native aspect ratio sizes
  '1328*1328', // 1:1
  '1472*1140', // 4:3
  '1140*1472', // 3:4
  // Additional validated sizes
  '512*512',
  '768*768',
  '1024*1024',
  '1536*1536',
  '2048*2048',
  '4096*4096',
  '512*768',
  '768*512',
  '1024*768',
  '768*1024',
]);

export class RunpodImageModel implements ImageModelV2 {
  readonly specificationVersion = 'v2';
  readonly maxImagesPerCall = 1;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: string,
    private config: RunpodImageModelConfig
  ) {}

  async doGenerate({
    prompt,
    n = 1,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal,
  }: Parameters<ImageModelV2['doGenerate']>[0]): Promise<
    Awaited<ReturnType<ImageModelV2['doGenerate']>>
  > {
    const warnings: Array<ImageModelV2CallWarning> = [];

    // Check if this is a Pruna model (skip standard size/aspectRatio validation)
    const isPrunaModel =
      this.modelId.includes('pruna') || this.modelId.includes('p-image');

    // Determine the size to use
    let runpodSize: string;

    if (isPrunaModel) {
      // Pruna models use aspect_ratio string directly, skip size validation
      // Pass through the aspectRatio or use default, validation happens at API level
      runpodSize = aspectRatio || '1:1';
    } else if (size) {
      // Convert AI SDK format "1328x1328" to Runpod format "1328*1328"
      const runpodSizeCandidate = size.replace('x', '*');

      // Validate size is supported
      if (!SUPPORTED_SIZES.has(runpodSizeCandidate)) {
        throw new InvalidArgumentError({
          argument: 'size',
          message: `Size ${size} is not supported by Runpod. Supported sizes: ${Array.from(
            SUPPORTED_SIZES
          )
            .map((s) => s.replace('*', 'x'))
            .join(', ')}`,
        });
      }

      runpodSize = runpodSizeCandidate;
    } else if (aspectRatio) {
      // Validate aspect ratio is supported
      if (!SUPPORTED_ASPECT_RATIOS[aspectRatio]) {
        throw new InvalidArgumentError({
          argument: 'aspectRatio',
          message: `Aspect ratio ${aspectRatio} is not supported by Runpod. Supported aspect ratios: ${Object.keys(SUPPORTED_ASPECT_RATIOS).join(', ')}`,
        });
      }

      // Use supported aspect ratio mapping
      runpodSize = SUPPORTED_ASPECT_RATIOS[aspectRatio];
    } else {
      // Default to square format
      runpodSize = '1328*1328';
    }

    // Handle multiple images warning
    if (n > 1) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'n',
        details:
          'Runpod image models only support generating 1 image at a time. Using n=1.',
      });
    }

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    // Runpod uses a different request format - /runsync endpoint with input wrapper
    const inputPayload = this.buildInputPayload(
      prompt,
      runpodSize,
      seed,
      providerOptions.runpod,
      aspectRatio
    );

    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/runsync`,
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        input: inputPayload,
      },
      failedResponseHandler: runpodImageFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        runpodImageResponseSchema as any
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    // Handle both sync and async responses from Runpod
    const typedResponse = response as any;
    if (
      typedResponse.status === 'COMPLETED' &&
      (typedResponse.output?.result || typedResponse.output?.image_url)
    ) {
      // Sync response - image is ready
      // Different models use different response formats: result vs image_url
      const imageUrl =
        typedResponse.output.result || typedResponse.output.image_url;
      const imageData = await this.downloadImage(imageUrl, abortSignal);

      return {
        images: [imageData],
        warnings,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders,
        },
        providerMetadata: {
          runpod: {
            images: [
              {
                url: imageUrl,
                cost: typedResponse.output?.cost,
              },
            ],
          },
        },
      };
    } else if (
      typedResponse.status === 'IN_QUEUE' ||
      typedResponse.status === 'IN_PROGRESS'
    ) {
      // Async response - need to poll for completion
      const pollOptions = {
        maxAttempts: providerOptions.runpod?.maxPollAttempts as number,
        pollIntervalMillis: providerOptions.runpod
          ?.pollIntervalMillis as number,
      };
      const imageUrl = await this.pollForCompletion(
        typedResponse.id,
        abortSignal,
        pollOptions
      );
      const imageData = await this.downloadImage(imageUrl, abortSignal);

      return {
        images: [imageData],
        warnings,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders,
        },
        providerMetadata: {
          runpod: {
            images: [
              {
                url: imageUrl,
                jobId: typedResponse.id,
              },
            ],
          },
        },
      };
    } else {
      throw new Error(`Unexpected response status: ${typedResponse.status}`);
    }
  }

  private async downloadImage(
    imageUrl: string,
    abortSignal?: AbortSignal
  ): Promise<Uint8Array> {
    const { value: imageData } = await getFromApi({
      url: imageUrl,
      successfulResponseHandler: createBinaryResponseHandler(),
      failedResponseHandler: runpodImageFailedResponseHandler,
      abortSignal,
      fetch: this.config.fetch,
    });
    return imageData;
  }

  private async pollForCompletion(
    jobId: string,
    abortSignal?: AbortSignal,
    pollOptions?: { maxAttempts?: number; pollIntervalMillis?: number }
  ): Promise<string> {
    const maxAttempts = pollOptions?.maxAttempts ?? 60; // 5 minutes with 5-second intervals
    const pollInterval = pollOptions?.pollIntervalMillis ?? 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Image generation was aborted');
      }

      const { value: statusResponse } = await getFromApi({
        url: `${this.config.baseURL}/status/${jobId}`,
        headers: this.config.headers(),
        successfulResponseHandler: createJsonResponseHandler(
          runpodImageStatusSchema as any
        ),
        failedResponseHandler: runpodImageFailedResponseHandler,
        abortSignal,
        fetch: this.config.fetch,
      });

      const typedStatusResponse = statusResponse as any;
      if (
        typedStatusResponse.status === 'COMPLETED' &&
        (typedStatusResponse.output?.result ||
          typedStatusResponse.output?.image_url)
      ) {
        return (
          typedStatusResponse.output.result ||
          typedStatusResponse.output.image_url
        );
      }

      if (typedStatusResponse.status === 'FAILED') {
        throw new Error(
          `Image generation failed: ${typedStatusResponse.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Image generation timed out after ${maxAttempts} attempts (${(maxAttempts * pollInterval) / 1000}s)`
    );
  }

  private buildInputPayload(
    prompt: string,
    runpodSize: string,
    seed?: number,
    runpodOptions?: Record<string, unknown>,
    aspectRatio?: string
  ): Record<string, unknown> {
    // Check if this is a Flux model that uses different parameters
    const isFluxModel =
      this.modelId.includes('flux') ||
      this.modelId.includes('black-forest-labs');

    if (isFluxModel) {
      // Check if this is Flux Kontext (uses different parameters)
      const isKontext = this.modelId.includes('kontext');

      if (isKontext) {
        // Flux Kontext uses size format and has image input
        return {
          prompt,
          negative_prompt: runpodOptions?.negative_prompt ?? '',
          seed: seed ?? -1,
          num_inference_steps: 28,
          guidance: 2,
          size: runpodSize,
          output_format: 'png',
          enable_safety_checker: runpodOptions?.enable_safety_checker ?? true,
          ...runpodOptions, // This will include the 'image' parameter if provided
        };
      } else {
        // Regular Flux models use width/height
        const [width, height] = runpodSize.split('*').map(Number);

        return {
          prompt,
          negative_prompt: runpodOptions?.negative_prompt ?? '',
          seed: seed ?? -1,
          num_inference_steps: this.modelId.includes('schnell') ? 4 : 28,
          guidance: this.modelId.includes('schnell') ? 7 : 2,
          width,
          height,
          image_format: 'png',
          ...runpodOptions,
        };
      }
    }

    // Check if this is a Pruna model
    const isPrunaModel =
      this.modelId.includes('pruna') || this.modelId.includes('p-image');
    if (isPrunaModel) {
      const isPrunaEdit = this.modelId.includes('edit');

      if (isPrunaEdit) {
        // Pruna image edit
        // Supported aspect_ratio: "match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"
        // Supports 1-5 images via providerOptions.runpod.images
        const editPayload: Record<string, unknown> = {
          prompt,
          aspect_ratio:
            (runpodOptions?.aspect_ratio as string) ??
            aspectRatio ??
            'match_input_image',
          disable_safety_checker:
            (runpodOptions?.disable_safety_checker as boolean) ?? false,
        };

        // Add seed if provided
        if (seed !== undefined) {
          editPayload.seed = seed;
        } else if (runpodOptions?.seed !== undefined) {
          editPayload.seed = runpodOptions.seed;
        }

        // Add images array (required, 1-5 images)
        if (runpodOptions?.images) {
          editPayload.images = runpodOptions.images;
        }

        return editPayload;
      } else {
        // Pruna text-to-image
        // Supported aspect_ratio: "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "custom"
        // For custom: width/height 256-1440, must be multiple of 16
        const t2iPayload: Record<string, unknown> = {
          prompt,
          aspect_ratio:
            (runpodOptions?.aspect_ratio as string) ?? aspectRatio ?? '1:1',
          disable_safety_checker:
            (runpodOptions?.disable_safety_checker as boolean) ?? false,
        };

        // Add seed if provided
        if (seed !== undefined) {
          t2iPayload.seed = seed;
        } else if (runpodOptions?.seed !== undefined) {
          t2iPayload.seed = runpodOptions.seed;
        }

        // Handle custom aspect ratio with width/height
        if (t2iPayload.aspect_ratio === 'custom') {
          if (runpodOptions?.width) {
            t2iPayload.width = runpodOptions.width;
          }
          if (runpodOptions?.height) {
            t2iPayload.height = runpodOptions.height;
          }
        }

        return t2iPayload;
      }
    }

    // Check if this is a Nano Banana Pro model (google/nano-banana-pro-edit)
    const isNanaBananaProModel = this.modelId.includes('nano-banana-pro');
    if (isNanaBananaProModel) {
      return {
        prompt,
        resolution: runpodOptions?.resolution ?? '1k',
        output_format: runpodOptions?.output_format ?? 'jpeg',
        enable_base64_output: runpodOptions?.enable_base64_output ?? false,
        enable_sync_mode: runpodOptions?.enable_sync_mode ?? false,
        ...runpodOptions,
      };
    }

    // Default format for Qwen and other models
    return {
      prompt,
      negative_prompt: runpodOptions?.negative_prompt ?? '',
      size: runpodSize,
      seed: seed ?? -1,
      enable_safety_checker: runpodOptions?.enable_safety_checker ?? true,
      ...runpodOptions,
    };
  }
}

// Runpod image API response schema (handles both sync and async responses)
const runpodImageResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['COMPLETED', 'IN_QUEUE', 'IN_PROGRESS', 'FAILED']),
  delayTime: z.number().optional(),
  executionTime: z.number().optional(),
  output: z
    .object({
      cost: z.number().optional(),
      result: z.string().optional(), // URL to the generated image (Qwen format)
      image_url: z.string().optional(), // URL to the generated image (Flux format)
    })
    .optional(), // Optional for IN_QUEUE/IN_PROGRESS responses
});

// Schema for polling status endpoint
const runpodImageStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['COMPLETED', 'IN_QUEUE', 'IN_PROGRESS', 'FAILED']),
  output: z
    .object({
      cost: z.number().optional(),
      result: z.string().optional(),
      image_url: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(), // Error message if FAILED
});
