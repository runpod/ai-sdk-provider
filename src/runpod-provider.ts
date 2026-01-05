import { ImageModelV3, LanguageModelV3, SpeechModelV3 } from '@ai-sdk/provider';
import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
} from '@ai-sdk/openai-compatible';
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { RunpodImageModel } from './runpod-image-model';
import { RunpodSpeechModel } from './runpod-speech-model';

export interface RunpodProviderSettings {
  /**
Runpod API key.
*/
  apiKey?: string;
  /**
Custom base URL for Runpod API. Use this to point to custom endpoints or different Runpod deployments.
Example: 'https://api.runpod.ai/v2/your-endpoint-id/openai/v1'
*/
  baseURL?: string;
  /**
Custom headers to include in the requests.
*/
  headers?: Record<string, string>;
  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
*/
  fetch?: FetchFunction;
}

export interface RunpodProvider {
  /**
Creates a model for text generation.
*/
  (modelId: string): LanguageModelV3;

  /**
Creates a chat model for text generation.
*/
  chatModel(modelId: string): LanguageModelV3;

  /**
Creates a chat model for text generation.
*/
  languageModel(modelId: string): LanguageModelV3;

  /**
Creates a completion model for text generation.
*/
  completionModel(modelId: string): LanguageModelV3;

  /**
Creates an image model for image generation.
*/
  imageModel(modelId: string): ImageModelV3;

  /**
Creates an image model for image generation.
*/
  image(modelId: string): ImageModelV3;

  /**
Creates a speech model for speech generation.
*/
  speechModel(modelId: string): SpeechModelV3;

  /**
Creates a speech model for speech generation.
*/
  speech(modelId: string): SpeechModelV3;
}

// Mapping of Runpod model IDs to their endpoint URLs
const MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'qwen/qwen3-32b-awq': 'https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1',
  'ibm-granite/granite-4.0-h-small':
    'https://api.runpod.ai/v2/granite-4-0-h-small/openai/v1',
  'gpt-oss-120b': 'https://api.runpod.ai/v2/gpt-oss-120b/openai/v1',
  'openai/gpt-oss-120b': 'https://api.runpod.ai/v2/gpt-oss-120b/openai/v1',
  'deepcogito/cogito-671b-v2.1-fp8':
    'https://api.runpod.ai/v2/cogito-671b-v2-1-fp8-dynamic/openai/v1',
  'deepcogito/cogito-671b-v2.1-FP8':
    'https://api.runpod.ai/v2/cogito-671b-v2-1-fp8-dynamic/openai/v1',
};

// Mapping of Runpod image model IDs to their endpoint URLs
const IMAGE_MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'qwen/qwen-image': 'https://api.runpod.ai/v2/qwen-image-t2i',
  'qwen/qwen-image-edit': 'https://api.runpod.ai/v2/qwen-image-edit',
  'qwen/qwen-image-edit-2511': 'https://api.runpod.ai/v2/qwen-image-edit-2511',
  'qwen/qwen-image-edit-2511-lora':
    'https://api.runpod.ai/v2/qwen-image-edit-2511-lora',
  'bytedance/seedream-3.0': 'https://api.runpod.ai/v2/seedream-3-0-t2i',
  // Seadream v4 (t2i and edit)
  'bytedance/seedream-4.0': 'https://api.runpod.ai/v2/seedream-v4-t2i',
  'bytedance/seedream-4.0-edit': 'https://api.runpod.ai/v2/seedream-v4-edit',
  'black-forest-labs/flux-1-kontext-dev':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
  'black-forest-labs/flux-1-schnell':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell',
  'black-forest-labs/flux-1-dev':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-dev',
  // Alibaba Wan 2.6 (t2i)
  'alibaba/wan-2.6': 'https://api.runpod.ai/v2/wan-2-6-t2i',
  // Nano Banana (edit only)
  'nano-banana-edit': 'https://api.runpod.ai/v2/nano-banana-edit',
  // Nano Banana Pro (edit only)
  'google/nano-banana-pro-edit':
    'https://api.runpod.ai/v2/nano-banana-pro-edit',
  // Pruna (t2i and edit)
  'pruna/p-image-t2i': 'https://api.runpod.ai/v2/p-image-t2i',
  'pruna/p-image-edit': 'https://api.runpod.ai/v2/p-image-edit',
};

// Mapping of Runpod speech model IDs to their serverless endpoint URLs
// Note: This is intentionally a temporary mapping for a stealth release.
const SPEECH_MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'resembleai/chatterbox-turbo': 'https://api.runpod.ai/v2/chatterbox-turbo/',
};

// Mapping of Runpod model IDs to their OpenAI model names
const MODEL_ID_TO_OPENAI_NAME: Record<string, string> = {
  'qwen/qwen3-32b-awq': 'Qwen/Qwen3-32B-AWQ',
  'deepcogito/cogito-671b-v2.1-fp8': 'deepcogito/cogito-671b-v2.1-FP8',
  'deepcogito/cogito-671b-v2.1-FP8': 'deepcogito/cogito-671b-v2.1-FP8',
};

/**
 * Derives the endpoint URL for a model by replacing slashes with hyphens.
 * Example: 'ibm-granite/granite-4.0-h-small' -> 'https://api.runpod.ai/v2/ibm-granite-granite-4.0-h-small/openai/v1'
 */
function deriveEndpointURL(modelId: string): string {
  const normalized = modelId.replace(/\//g, '-');
  return `https://api.runpod.ai/v2/${normalized}/openai/v1`;
}

function parseRunpodConsoleEndpointId(modelIdOrUrl: string): string | null {
  if (!modelIdOrUrl.startsWith('http')) {
    return null;
  }

  try {
    const url = new URL(modelIdOrUrl);
    if (url.hostname !== 'console.runpod.io') {
      return null;
    }

    // Example:
    // https://console.runpod.io/serverless/user/endpoint/<ENDPOINT_ID>
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.lastIndexOf('endpoint');
    const endpointId = idx !== -1 ? parts[idx + 1] : undefined;

    return endpointId || null;
  } catch {
    return null;
  }
}

export function createRunpod(
  options: RunpodProviderSettings = {}
): RunpodProvider {
  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'RUNPOD_API_KEY',
      description: 'Runpod',
    })}`,
    ...options.headers,
  });

  const runpodFetch: FetchFunction = async (url, requestInit) => {
    if (requestInit?.body) {
      try {
        const body = JSON.parse(requestInit.body as string);
        if (body.stream === true && !body.stream_options) {
          body.stream_options = { include_usage: true };
          requestInit.body = JSON.stringify(body);
        }
      } catch {}
    }
    const fetchFn = options.fetch || fetch;
    return fetchFn(url, requestInit);
  };

  interface CommonModelConfig {
    provider: string;
    url: ({ path }: { path: string }) => string;
    headers: () => Record<string, string>;
    fetch?: FetchFunction;
  }

  const getModelConfig = (
    modelId: string,
    modelType: string
  ): CommonModelConfig => {
    let baseURL: string;

    if (options.baseURL) {
      baseURL = options.baseURL;
    } else {
      // Use hardcoded mapping if available, otherwise derive endpoint
      baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId] || deriveEndpointURL(modelId);
    }

    return {
      provider: `runpod.${modelType}`,
      url: ({ path }) => `${withoutTrailingSlash(baseURL)}${path}`,
      headers: getHeaders,
      fetch: runpodFetch,
    };
  };

  const createChatModel = (modelId: string) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleChatLanguageModel(openaiModelName, {
      ...getModelConfig(modelId, 'chat'),
      includeUsage: true,
    });
  };

  const createCompletionModel = (modelId: string) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleCompletionLanguageModel(openaiModelName, {
      ...getModelConfig(modelId, 'completion'),
      includeUsage: true,
    });
  };

  const createImageModel = (modelId: string) => {
    let baseURL: string;

    if (options.baseURL) {
      baseURL = options.baseURL;
    } else {
      // Use hardcoded mapping if available, otherwise derive endpoint
      baseURL =
        IMAGE_MODEL_ID_TO_ENDPOINT_URL[modelId] || deriveEndpointURL(modelId);
    }

    return new RunpodImageModel(modelId, {
      provider: 'runpod.image',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const createSpeechModel = (modelId: string) => {
    const endpointIdFromConsole = parseRunpodConsoleEndpointId(modelId);
    const normalizedModelId = endpointIdFromConsole ?? modelId;

    // Prefer explicit mapping for known speech model IDs.
    const mappedBaseURL = SPEECH_MODEL_ID_TO_ENDPOINT_URL[normalizedModelId];

    const baseURL =
      mappedBaseURL ??
      (normalizedModelId.startsWith('http')
        ? normalizedModelId
        : `https://api.runpod.ai/v2/${normalizedModelId}`);

    return new RunpodSpeechModel(normalizedModelId, {
      provider: 'runpod.speech',
      baseURL,
      headers: getHeaders,
      fetch: runpodFetch,
    });
  };

  const provider = (modelId: string) => createChatModel(modelId);

  provider.completionModel = createCompletionModel;
  provider.languageModel = createChatModel;
  provider.chatModel = createChatModel;
  provider.imageModel = createImageModel;
  provider.image = createImageModel;
  provider.speechModel = createSpeechModel;
  provider.speech = createSpeechModel;

  return provider;
}

export const runpod = createRunpod();
