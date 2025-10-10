import { LanguageModelV2, ImageModelV2 } from '@ai-sdk/provider';
import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
} from '@ai-sdk/openai-compatible';
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { RunpodChatModelId } from './runpod-chat-options';
import { RunpodCompletionModelId } from './runpod-completion-options';
import { RunpodImageModelId } from './runpod-image-options';
import { RunpodImageModel } from './runpod-image-model';

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
  (modelId: RunpodChatModelId): LanguageModelV2;

  /**
Creates a chat model for text generation.
*/
  chatModel(modelId: RunpodChatModelId): LanguageModelV2;

  /**
Creates a chat model for text generation.
*/
  languageModel(modelId: RunpodChatModelId): LanguageModelV2;

  /**
Creates a completion model for text generation.
*/
  completionModel(modelId: RunpodCompletionModelId): LanguageModelV2;

  /**
Creates an image model for image generation.
*/
  imageModel(modelId: RunpodImageModelId): ImageModelV2;
}

// Mapping of Runpod model IDs to their endpoint URLs
const MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'deep-cogito/deep-cogito-v2-llama-70b':
    'https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/openai/v1',
  'qwen/qwen3-32b-awq': 'https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1',
};

// Mapping of Runpod image model IDs to their endpoint URLs
const IMAGE_MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'qwen/qwen-image': 'https://api.runpod.ai/v2/qwen-image-t2i',
  'qwen/qwen-image-edit': 'https://api.runpod.ai/v2/qwen-image-edit',
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
  // Nano Banana (edit only)
  'nano-banana-edit': 'https://api.runpod.ai/v2/nano-banana-edit',
};

// Mapping of Runpod model IDs to their OpenAI model names
const MODEL_ID_TO_OPENAI_NAME: Record<string, string> = {
  'deep-cogito/deep-cogito-v2-llama-70b':
    'deepcogito/cogito-v2-preview-llama-70B',
  'qwen/qwen3-32b-awq': 'Qwen/Qwen3-32B-AWQ',
};

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
      baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId];
      if (!baseURL) {
        throw new Error(
          `Unsupported Runpod model: ${modelId}. Supported models: ${Object.keys(
            MODEL_ID_TO_ENDPOINT_URL
          ).join(', ')}. Or provide a custom baseURL.`
        );
      }
    }

    return {
      provider: `runpod.${modelType}`,
      url: ({ path }) => `${withoutTrailingSlash(baseURL)}${path}`,
      headers: getHeaders,
      fetch: runpodFetch,
    };
  };

  const createChatModel = (modelId: RunpodChatModelId) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleChatLanguageModel(openaiModelName, {
      ...getModelConfig(modelId, 'chat'),
      includeUsage: true,
    });
  };

  const createCompletionModel = (modelId: RunpodCompletionModelId) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleCompletionLanguageModel(openaiModelName, {
      ...getModelConfig(modelId, 'completion'),
      includeUsage: true,
    });
  };

  const createImageModel = (modelId: RunpodImageModelId) => {
    let baseURL: string;

    if (options.baseURL) {
      baseURL = options.baseURL;
    } else {
      baseURL = IMAGE_MODEL_ID_TO_ENDPOINT_URL[modelId];
      if (!baseURL) {
        throw new Error(
          `Unsupported Runpod image model: ${modelId}. Supported models: ${Object.keys(
            IMAGE_MODEL_ID_TO_ENDPOINT_URL
          ).join(', ')}. Or provide a custom baseURL.`
        );
      }
    }

    return new RunpodImageModel(modelId, {
      provider: 'runpod.image',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const provider = (modelId: RunpodChatModelId) => createChatModel(modelId);

  provider.completionModel = createCompletionModel;
  provider.languageModel = createChatModel;
  provider.chatModel = createChatModel;
  provider.imageModel = createImageModel;

  return provider;
}

export const runpod = createRunpod();
