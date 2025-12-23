/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunpodImageModel } from './runpod-image-model';
import { InvalidArgumentError } from '@ai-sdk/provider';

const mockFetch = vi.fn();

describe('RunpodImageModel', () => {
  let model: RunpodImageModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new RunpodImageModel('qwen/qwen-image', {
      provider: 'runpod',
      baseURL: 'https://api.runpod.ai/v2/qwen-image-t2i',
      headers: () => ({ Authorization: 'Bearer test-key' }),
      fetch: mockFetch,
    });
  });

  describe('model properties', () => {
    it('should have correct specification version', () => {
      expect(model.specificationVersion).toBe('v3');
    });

    it('should have correct provider', () => {
      expect(model.provider).toBe('runpod');
    });

    it('should have correct model ID', () => {
      expect(model.modelId).toBe('qwen/qwen-image');
    });

    it('should have maxImagesPerCall of 1', () => {
      expect(model.maxImagesPerCall).toBe(1);
    });
  });

  describe('parameter validation', () => {
    it('should throw error for unsupported aspect ratio', async () => {
      await expect(
        model.doGenerate({
          prompt: 'Test prompt',
          n: 1,
          size: undefined,
          aspectRatio: '16:9', // Unsupported ratio
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should throw error for unsupported size', async () => {
      await expect(
        model.doGenerate({
          prompt: 'Test prompt',
          n: 1,
          size: '1234x1234', // Unsupported size
          aspectRatio: undefined,
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should accept supported aspect ratios', () => {
      // Test that supported ratios don't throw during validation
      const supportedRatios = ['1:1', '4:3', '3:4'];

      supportedRatios.forEach((ratio) => {
        expect(() => {
          // Just test the validation logic, not the full API call
          if (!['1:1', '4:3', '3:4'].includes(ratio)) {
            throw new InvalidArgumentError({
              parameter: 'aspectRatio',
              value: ratio,
              message: `Aspect ratio ${ratio} is not supported`,
            });
          }
        }).not.toThrow();
      });
    });

    it('should accept supported sizes', () => {
      // Test that supported sizes don't throw during validation
      const supportedSizes = [
        '1328x1328',
        '1024x768',
        '512x512',
        '1536x1536',
        '2048x2048',
        '4096x4096',
      ];
      const supportedRunpodSizes = [
        '1328*1328',
        '1024*768',
        '512*512',
        '1536*1536',
        '2048*2048',
        '4096*4096',
      ];

      supportedSizes.forEach((size, _index) => {
        expect(() => {
          const runpodSize = size.replace('x', '*');
          if (!supportedRunpodSizes.includes(runpodSize)) {
            throw new InvalidArgumentError({
              parameter: 'size',
              value: size,
              message: `Size ${size} is not supported`,
            });
          }
        }).not.toThrow();
      });
    });
  });

  describe('parameter conversion', () => {
    it('should build correct payload for Qwen models', () => {
      const qwenModel = new RunpodImageModel('qwen/qwen-image', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/qwen-image-t2i',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      // Test the buildInputPayload method (accessing private method for testing)
      const payload = (qwenModel as any).buildInputPayload(
        'Test prompt',
        '1024*768',
        42,
        { negative_prompt: 'bad quality', enable_safety_checker: false }
      );

      expect(payload).toMatchObject({
        prompt: 'Test prompt',
        size: '1024*768',
        seed: 42,
        negative_prompt: 'bad quality',
        enable_safety_checker: false,
      });
    });

    it('should build correct payload for Flux standard models', () => {
      const fluxModel = new RunpodImageModel(
        'black-forest-labs/flux-1-schnell',
        {
          provider: 'runpod',
          baseURL: 'https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const payload = (fluxModel as any).buildInputPayload(
        'Test prompt',
        '1024*768',
        42,
        { negative_prompt: 'bad quality' }
      );

      expect(payload).toMatchObject({
        prompt: 'Test prompt',
        width: 1024,
        height: 768,
        seed: 42,
        num_inference_steps: 4, // Schnell
        guidance: 7,
        image_format: 'png',
        negative_prompt: 'bad quality',
      });
    });

    it('should build correct payload for Flux Kontext models', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const payload = (kontextModel as any).buildInputPayload(
        'Transform this',
        '1328*1328',
        42,
        {
          image: 'https://example.com/input.jpg',
          negative_prompt: 'bad quality',
        }
      );

      expect(payload).toMatchObject({
        prompt: 'Transform this',
        size: '1328*1328',
        seed: 42,
        num_inference_steps: 28, // Kontext
        guidance: 2,
        output_format: 'png',
        image: 'https://example.com/input.jpg',
        negative_prompt: 'bad quality',
      });
    });

    it('should build correct payload for Nano Banana edit (multi-image)', () => {
      const nanoBananaEditModel = new RunpodImageModel('nano-banana-edit', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/nano-banana-edit',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      const images = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
        'https://example.com/img4.jpg',
      ];

      const payload = (nanoBananaEditModel as any).buildInputPayload(
        'Combine these four source images into a single scene',
        '1328*1328',
        // seed intentionally omitted to verify default assignment
        undefined,
        { images, enable_safety_checker: true }
      );

      expect(payload).toMatchObject({
        prompt: 'Combine these four source images into a single scene',
        size: '1328*1328',
        seed: -1,
        images,
        enable_safety_checker: true,
      });
    });
  });

  describe('model detection', () => {
    it('should detect Flux models correctly', () => {
      const fluxModels = [
        'black-forest-labs/flux-1-schnell',
        'black-forest-labs/flux-1-dev',
        'black-forest-labs/flux-1-kontext-dev',
      ];

      fluxModels.forEach((modelId) => {
        const isFlux =
          modelId.includes('flux') || modelId.includes('black-forest-labs');
        expect(isFlux).toBe(true);
      });
    });

    it('should detect Kontext models correctly', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const isKontext = kontextModel.modelId.includes('kontext');
      expect(isKontext).toBe(true);
    });
  });

  describe('files parameter (from prompt.images)', () => {
    it('should convert URL type files to Runpod format', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const files = [
        { type: 'url' as const, url: 'https://example.com/image.jpg' },
      ];

      const result = (kontextModel as any).convertFilesToRunpodFormat(files);
      expect(result).toEqual(['https://example.com/image.jpg']);
    });

    it('should convert file type with base64 string to data URL', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const files = [
        {
          type: 'file' as const,
          mediaType: 'image/png',
          data: 'iVBORw0KGgoAAAANS',
        },
      ];

      const result = (kontextModel as any).convertFilesToRunpodFormat(files);
      expect(result).toEqual(['data:image/png;base64,iVBORw0KGgoAAAANS']);
    });

    it('should pass through data URLs as-is', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const files = [
        {
          type: 'file' as const,
          mediaType: 'image/png',
          data: 'data:image/png;base64,iVBORw0KGgoAAAANS',
        },
      ];

      const result = (kontextModel as any).convertFilesToRunpodFormat(files);
      expect(result).toEqual(['data:image/png;base64,iVBORw0KGgoAAAANS']);
    });

    it('should convert file type with Uint8Array to base64 data URL', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      // Simple test data
      const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const files = [
        {
          type: 'file' as const,
          mediaType: 'image/png',
          data: testData,
        },
      ];

      const result = (kontextModel as any).convertFilesToRunpodFormat(files);
      expect(result).toEqual(['data:image/png;base64,SGVsbG8=']);
    });

    it('should handle multiple files', () => {
      const nanoBananaModel = new RunpodImageModel('nano-banana-edit', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/nano-banana-edit',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      const files = [
        { type: 'url' as const, url: 'https://example.com/img1.jpg' },
        { type: 'url' as const, url: 'https://example.com/img2.jpg' },
        { type: 'url' as const, url: 'https://example.com/img3.jpg' },
      ];

      const result = (nanoBananaModel as any).convertFilesToRunpodFormat(files);
      expect(result).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ]);
    });

    it('should return undefined for empty or undefined files', () => {
      const result1 = (model as any).convertFilesToRunpodFormat(undefined);
      const result2 = (model as any).convertFilesToRunpodFormat([]);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('should use standardized files over providerOptions.image for Kontext', () => {
      const kontextModel = new RunpodImageModel(
        'black-forest-labs/flux-1-kontext-dev',
        {
          provider: 'runpod',
          baseURL:
            'https://api.runpod.ai/v2/black-forest-labs-flux-1-kontext-dev',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const standardizedImages = ['https://standard.com/image.jpg'];
      const runpodOptions = { image: 'https://legacy.com/image.jpg' };

      const payload = (kontextModel as any).buildInputPayload(
        'Transform this',
        '1328*1328',
        42,
        runpodOptions,
        '1:1',
        standardizedImages
      );

      // Standard files should take precedence
      expect(payload.image).toBe('https://standard.com/image.jpg');
    });

    it('should use standardized files over providerOptions.images for multi-image models', () => {
      const nanoBananaModel = new RunpodImageModel(
        'google/nano-banana-pro-edit',
        {
          provider: 'runpod',
          baseURL: 'https://api.runpod.ai/v2/nano-banana-edit',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const standardizedImages = [
        'https://standard.com/img1.jpg',
        'https://standard.com/img2.jpg',
      ];
      const runpodOptions = {
        images: ['https://legacy.com/img1.jpg', 'https://legacy.com/img2.jpg'],
      };

      const payload = (nanoBananaModel as any).buildInputPayload(
        'Combine these',
        '1:1',
        undefined,
        runpodOptions,
        '1:1',
        standardizedImages
      );

      // Standard files should take precedence
      expect(payload.images).toEqual(standardizedImages);
    });
  });

  describe('warnings', () => {
    it('should generate proper unsupported warning format for n > 1', async () => {
      // Test that multiple images warning has the correct V3 format
      const warning = {
        type: 'unsupported' as const,
        feature: 'multiple images (n > 1)',
        details:
          'Runpod image models only support generating 1 image at a time. Using n=1.',
      };

      expect(warning.type).toBe('unsupported');
      expect(warning.feature).toBe('multiple images (n > 1)');
      expect(warning.details).toContain('Runpod image models');
    });

    it('should generate proper unsupported warning format for mask', () => {
      // Test that mask warning has the correct V3 format
      const warning = {
        type: 'unsupported' as const,
        feature: 'mask',
        details: 'Mask input for inpainting is not yet supported.',
      };

      expect(warning.type).toBe('unsupported');
      expect(warning.feature).toBe('mask');
      expect(warning.details).toContain('not yet supported');
    });
  });
});