/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
} from '@ai-sdk/openai-compatible';
import { RunpodImageModel } from './runpod-image-model';
import { loadApiKey } from '@ai-sdk/provider-utils';
import { createRunpod } from './runpod-provider';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Add type assertion for the mocked class
const OpenAICompatibleChatLanguageModelMock =
  OpenAICompatibleChatLanguageModel as unknown as Mock;

vi.mock('@ai-sdk/openai-compatible', () => ({
  OpenAICompatibleChatLanguageModel: vi.fn(),
  OpenAICompatibleCompletionLanguageModel: vi.fn(),
}));

vi.mock('./runpod-image-model', () => ({
  RunpodImageModel: vi.fn(),
}));

vi.mock('@ai-sdk/provider-utils', () => ({
  loadApiKey: vi.fn().mockReturnValue('mock-api-key'),
  withoutTrailingSlash: vi.fn((url) => url),
}));

describe('RunpodProvider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('createRunpod', () => {
    it('should create a RunpodProvider instance with default options', () => {
      const provider = createRunpod();
      provider('qwen/qwen3-32b-awq');

      // Use the mocked version
      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const config = constructorCall[1];
      config.headers();

      expect(loadApiKey).toHaveBeenCalledWith({
        apiKey: undefined,
        environmentVariableName: 'RUNPOD_API_KEY',
        description: 'Runpod',
      });
    });

    it('should create a RunpodProvider instance with custom options', () => {
      const options = {
        apiKey: 'custom-key',
        headers: { 'Custom-Header': 'value' },
      };
      const provider = createRunpod(options);
      provider('qwen/qwen3-32b-awq');

      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const config = constructorCall[1];
      config.headers();

      expect(loadApiKey).toHaveBeenCalledWith({
        apiKey: 'custom-key',
        environmentVariableName: 'RUNPOD_API_KEY',
        description: 'Runpod',
      });
    });

    it('should return a chat model when called as a function', () => {
      const provider = createRunpod();
      const modelId = 'qwen/qwen3-32b-awq';

      const model = provider(modelId);
      expect(model).toBeInstanceOf(OpenAICompatibleChatLanguageModel);
    });

    it('should accept any model ID and derive endpoint for unknown models', () => {
      const provider = createRunpod();

      const model = provider('my-custom/model-name');
      expect(model).toBeInstanceOf(OpenAICompatibleChatLanguageModel);

      const constructorCall =
        OpenAICompatibleChatLanguageModelMock.mock.calls[0];
      const config = constructorCall[1];

      // Verify endpoint is derived by replacing / with -
      expect(config.url({ path: '/chat/completions' })).toBe(
        'https://api.runpod.ai/v2/my-custom-model-name/openai/v1/chat/completions'
      );
    });
  });

  describe('chatModel', () => {
    it('should construct a chat model with correct configuration', () => {
      const provider = createRunpod();
      const modelId = 'qwen/qwen3-32b-awq';

      const model = provider.chatModel(modelId);

      expect(model).toBeInstanceOf(OpenAICompatibleChatLanguageModel);
    });
  });

  describe('completionModel', () => {
    it('should construct a completion model with correct configuration', () => {
      const provider = createRunpod();
      const modelId = 'qwen/qwen3-32b-awq';

      const model = provider.completionModel(modelId);

      expect(model).toBeInstanceOf(OpenAICompatibleCompletionLanguageModel);
    });
  });

  describe('imageModel', () => {
    it('should construct an image model with correct configuration', () => {
      const provider = createRunpod();
      const modelId = 'qwen/qwen-image';

      const model = provider.imageModel(modelId);

      expect(model).toBeInstanceOf(RunpodImageModel);
    });

    it('should accept any image model ID and derive endpoint for unknown models', () => {
      const provider = createRunpod();

      const model =      provider.imageModel('my-custom/image-model' as any);
      expect(model).toBeInstanceOf(RunpodImageModel);

      // Verify the model was created with derived endpoint
      expect(      (RunpodImageModel as any).mock.calls[0][1].baseURL).toBe(
        'https://api.runpod.ai/v2/my-custom-image-model/openai/v1'
      );
    });
  });

  describe('model endpoint mapping', () => {
    it('should use correct endpoint URL for qwen model', () => {
      const provider = createRunpod();
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
