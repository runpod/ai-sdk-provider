import { VideoModelV2, VideoModelV2CallWarning } from '@ai-sdk/provider';
import {
  combineHeaders,
  createBinaryResponseHandler,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  getFromApi,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import type { RunpodVideoModelId } from './runpod-video-options';

interface RunpodVideoModelConfig {
  provider: string;
  baseURL: string; // e.g., https://api.runpod.ai/v2/<endpoint>
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
  _internal?: { currentDate?: () => Date };
}

export class RunpodVideoModel implements VideoModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly maxVideosPerCall = 1 as const;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: RunpodVideoModelId,
    private config: RunpodVideoModelConfig
  ) {}

  async doGenerate({
    prompt,
    n = 1,
    resolution,
    aspectRatio,
    durationSeconds,
    fps,
    seed,
    providerOptions,
    headers,
    abortSignal,
  }: Parameters<VideoModelV2['doGenerate']>[0]): Promise<
    Awaited<ReturnType<VideoModelV2['doGenerate']>>
  > {
    const warnings: Array<VideoModelV2CallWarning> = [];

    if (n > 1) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'n',
        details:
          'Runpod video models currently support generating 1 video at a time. Using n=1.',
      });
    }

    const sizeParams = this.normalizeSize({ resolution, aspectRatio });
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    const { value: response, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/runsync`,
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        input: {
          prompt,
          ...(sizeParams && sizeParams),
          ...(durationSeconds != null && { duration: durationSeconds }),
          ...(fps != null && { fps }),
          ...(seed != null && { seed }),
          ...(providerOptions.runpod ?? {}),
        },
      },
      failedResponseHandler: createJsonErrorResponseHandler({
        errorSchema: runpodVideoErrorSchema,
        errorToMessage: (data) => (data as any).error ?? 'Unknown error',
      }),
      successfulResponseHandler: createJsonResponseHandler(
        runpodVideoResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    const typed = response as z.infer<typeof runpodVideoResponseSchema>;

    if (
      typed.status === 'COMPLETED' &&
      (typed.output?.video_url || typed.output?.result)
    ) {
      const videoUrl =
        typed.output.video_url ?? (typed.output.result as string);
      const videoBytes = await this.downloadFile(videoUrl, abortSignal);
      return {
        videos: [videoBytes],
        warnings,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders,
        },
        providerMetadata: {
          runpod: { videos: [{ url: videoUrl, cost: typed.output?.cost }] },
        },
      };
    }

    if (typed.status === 'IN_QUEUE' || typed.status === 'IN_PROGRESS') {
      const jobId = typed.id;
      const videoUrl = await this.pollForCompletion(jobId, abortSignal, {
        maxAttempts:
          (providerOptions.runpod?.maxPollAttempts as number) ?? undefined,
        pollIntervalMillis:
          (providerOptions.runpod?.pollIntervalMillis as number) ?? undefined,
      });
      const videoBytes = await this.downloadFile(videoUrl, abortSignal);
      return {
        videos: [videoBytes],
        warnings,
        response: {
          timestamp: currentDate,
          modelId: this.modelId,
          headers: responseHeaders,
        },
        providerMetadata: { runpod: { videos: [{ url: videoUrl, jobId }] } },
      };
    }

    throw new Error(`Unexpected response status: ${typed.status}`);
  }

  private normalizeSize({
    resolution,
    aspectRatio,
  }: {
    resolution?: `${number}x${number}`;
    aspectRatio?: `${number}:${number}`;
  }): { width: number; height: number } | undefined {
    if (resolution) {
      const [w, h] = resolution.split('x').map(Number);
      return { width: w, height: h };
    }
    if (aspectRatio) {
      const [w, h] = aspectRatio.split(':').map(Number);
      // choose a reasonable default height, e.g., 576, and compute width
      const base = 576;
      const width = Math.round((w / h) * base);
      return { width, height: base };
    }
    return undefined;
  }

  private async downloadFile(
    url: string,
    abortSignal?: AbortSignal
  ): Promise<Uint8Array> {
    const { value } = await getFromApi({
      url,
      successfulResponseHandler: createBinaryResponseHandler(),
      failedResponseHandler: createJsonErrorResponseHandler({
        errorSchema: runpodVideoErrorSchema,
        errorToMessage: (data: any) => data.error ?? 'Failed to download video',
      }),
      abortSignal,
      fetch: this.config.fetch,
    });
    return value;
  }

  private async pollForCompletion(
    jobId: string,
    abortSignal?: AbortSignal,
    pollOptions?: { maxAttempts?: number; pollIntervalMillis?: number }
  ): Promise<string> {
    const maxAttempts = pollOptions?.maxAttempts ?? 60;
    const pollInterval = pollOptions?.pollIntervalMillis ?? 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Video generation was aborted');
      }

      const { value: status } = await getFromApi({
        url: `${this.config.baseURL}/status/${jobId}`,
        headers: this.config.headers(),
        successfulResponseHandler: createJsonResponseHandler(
          runpodVideoStatusSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: runpodVideoErrorSchema,
          errorToMessage: (data: any) =>
            data.error ?? 'Failed to check job status',
        }),
        abortSignal,
        fetch: this.config.fetch,
      });

      if (
        status.status === 'COMPLETED' &&
        (status.output?.video_url || status.output?.result)
      ) {
        return (status.output.video_url ??
          (status.output.result as string)) as string;
      }
      if (status.status === 'FAILED') {
        throw new Error(
          `Video generation failed: ${status.error || 'Unknown error'}`
        );
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new Error('Video generation timed out');
  }
}

// Schemas (mirroring image flow but with video fields)
const runpodVideoResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['COMPLETED', 'IN_QUEUE', 'IN_PROGRESS', 'FAILED']),
  output: z
    .object({
      cost: z.number().optional(),
      result: z.string().optional(), // video URL (some endpoints)
      video_url: z.string().optional(), // video URL (other endpoints)
    })
    .optional(),
});

const runpodVideoStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['COMPLETED', 'IN_QUEUE', 'IN_PROGRESS', 'FAILED']),
  output: z
    .object({
      cost: z.number().optional(),
      result: z.string().optional(),
      video_url: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

const runpodVideoErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
