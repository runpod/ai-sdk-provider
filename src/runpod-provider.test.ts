import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
} from '@ai-sdk/openai-compatible';
import { loadApiKey } from '@ai-sdk/provider-utils';
import { createRunPod } from './runpod-provider';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Add type assertion for the mocked class
const OpenAICompatibleChatLanguageModelMock =
  OpenAICompatibleChatLanguageModel as unknown as Mock;

vi.mock('@ai-sdk/openai-compatible', () => ({
  OpenAICompatibleChatLanguageModel: vi.fn(),
  OpenAICompatibleCompletionLanguageModel: vi.fn(),
}));

vi.mock('@ai-sdk/provider-utils', () => ({
  loadApiKey: vi.fn().mockReturnValue('mock-api-key'),
  withoutTrailingSlash: vi.fn((url) => url),
}));

describe('RunPodProvider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('createRunPod', () => {
    it('should create a RunPodProvider instance with default options', () => {
      const provider = createRunPod();
      provider('deep-cogito/deep-cogito-v2-llama-70b');

      // Use the mocked version
      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const config = constructorCall[1];
      config.headers();

      expect(loadApiKey).toHaveBeenCalledWith({
        apiKey: undefined,
        environmentVariableName: 'RUNPOD_API_KEY',
        description: 'RunPod',
      });
    });

    it('should create a RunPodProvider instance with custom options', () => {
      const options = {
        apiKey: 'custom-key',
        headers: { 'Custom-Header': 'value' },
      };
      const provider = createRunPod(options);
      provider('deep-cogito/deep-cogito-v2-llama-70b');

      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const config = constructorCall[1];
      config.headers();

      expect(loadApiKey).toHaveBeenCalledWith({
        apiKey: 'custom-key',
        environmentVariableName: 'RUNPOD_API_KEY',
        description: 'RunPod',
      });
    });

    it('should return a chat model when called as a function', () => {
      const provider = createRunPod();
      const modelId = 'deep-cogito/deep-cogito-v2-llama-70b';

      const model = provider(modelId);
      expect(model).toBeInstanceOf(OpenAICompatibleChatLanguageModel);
    });

    it('should throw error for unsupported model', () => {
      const provider = createRunPod();

      expect(() => provider('unsupported-model')).toThrow(
        'Unsupported RunPod model: unsupported-model'
      );
    });
  });

  describe('chatModel', () => {
    it('should construct a chat model with correct configuration', () => {
      const provider = createRunPod();
      const modelId = 'deep-cogito/deep-cogito-v2-llama-70b';

      const model = provider.chatModel(modelId);

      expect(model).toBeInstanceOf(OpenAICompatibleChatLanguageModel);
    });
  });

  describe('completionModel', () => {
    it('should construct a completion model with correct configuration', () => {
      const provider = createRunPod();
      const modelId = 'qwen/qwen3-32b-awq';

      const model = provider.completionModel(modelId);

      expect(model).toBeInstanceOf(OpenAICompatibleCompletionLanguageModel);
    });
  });

  describe('model endpoint mapping', () => {
    it('should use correct endpoint URL for deep-cogito model', () => {
      const provider = createRunPod();
      provider('deep-cogito/deep-cogito-v2-llama-70b');

      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const modelName = constructorCall[0];
      const config = constructorCall[1];

      expect(modelName).toBe('deepcogito/cogito-v2-preview-llama-70B');
      expect(config.url({ path: '/chat/completions' })).toBe(
        'https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/openai/v1/chat/completions'
      );
    });

    it('should use correct endpoint URL for qwen model', () => {
      const provider = createRunPod();
      provider('qwen/qwen3-32b-awq');

      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const modelName = constructorCall[0];
      const config = constructorCall[1];

      expect(modelName).toBe('Qwen/Qwen3-32B-AWQ');
      expect(config.url({ path: '/chat/completions' })).toBe(
        'https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1/chat/completions'
      );
    });
  });
});
