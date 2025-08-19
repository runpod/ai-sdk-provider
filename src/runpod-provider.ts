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
import { RunPodChatModelId } from './runpod-chat-options';
import { RunPodCompletionModelId } from './runpod-completion-options';
import { RunpodImageModelId } from './runpod-image-options';
import { RunpodImageModel } from './runpod-image-model';

export interface RunPodProviderSettings {
  /**
RunPod API key.
*/
  apiKey?: string;
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

export interface RunPodProvider {
  /**
Creates a model for text generation.
*/
  (modelId: RunPodChatModelId): LanguageModelV2;

  /**
Creates a chat model for text generation.
*/
  chatModel(modelId: RunPodChatModelId): LanguageModelV2;

  /**
Creates a chat model for text generation.
*/
  languageModel(modelId: RunPodChatModelId): LanguageModelV2;

  /**
Creates a completion model for text generation.
*/
  completionModel(modelId: RunPodCompletionModelId): LanguageModelV2;

  /**
Creates an image model for image generation.
*/
  imageModel(modelId: RunpodImageModelId): ImageModelV2;
}

// Mapping of RunPod model IDs to their endpoint URLs
const MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'deep-cogito/deep-cogito-v2-llama-70b':
    'https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/openai/v1',
  'qwen/qwen3-32b-awq': 'https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1',
};

// Mapping of RunPod image model IDs to their endpoint URLs
const IMAGE_MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'qwen/qwen-image': 'https://api.runpod.ai/v2/qwen-image-t2i',
  'bytedance/seedream-3.0': 'https://api.runpod.ai/v2/seedream-3-0-t2i',
  'black-forest-labs/flux-1-kontext-dev':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
  'black-forest-labs/flux-1-schnell':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell',
  'black-forest-labs/flux-1-dev':
    'https://api.runpod.ai/v2/black-forest-labs-flux-1-dev',
};

// Mapping of RunPod model IDs to their OpenAI model names
const MODEL_ID_TO_OPENAI_NAME: Record<string, string> = {
  'deep-cogito/deep-cogito-v2-llama-70b':
    'deepcogito/cogito-v2-preview-llama-70B',
  'qwen/qwen3-32b-awq': 'Qwen/Qwen3-32B-AWQ',
};

export function createRunPod(
  options: RunPodProviderSettings = {}
): RunPodProvider {
  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'RUNPOD_API_KEY',
      description: 'RunPod',
    })}`,
    ...options.headers,
  });

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
    const baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId];
    if (!baseURL) {
      throw new Error(
        `Unsupported RunPod model: ${modelId}. Supported models: ${Object.keys(
          MODEL_ID_TO_ENDPOINT_URL
        ).join(', ')}`
      );
    }

    return {
      provider: `runpod.${modelType}`,
      url: ({ path }) => `${withoutTrailingSlash(baseURL)}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    };
  };

  const createChatModel = (modelId: RunPodChatModelId) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleChatLanguageModel(
      openaiModelName,
      getModelConfig(modelId, 'chat')
    );
  };

  const createCompletionModel = (modelId: RunPodCompletionModelId) => {
    const openaiModelName = MODEL_ID_TO_OPENAI_NAME[modelId] || modelId;
    return new OpenAICompatibleCompletionLanguageModel(
      openaiModelName,
      getModelConfig(modelId, 'completion')
    );
  };

  const createImageModel = (modelId: RunpodImageModelId) => {
    const baseURL = IMAGE_MODEL_ID_TO_ENDPOINT_URL[modelId];
    if (!baseURL) {
      throw new Error(
        `Unsupported Runpod image model: ${modelId}. Supported models: ${Object.keys(
          IMAGE_MODEL_ID_TO_ENDPOINT_URL
        ).join(', ')}`
      );
    }

    return new RunpodImageModel(modelId, {
      provider: 'runpod.image',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });
  };

  const provider = (modelId: RunPodChatModelId) => createChatModel(modelId);

  provider.completionModel = createCompletionModel;
  provider.languageModel = createChatModel;
  provider.chatModel = createChatModel;
  provider.imageModel = createImageModel;

  return provider;
}

export const runpod = createRunPod();
