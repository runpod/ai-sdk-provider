import {
  ImageModelV3,
  ImageModelV3CallOptions,
  ImageModelV3File,
  SharedV3Warning,
} from '@ai-sdk/provider';
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

export class RunpodImageModel implements ImageModelV3 {
  readonly specificationVersion = 'v3';
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
    n,
    size,
    aspectRatio,
    seed,
    files,
    mask,
    providerOptions,
    headers,
    abortSignal,
  }: ImageModelV3CallOptions): Promise<
    Awaited<ReturnType<ImageModelV3['doGenerate']>>
  > {
    const warnings: Array<SharedV3Warning> = [];

    // Convert standardized files to Runpod format (base64 data URLs or raw base64)
    const standardizedImages = this.convertFilesToRunpodFormat(files);

    if (mask) {
      warnings.push({
        type: 'unsupported',
        feature: 'mask',
        details: 'Mask input for inpainting is not yet supported.',
      });
    }

    // Check if this is a Pruna model (skip standard size/aspectRatio validation)
    const isPrunaModel =
      this.modelId.includes('pruna') || this.modelId.includes('p-image');

    // Check if this is a Nano Banana Pro model (skip standard size/aspectRatio validation)
    const isNanoBananaProModel = this.modelId.includes('nano-banana-pro');

    // Determine the size to use
    let runpodSize: string;

    if (isPrunaModel || isNanoBananaProModel) {
      // These models use aspect_ratio string directly, skip size validation
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
        type: 'unsupported',
        feature: 'multiple images (n > 1)',
        details:
          'Runpod image models only support generating 1 image at a time. Using n=1.',
      });
    }

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    // Runpod uses a different request format - /runsync endpoint with input wrapper
    const inputPayload = this.buildInputPayload(
      prompt ?? '',
      runpodSize,
      seed,
      providerOptions.runpod as Record<string, unknown> | undefined,
      aspectRatio,
      standardizedImages
    );

    // Determine the effective baseURL (may switch for LoRA models)
    let effectiveBaseURL = this.config.baseURL;
    const runpodOptions = providerOptions.runpod as
      | Record<string, unknown>
      | undefined;
    if (
      this.modelId.includes('qwen-image-edit-2511') &&
      !this.modelId.includes('lora') &&
      runpodOptions?.loras &&
      Array.isArray(runpodOptions.loras) &&
      runpodOptions.loras.length > 0
    ) {
      // Switch to LoRA endpoint when loras are provided
      effectiveBaseURL = this.config.baseURL.replace(
        'qwen-image-edit-2511',
        'qwen-image-edit-2511-lora'
      );
    }

    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${effectiveBaseURL}/runsync`,
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
        pollOptions,
        effectiveBaseURL
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
    pollOptions?: { maxAttempts?: number; pollIntervalMillis?: number },
    effectiveBaseURL?: string
  ): Promise<string> {
    const maxAttempts = pollOptions?.maxAttempts ?? 60; // 5 minutes with 5-second intervals
    const pollInterval = pollOptions?.pollIntervalMillis ?? 5000; // 5 seconds
    const baseURL = effectiveBaseURL ?? this.config.baseURL;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Image generation was aborted');
      }

      const { value: statusResponse } = await getFromApi({
        url: `${baseURL}/status/${jobId}`,
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

  /**
   * Converts standardized ImageModelV3File[] to Runpod-compatible format.
   * Returns URLs or base64 data URLs that Runpod API accepts.
   */
  private convertFilesToRunpodFormat(
    files: ImageModelV3File[] | undefined
  ): string[] | undefined {
    if (!files || files.length === 0) {
      return undefined;
    }

    return files.map((file) => {
      // Handle URL type - return URL directly
      if (file.type === 'url') {
        return file.url;
      }

      // Handle file type with data
      if (typeof file.data === 'string') {
        // If it's already a data URL, return as-is
        if (file.data.startsWith('data:')) {
          return file.data;
        }
        // Otherwise, wrap as data URL with media type
        return `data:${file.mediaType};base64,${file.data}`;
      }

      // Convert Uint8Array to base64 data URL
      const base64 = this.uint8ArrayToBase64(file.data);
      return `data:${file.mediaType};base64,${base64}`;
    });
  }

  /**
   * Converts Uint8Array to base64 string.
   */
  private uint8ArrayToBase64(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  private buildInputPayload(
    prompt: string,
    runpodSize: string,
    seed?: number,
    runpodOptions?: Record<string, unknown>,
    aspectRatio?: string,
    standardizedImages?: string[]
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
        // Prioritize standardized files over providerOptions
        const kontextPayload: Record<string, unknown> = {
          prompt,
          negative_prompt: runpodOptions?.negative_prompt ?? '',
          seed: seed ?? -1,
          num_inference_steps: 28,
          guidance: 2,
          size: runpodSize,
          output_format: 'png',
          enable_safety_checker: runpodOptions?.enable_safety_checker ?? true,
          ...runpodOptions,
        };

        // Use standardized files if provided (first image), otherwise use providerOptions.image
        if (standardizedImages && standardizedImages.length > 0) {
          kontextPayload.image = standardizedImages[0];
        }

        return kontextPayload;
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
        // Supported aspect_ratio: "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"
        // Supports 1-5 images via providerOptions.runpod.images
        const editPayload: Record<string, unknown> = {
          prompt,
          aspect_ratio:
            (runpodOptions?.aspect_ratio as string) ?? aspectRatio ?? '1:1',
          disable_safety_checker:
            (runpodOptions?.disable_safety_checker as boolean) ?? false,
        };

        // Add seed if provided
        if (seed !== undefined) {
          editPayload.seed = seed;
        } else if (runpodOptions?.seed !== undefined) {
          editPayload.seed = runpodOptions.seed;
        }

        // Use standardized files if provided, otherwise use providerOptions.images
        if (standardizedImages && standardizedImages.length > 0) {
          editPayload.images = standardizedImages;
        } else if (runpodOptions?.images) {
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
      // Nano Banana Pro image edit
      // Supported aspect_ratio: "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21"
      // Supported resolution: "1k", "2k", "4k"
      // Supported output_format: "jpeg", "png", "webp"
      const nanoBananaPayload: Record<string, unknown> = {
        prompt,
        aspect_ratio:
          (runpodOptions?.aspect_ratio as string) ?? aspectRatio ?? '1:1',
        resolution: (runpodOptions?.resolution as string) ?? '1k',
        output_format: (runpodOptions?.output_format as string) ?? 'jpeg',
        enable_base64_output:
          (runpodOptions?.enable_base64_output as boolean) ?? false,
        enable_sync_mode:
          (runpodOptions?.enable_sync_mode as boolean) ?? false,
      };

      // Use standardized files if provided, otherwise use providerOptions.images
      if (standardizedImages && standardizedImages.length > 0) {
        nanoBananaPayload.images = standardizedImages;
      } else if (runpodOptions?.images) {
        nanoBananaPayload.images = runpodOptions.images;
      }

      return nanoBananaPayload;
    }

    // Check if this is a Qwen Image Edit 2511 model (uses images array format)
    const isQwenImageEdit2511 = this.modelId.includes('qwen-image-edit-2511');
    if (isQwenImageEdit2511) {
      // Qwen Image Edit 2511 uses images array, output_format, and sync options
      const qwenEdit2511Payload: Record<string, unknown> = {
        prompt,
        size: runpodSize,
        seed: seed ?? -1,
        output_format: (runpodOptions?.output_format as string) ?? 'jpeg',
        enable_base64_output:
          (runpodOptions?.enable_base64_output as boolean) ?? false,
        enable_sync_mode:
          (runpodOptions?.enable_sync_mode as boolean) ?? false,
        ...runpodOptions,
      };

      // Always use images array format for this model
      if (standardizedImages && standardizedImages.length > 0) {
        qwenEdit2511Payload.images = standardizedImages;
      } else if (runpodOptions?.images) {
        qwenEdit2511Payload.images = runpodOptions.images;
      }

      return qwenEdit2511Payload;
    }

    // Check if this is an Alibaba Wan model
    const isWanModel = this.modelId.includes('wan-2');
    if (isWanModel) {
      // Alibaba Wan 2.6 uses standard t2i format with negative prompt in prompt string
      return {
        prompt,
        size: runpodSize,
        seed: seed ?? -1,
        enable_safety_checker: runpodOptions?.enable_safety_checker ?? true,
        ...runpodOptions,
      };
    }

    // Default format for Qwen and other models
    const defaultPayload: Record<string, unknown> = {
      prompt,
      negative_prompt: runpodOptions?.negative_prompt ?? '',
      size: runpodSize,
      seed: seed ?? -1,
      enable_safety_checker: runpodOptions?.enable_safety_checker ?? true,
      ...runpodOptions,
    };

    // For edit models, use standardized files if provided
    if (standardizedImages && standardizedImages.length > 0) {
      // Single image models use 'image', multi-image models use 'images'
      if (standardizedImages.length === 1) {
        defaultPayload.image = standardizedImages[0];
      } else {
        defaultPayload.images = standardizedImages;
      }
    }

    return defaultPayload;
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
