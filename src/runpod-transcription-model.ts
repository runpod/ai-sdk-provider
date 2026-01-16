import {
  JSONValue,
  TranscriptionModelV3,
  TranscriptionModelV3CallOptions,
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
import { runpodTranscriptionFailedResponseHandler } from './runpod-error';

export interface RunpodTranscriptionModelConfig {
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
const runpodJobResponseSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
});

// Schema for the status polling response
// Note: RunPod Whisper may return 'result' or 'text' depending on the worker version
const runpodStatusResponseSchema = z.object({
  id: z.string().optional(),
  status: z.string(),
  output: z
    .object({
      text: z.string().optional(),
      result: z.string().optional(), // Some workers use 'result' instead of 'text'
      segments: z
        .array(
          z.object({
            text: z.string().optional(),
            start: z.number().optional(),
            end: z.number().optional(),
          })
        )
        .optional(),
      language: z.string().optional(),
      duration: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export class RunpodTranscriptionModel implements TranscriptionModelV3 {
  readonly specificationVersion = 'v3';

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: string,
    private readonly config: RunpodTranscriptionModelConfig
  ) {}

  private getRunpodRunUrl(): string {
    const baseURL =
      withoutTrailingSlash(this.config.baseURL) ?? this.config.baseURL;

    // Allow users to pass /run or /runsync directly.
    if (baseURL.endsWith('/run') || baseURL.endsWith('/runsync')) {
      return baseURL;
    }

    // Use /run for async jobs (Whisper can take time)
    return `${baseURL}/run`;
  }

  async doGenerate(
    options: TranscriptionModelV3CallOptions
  ): Promise<Awaited<ReturnType<TranscriptionModelV3['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    const warnings: SharedV3Warning[] = [];

    const { audio, mediaType, providerOptions, abortSignal, headers } = options;

    // Extract Runpod-specific options
    const runpodOptions = this.extractRunpodOptions(providerOptions);

    // Build input - RunPod Whisper accepts either 'audio' (URL) or 'audio_base64' (base64 string)
    const input: Record<string, unknown> = {};

    // Check if user provided an audio URL directly via providerOptions
    if (runpodOptions.audio && typeof runpodOptions.audio === 'string') {
      input.audio = runpodOptions.audio;
    } else {
      // Convert the AI SDK audio input to base64 for RunPod
      const base64Audio = this.convertAudioToBase64(audio);
      input.audio_base64 = base64Audio;
    }

    // Add optional parameters
    if (runpodOptions.prompt || runpodOptions.initial_prompt) {
      input.initial_prompt = runpodOptions.prompt ?? runpodOptions.initial_prompt;
    }
    if (runpodOptions.language) {
      input.language = runpodOptions.language;
    }
    if (runpodOptions.word_timestamps !== undefined) {
      input.word_timestamps = runpodOptions.word_timestamps;
    }
    // Pass through other Whisper-specific options
    if (runpodOptions.model) {
      input.model = runpodOptions.model;
    }
    if (runpodOptions.transcription) {
      input.transcription = runpodOptions.transcription;
    }
    if (runpodOptions.translate !== undefined) {
      input.translate = runpodOptions.translate;
    }
    if (runpodOptions.enable_vad !== undefined) {
      input.enable_vad = runpodOptions.enable_vad;
    }

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
      failedResponseHandler: runpodTranscriptionFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        runpodJobResponseSchema as any
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    const typedResponse = response as z.infer<typeof runpodJobResponseSchema>;

    // Get job ID for polling
    const jobId = typedResponse.id;
    if (!jobId) {
      throw new Error(
        'Runpod transcription response did not include a job id.'
      );
    }

    // Poll for completion
    const pollOptions = {
      maxAttempts: (runpodOptions.maxPollAttempts as number | undefined) ?? 120,
      pollIntervalMillis: (runpodOptions.pollIntervalMillis as number | undefined) ?? 2000,
    };

    const result = await this.pollForCompletion(
      jobId,
      abortSignal,
      pollOptions,
      effectiveBaseURL
    );

    // Parse the transcription output
    // Note: RunPod Whisper may return 'result' or 'text' depending on the worker version
    const output = result.output;
    const text = output?.text ?? output?.result ?? '';
    const segments = this.parseSegments(output);
    const language = output?.language;
    const durationInSeconds = output?.duration;

    const providerMetadata: Record<string, Record<string, JSONValue>> = {
      runpod: {
        jobId,
      },
    };

    return {
      text,
      segments,
      language,
      durationInSeconds,
      warnings,
      request: {
        body: JSON.stringify(requestBody),
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: JSON.stringify(result),
      },
      providerMetadata,
    };
  }

  private convertAudioToBase64(
    audio: TranscriptionModelV3CallOptions['audio']
  ): string {
    if (typeof audio === 'string') {
      // Already base64 encoded
      return audio;
    }

    // Convert Uint8Array to base64
    return this.uint8ArrayToBase64(audio);
  }

  private uint8ArrayToBase64(data: Uint8Array): string {
    // Use Buffer in Node.js environment for efficiency
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(data).toString('base64');
    }
    // Fallback for browser environment
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

  private async pollForCompletion(
    jobId: string,
    abortSignal?: AbortSignal,
    pollOptions?: { maxAttempts?: number; pollIntervalMillis?: number },
    effectiveBaseURL?: string
  ): Promise<z.infer<typeof runpodStatusResponseSchema>> {
    const maxAttempts = pollOptions?.maxAttempts ?? 120;
    const pollInterval = pollOptions?.pollIntervalMillis ?? 2000;
    const baseURL = effectiveBaseURL ?? this.config.baseURL;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Transcription was aborted');
      }

      const { value: statusResponse } = await getFromApi({
        url: `${baseURL}/status/${jobId}`,
        headers: this.config.headers(),
        successfulResponseHandler: createJsonResponseHandler(
          runpodStatusResponseSchema as any
        ),
        failedResponseHandler: runpodTranscriptionFailedResponseHandler,
        abortSignal,
        fetch: this.config.fetch,
      });

      const typedStatusResponse =
        statusResponse as z.infer<typeof runpodStatusResponseSchema>;

      if (typedStatusResponse.status === 'COMPLETED') {
        return typedStatusResponse;
      }

      if (typedStatusResponse.status === 'FAILED') {
        throw new Error(
          `Transcription failed: ${typedStatusResponse.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Transcription timed out after ${maxAttempts} attempts (${(maxAttempts * pollInterval) / 1000}s)`
    );
  }

  private parseSegments(
    output: z.infer<typeof runpodStatusResponseSchema>['output']
  ): Array<{ text: string; startSecond: number; endSecond: number }> {
    if (!output?.segments || !Array.isArray(output.segments)) {
      return [];
    }

    return output.segments.map((segment) => ({
      text: segment.text ?? '',
      startSecond: segment.start ?? 0,
      endSecond: segment.end ?? 0,
    }));
  }
}
