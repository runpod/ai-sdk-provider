import {
  JSONValue,
  Experimental_VideoModelV3 as VideoModelV3,
  Experimental_VideoModelV3CallOptions as VideoModelV3CallOptions,
  Experimental_VideoModelV3File as VideoModelV3File,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  withoutTrailingSlash,
  createJsonResponseHandler,
  getFromApi,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { runpodVideoFailedResponseHandler } from './runpod-error';

export interface RunpodVideoModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Schema for the job submission response
const runpodVideoJobResponseSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
});

// Schema for the status polling response
const runpodVideoStatusSchema = z.object({
  id: z.string().optional(),
  status: z.string(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export class RunpodVideoModel implements VideoModelV3 {
  readonly specificationVersion = 'v3';
  readonly maxVideosPerCall = 1;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: string,
    private readonly config: RunpodVideoModelConfig
  ) {}

  private getRunpodRunUrl(): string {
    const baseURL =
      withoutTrailingSlash(this.config.baseURL) ?? this.config.baseURL;

    if (baseURL.endsWith('/run') || baseURL.endsWith('/runsync')) {
      return baseURL;
    }

    return `${baseURL}/run`;
  }

  async doGenerate(
    options: VideoModelV3CallOptions
  ): Promise<Awaited<ReturnType<VideoModelV3['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    const warnings: SharedV3Warning[] = [];

    if (options.n > 1) {
      warnings.push({
        type: 'unsupported',
        feature: 'n > 1',
        details:
          'Runpod video models only support generating 1 video per call. Only 1 video will be generated.',
      });
    }

    const { providerOptions, abortSignal, headers } = options;

    const runpodOptions = this.extractRunpodOptions(providerOptions);

    const input = this.buildInputPayload(options, runpodOptions);

    const requestBody = { input };
    const url = this.getRunpodRunUrl();
    const effectiveBaseURL =
      withoutTrailingSlash(this.config.baseURL) ?? this.config.baseURL;

    // Submit the job
    const { value: response, responseHeaders } = await postJsonToApi({
      url,
      headers: {
        ...this.config.headers(),
        ...headers,
      },
      body: requestBody,
      failedResponseHandler: runpodVideoFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        runpodVideoJobResponseSchema as any
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    const typedResponse = response as z.infer<
      typeof runpodVideoJobResponseSchema
    >;

    const jobId = typedResponse.id;
    if (!jobId) {
      throw new Error('Runpod video response did not include a job id.');
    }

    // Poll for completion
    const pollOptions = {
      maxAttempts: (runpodOptions.maxPollAttempts as number | undefined) ?? 120,
      pollIntervalMillis:
        (runpodOptions.pollIntervalMillis as number | undefined) ?? 5000,
    };

    const result = await this.pollForCompletion(
      jobId,
      abortSignal,
      pollOptions,
      effectiveBaseURL
    );

    const videoUrl = this.extractVideoUrl(result.output);

    const providerMetadata: Record<string, Record<string, JSONValue>> = {
      runpod: {
        jobId,
      },
    };

    return {
      videos: [{ type: 'url', url: videoUrl, mediaType: 'video/mp4' }],
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
      providerMetadata,
    };
  }

  private buildInputPayload(
    options: VideoModelV3CallOptions,
    runpodOptions: Record<string, unknown>
  ): Record<string, unknown> {
    // Filter out polling options — they should not be sent to the API
    const apiOptions = Object.fromEntries(
      Object.entries(runpodOptions).filter(
        ([key]) => key !== 'maxPollAttempts' && key !== 'pollIntervalMillis'
      )
    );

    const input: Record<string, unknown> = {
      ...apiOptions,
    };

    if (options.prompt) {
      input.prompt = options.prompt;
    }

    if (options.duration !== undefined) {
      input.duration = options.duration;
    }

    if (options.fps !== undefined) {
      input.fps = options.fps;
    }

    if (options.seed !== undefined) {
      input.seed = options.seed;
    }

    // Convert resolution from WxH (e.g. "1280x720") to size with * (e.g. "1280*720")
    if (options.resolution) {
      input.size = options.resolution.replace('x', '*');
    } else if (options.aspectRatio) {
      input.aspect_ratio = options.aspectRatio;
    }

    if (options.image) {
      input.image = this.convertFileToRunpodFormat(options.image);
    }

    return input;
  }

  private convertFileToRunpodFormat(file: VideoModelV3File): string {
    if (file.type === 'url') {
      return file.url;
    }

    // file.type === 'file' — convert to base64 data URL
    const mediaType = file.mediaType;
    const data = file.data;

    if (typeof data === 'string') {
      // Already base64 — wrap in data URL
      return `data:${mediaType};base64,${data}`;
    }

    // Uint8Array — encode to base64 data URL
    const base64 = this.uint8ArrayToBase64(data);
    return `data:${mediaType};base64,${base64}`;
  }

  private uint8ArrayToBase64(data: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(data).toString('base64');
    }
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  private extractRunpodOptions(
    providerOptions: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    if (!providerOptions) return {};
    const runpod = providerOptions.runpod;
    if (isRecord(runpod)) {
      return runpod;
    }
    return {};
  }

  private extractVideoUrl(output: unknown): string {
    if (isRecord(output)) {
      // Check common output field names
      if (typeof output.video_url === 'string') return output.video_url;
      if (typeof output.result === 'string') return output.result;
      if (typeof output.url === 'string') return output.url;
    }

    // If output is a string URL directly
    if (typeof output === 'string') {
      return output;
    }

    throw new Error(
      `Runpod video generation completed but no video URL was found in the output: ${JSON.stringify(output)}`
    );
  }

  private async pollForCompletion(
    jobId: string,
    abortSignal?: AbortSignal,
    pollOptions?: { maxAttempts?: number; pollIntervalMillis?: number },
    effectiveBaseURL?: string
  ): Promise<z.infer<typeof runpodVideoStatusSchema>> {
    const maxAttempts = pollOptions?.maxAttempts ?? 120;
    const pollInterval = pollOptions?.pollIntervalMillis ?? 5000;
    const baseURL = effectiveBaseURL ?? this.config.baseURL;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Video generation was aborted');
      }

      const { value: statusResponse } = await getFromApi({
        url: `${baseURL}/status/${jobId}`,
        headers: this.config.headers(),
        successfulResponseHandler: createJsonResponseHandler(
          runpodVideoStatusSchema as any
        ),
        failedResponseHandler: runpodVideoFailedResponseHandler,
        abortSignal,
        fetch: this.config.fetch,
      });

      const typedStatusResponse = statusResponse as z.infer<
        typeof runpodVideoStatusSchema
      >;

      if (typedStatusResponse.status === 'COMPLETED') {
        return typedStatusResponse;
      }

      if (typedStatusResponse.status === 'FAILED') {
        throw new Error(
          `Video generation failed: ${typedStatusResponse.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Video generation timed out after ${maxAttempts} attempts (${(maxAttempts * pollInterval) / 1000}s)`
    );
  }
}
