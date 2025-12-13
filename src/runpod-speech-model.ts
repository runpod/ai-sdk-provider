import {
  JSONValue,
  SpeechModelV2,
  SpeechModelV2CallWarning,
} from '@ai-sdk/provider';
import { FetchFunction, withoutTrailingSlash } from '@ai-sdk/provider-utils';

export interface RunpodSpeechModelConfig {
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

function replaceNewlinesWithSpaces(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

export class RunpodSpeechModel implements SpeechModelV2 {
  readonly specificationVersion = 'v2';

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: string,
    private readonly config: RunpodSpeechModelConfig
  ) {}

  private getRunpodRunSyncUrl(): string {
    const baseURL = withoutTrailingSlash(this.config.baseURL);

    // Allow users to pass /run or /runsync directly.
    if (baseURL.endsWith('/run') || baseURL.endsWith('/runsync')) {
      return baseURL;
    }

    return `${baseURL}/runsync`;
  }

  async doGenerate(
    options: Parameters<SpeechModelV2['doGenerate']>[0]
  ): Promise<Awaited<ReturnType<SpeechModelV2['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();

    const warnings: SpeechModelV2CallWarning[] = [];

    const {
      text,
      voice,
      outputFormat,
      instructions,
      speed,
      language,
      providerOptions,
      abortSignal,
      headers,
    } = options;

    // This endpoint currently returns wav. Warn and ignore other formats.
    if (outputFormat != null && outputFormat !== 'wav') {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'outputFormat',
        details: `Unsupported outputFormat: ${outputFormat}. This endpoint returns 'wav'.`,
      });
    }

    if (instructions != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'instructions',
        details: `Instructions are not supported by this speech endpoint.`,
      });
    }

    if (speed != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'speed',
        details: `Speed is not supported by this speech endpoint.`,
      });
    }

    if (language != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'language',
        details: `Language selection is not supported by this speech endpoint.`,
      });
    }

    const runpodProviderOptions = isRecord(providerOptions)
      ? (providerOptions as any).runpod
      : undefined;

    const voiceUrl =
      isRecord(runpodProviderOptions) &&
      (typeof runpodProviderOptions.voice_url === 'string' ||
        typeof runpodProviderOptions.voiceUrl === 'string')
        ? (runpodProviderOptions.voice_url ??
            runpodProviderOptions.voiceUrl ??
            undefined)
        : undefined;

    const input: Record<string, unknown> = {
      prompt: replaceNewlinesWithSpaces(text),
    };

    // The endpoint supports either a built-in voice name or a voice_url prompt.
    if (voiceUrl) {
      input.voice_url = voiceUrl;
    } else if (voice) {
      input.voice = voice;
    }

    const requestBody = { input };
    const url = this.getRunpodRunSyncUrl();

    const fetchFn = this.config.fetch ?? fetch;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers(),
    };

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (value != null) {
          requestHeaders[key] = value;
        }
      }
    }

    const response = await fetchFn(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const rawBodyText = await response.text();

    let parsed: any = undefined;
    try {
      parsed = rawBodyText ? JSON.parse(rawBodyText) : undefined;
    } catch {
      // ignore - we'll surface the raw body in the error below
    }

    if (!response.ok) {
      const message =
        (parsed && typeof parsed.error === 'string' && parsed.error) ||
        rawBodyText ||
        `HTTP ${response.status}`;
      throw new Error(`Runpod speech request failed: ${message}`);
    }

    const output = parsed?.output ?? parsed;

    const audioUrl = output?.audio_url;
    if (typeof audioUrl !== 'string' || audioUrl.length === 0) {
      throw new Error('Runpod speech response did not include an audio_url.');
    }

    const audioResponse = await fetchFn(audioUrl, { signal: abortSignal });
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to download generated audio (${audioResponse.status}).`
      );
    }

    const audio = new Uint8Array(await audioResponse.arrayBuffer());

    const providerMetadata: Record<string, Record<string, JSONValue>> = {
      runpod: {
        audioUrl,
        ...(typeof output?.cost === 'number' ? { cost: output.cost } : {}),
      },
    };

    return {
      audio,
      warnings,
      request: {
        body: JSON.stringify(requestBody),
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders as any,
        body: rawBodyText,
      },
      providerMetadata,
    };
  }
}
