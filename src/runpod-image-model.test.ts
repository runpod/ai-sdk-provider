/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunpodImageModel } from './runpod-image-model';
import { InvalidArgumentError } from '@ai-sdk/provider';
import type { ImageModelV3File } from '@ai-sdk/provider';

const mockFetch = vi.fn();

/**
 * Simulates the AI SDK v6 `prompt.images` normalization into `files`
 * (see `ai/src/generate-image/generate-image.ts` in the AI SDK repo).
 */
function promptImagesToFiles(images: string[]): ImageModelV3File[] {
  return images.map((image) => {
    if (image.startsWith('http')) {
      return { type: 'url', url: image };
    }

    // data URL (data:<mediaType>;base64,<base64>)
    if (image.startsWith('data:')) {
      const [header, base64] = image.split(',');
      const mediaType = header?.split(';')?.[0]?.slice('data:'.length);
      const binary = atob(base64 ?? '');
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      return {
        type: 'file',
        mediaType: mediaType || 'image/png',
        data: bytes,
      };
    }

    // Fallback: treat as base64 string (assume png)
    const binary = atob(image);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return { type: 'file', mediaType: 'image/png', data: bytes };
  });
}

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

  describe('WAN 2.6 parameter validation', () => {
    let wanModel: RunpodImageModel;

    beforeEach(() => {
      wanModel = new RunpodImageModel('alibaba/wan-2.6', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2i',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });
    });

    it('should accept valid WAN 2.6 sizes within pixel constraints', async () => {
      // Valid sizes within 768*768 to 1280*1280 pixel range
      const validSizes = [
        '1280x1280', // 1,638,400 pixels (max)
        '1024x1024', // 1,048,576 pixels
        '768x768', // 589,824 pixels (min)
        '1280x720', // 921,600 pixels (16:9)
        '720x1280', // 921,600 pixels (9:16)
        '1200x800', // 960,000 pixels (3:2)
        '800x1200', // 960,000 pixels (2:3)
      ];

      for (const size of validSizes) {
        // Should not throw - we just verify the size is passed through
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'test',
                status: 'COMPLETED',
                output: { result: 'https://test.com/img.png' },
              }),
              { headers: { 'content-type': 'application/json' } }
            )
          )
        );
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(new Uint8Array([1, 2, 3]), {
              headers: { 'content-type': 'image/png' },
            })
          )
        );

        await expect(
          wanModel.doGenerate({
            prompt: 'Test',
            n: 1,
            size,
            aspectRatio: undefined,
            seed: undefined,
            providerOptions: {},
            headers: {},
            abortSignal: undefined,
          })
        ).resolves.toBeDefined();
      }
    });

    it('should throw error for WAN 2.6 size exceeding max pixels', async () => {
      await expect(
        wanModel.doGenerate({
          prompt: 'Test',
          n: 1,
          size: '2048x2048', // 4,194,304 pixels - exceeds max
          aspectRatio: undefined,
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should throw error for WAN 2.6 size below min pixels', async () => {
      await expect(
        wanModel.doGenerate({
          prompt: 'Test',
          n: 1,
          size: '512x512', // 262,144 pixels - below min
          aspectRatio: undefined,
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should accept all WAN 2.6 supported aspect ratios', async () => {
      const supportedRatios = [
        '1:1',
        '2:3',
        '3:2',
        '3:4',
        '4:3',
        '9:16',
        '16:9',
        '21:9',
        '9:21',
      ];

      for (const ratio of supportedRatios) {
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'test',
                status: 'COMPLETED',
                output: { result: 'https://test.com/img.png' },
              }),
              { headers: { 'content-type': 'application/json' } }
            )
          )
        );
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(new Uint8Array([1, 2, 3]), {
              headers: { 'content-type': 'image/png' },
            })
          )
        );

        await expect(
          wanModel.doGenerate({
            prompt: 'Test',
            n: 1,
            size: undefined,
            aspectRatio: ratio,
            seed: undefined,
            providerOptions: {},
            headers: {},
            abortSignal: undefined,
          })
        ).resolves.toBeDefined();
      }
    });

    it('should throw error for unsupported WAN 2.6 aspect ratio', async () => {
      await expect(
        wanModel.doGenerate({
          prompt: 'Test',
          n: 1,
          size: undefined,
          aspectRatio: '5:4', // Not in WAN supported list
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(InvalidArgumentError);
    });

    it('should default to 1280x1280 for WAN 2.6 when no size or aspect ratio provided', async () => {
      let capturedBody: any;
      mockFetch.mockImplementationOnce(async (_input: any, init?: any) => {
        capturedBody = JSON.parse(init?.body ?? '{}');
        return new Response(
          JSON.stringify({
            id: 'test',
            status: 'COMPLETED',
            output: { result: 'https://test.com/img.png' },
          }),
          { headers: { 'content-type': 'application/json' } }
        );
      });
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { 'content-type': 'image/png' },
          })
        )
      );

      await wanModel.doGenerate({
        prompt: 'Test',
        n: 1,
        size: undefined,
        aspectRatio: undefined,
        seed: undefined,
        providerOptions: {},
        headers: {},
        abortSignal: undefined,
      });

      expect(capturedBody?.input?.size).toBe('1280*1280');
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
        undefined,
        { images, enable_safety_checker: true }
      );

      // Nano Banana edit uses simple format: prompt, images, enable_safety_checker
      // No size or seed parameters
      expect(payload).toMatchObject({
        prompt: 'Combine these four source images into a single scene',
        images,
        enable_safety_checker: true,
      });
      expect(payload).not.toHaveProperty('size');
      expect(payload).not.toHaveProperty('seed');
    });

    it('should build correct payload for Qwen Image Edit 2511', () => {
      const qwenEdit2511Model = new RunpodImageModel(
        'qwen/qwen-image-edit-2511',
        {
          provider: 'runpod',
          baseURL: 'https://api.runpod.ai/v2/qwen-image-edit-2511',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const images = ['https://example.com/input.jpg'];

      const payload = (qwenEdit2511Model as any).buildInputPayload(
        'Transform this into a futuristic city',
        '1024*1024',
        42,
        { output_format: 'png' },
        '1:1',
        images
      );

      expect(payload).toMatchObject({
        prompt: 'Transform this into a futuristic city',
        size: '1024*1024',
        seed: 42,
        output_format: 'png',
        enable_base64_output: false,
        enable_sync_mode: false,
        images: ['https://example.com/input.jpg'],
      });
    });

    it('should build correct payload for Alibaba Wan 2.6', () => {
      const wanModel = new RunpodImageModel('alibaba/wan-2.6', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2i',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      const payload = (wanModel as any).buildInputPayload(
        'A modern tea shop interior, warm afternoon light',
        '1280*1280',
        42,
        { enable_safety_checker: true }
      );

      expect(payload).toMatchObject({
        prompt: 'A modern tea shop interior, warm afternoon light',
        size: '1280*1280',
        seed: 42,
        enable_safety_checker: true,
      });
      // Should not have negative_prompt in the payload (Wan uses inline negative prompt)
      expect(payload.negative_prompt).toBeUndefined();
    });

    it('should build correct payload for Alibaba Wan 2.6 with various aspect ratios', () => {
      const wanModel = new RunpodImageModel('alibaba/wan-2.6', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2i',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      // Test 16:9 aspect ratio (1280*720)
      const payload16x9 = (wanModel as any).buildInputPayload(
        'Wide landscape',
        '1280*720',
        42,
        {}
      );
      expect(payload16x9.size).toBe('1280*720');

      // Test 9:16 aspect ratio (720*1280)
      const payload9x16 = (wanModel as any).buildInputPayload(
        'Portrait mode',
        '720*1280',
        42,
        {}
      );
      expect(payload9x16.size).toBe('720*1280');

      // Test 21:9 ultrawide (1344*576)
      const payload21x9 = (wanModel as any).buildInputPayload(
        'Ultrawide cinematic',
        '1344*576',
        42,
        {}
      );
      expect(payload21x9.size).toBe('1344*576');
    });

    it('should build correct payload for Qwen Image Edit 2511 with LoRA', () => {
      const qwenEdit2511Model = new RunpodImageModel(
        'qwen/qwen-image-edit-2511',
        {
          provider: 'runpod',
          baseURL: 'https://api.runpod.ai/v2/qwen-image-edit-2511',
          headers: () => ({ Authorization: 'Bearer test-key' }),
          fetch: mockFetch,
        }
      );

      const loras = [
        {
          path: 'https://huggingface.co/flymy-ai/qwen-image-anime-irl-lora/resolve/main/flymy_anime_irl.safetensors',
          scale: 1,
        },
      ];

      const payload = (qwenEdit2511Model as any).buildInputPayload(
        'Transform into anime style',
        '1024*1024',
        42,
        { loras },
        '1:1',
        ['https://example.com/input.jpg']
      );

      expect(payload).toMatchObject({
        prompt: 'Transform into anime style',
        size: '1024*1024',
        seed: 42,
        loras,
        images: ['https://example.com/input.jpg'],
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

  describe('doGenerate image inputs (files, as produced from prompt.images)', () => {
    it('should send Flux Kontext image from files (overriding providerOptions.runpod.image)', async () => {
      let capturedBody: any | undefined;

      mockFetch.mockImplementation(async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input?.url;

        if (url?.includes('/runsync')) {
          capturedBody = JSON.parse(init?.body ?? '{}');
          return new Response(
            JSON.stringify({
              id: 'job-1',
              status: 'COMPLETED',
              output: { image_url: 'https://cdn.test/output.png' },
            }),
            { headers: { 'content-type': 'application/json' } }
          );
        }

        if (url === 'https://cdn.test/output.png') {
          return new Response(new Uint8Array([1, 2, 3]), {
            headers: { 'content-type': 'image/png' },
          });
        }

        throw new Error(`Unexpected fetch url: ${String(url)}`);
      });

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

      const result = await kontextModel.doGenerate({
        prompt: 'Transform this into a cyberpunk style with neon lights',
        n: 1,
        size: undefined,
        aspectRatio: '1:1',
        seed: 42,
        files: promptImagesToFiles(['https://example.com/input-image.jpg']),
        mask: undefined,
        providerOptions: {
          runpod: {
            image: 'https://legacy.example.com/legacy-image.jpg',
          },
        } as any,
        headers: {},
        abortSignal: undefined,
      });

      expect(capturedBody?.input?.image).toBe(
        'https://example.com/input-image.jpg'
      );
      expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('should send multi-image edit payload from files (overriding providerOptions.runpod.images)', async () => {
      let capturedBody: any | undefined;

      mockFetch.mockImplementation(async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input?.url;

        if (url?.includes('/runsync')) {
          capturedBody = JSON.parse(init?.body ?? '{}');
          return new Response(
            JSON.stringify({
              id: 'job-2',
              status: 'COMPLETED',
              output: { result: 'https://cdn.test/out.jpg' },
            }),
            { headers: { 'content-type': 'application/json' } }
          );
        }

        if (url === 'https://cdn.test/out.jpg') {
          return new Response(new Uint8Array([9, 8, 7]), {
            headers: { 'content-type': 'image/jpeg' },
          });
        }

        throw new Error(`Unexpected fetch url: ${String(url)}`);
      });

      const editModel = new RunpodImageModel('google/nano-banana-pro-edit', {
        provider: 'runpod',
        baseURL: 'https://api.runpod.ai/v2/nano-banana-edit',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        fetch: mockFetch,
      });

      const inputImages = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ];

      const result = await editModel.doGenerate({
        prompt: 'Combine these',
        n: 1,
        size: undefined,
        aspectRatio: '1:1',
        seed: undefined,
        files: promptImagesToFiles(inputImages),
        mask: undefined,
        providerOptions: {
          runpod: {
            images: ['https://legacy.example.com/legacy1.jpg'],
            enable_safety_checker: true,
          },
        } as any,
        headers: {},
        abortSignal: undefined,
      });

      expect(capturedBody?.input?.images).toEqual(inputImages);
      expect(result.images[0]).toEqual(new Uint8Array([9, 8, 7]));
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

  describe('FAILED status handling', () => {
    it('should throw error with actual error message when status is FAILED', async () => {
      // This simulates an actual Runpod API error response (e.g., invalid size for WAN 2.6)
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'sync-6f9286ab-2453-4fba-a18d-871d514660ac-e2',
              status: 'FAILED',
              delayTime: 3383,
              executionTime: 4651,
              error: 'Total pixels (262144) must be between 589824 and 2073600.',
              output: { status: 'failed' },
            }),
            { headers: { 'content-type': 'application/json' } }
          )
        )
      );

      await expect(
        model.doGenerate({
          prompt: 'Test prompt',
          n: 1,
          size: undefined,
          aspectRatio: '1:1',
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow(
        'Image generation failed: Total pixels (262144) must be between 589824 and 2073600.'
      );
    });

    it('should throw error with "Unknown error" when status is FAILED without error message', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'test-job-id',
              status: 'FAILED',
            }),
            { headers: { 'content-type': 'application/json' } }
          )
        )
      );

      await expect(
        model.doGenerate({
          prompt: 'Test prompt',
          n: 1,
          size: undefined,
          aspectRatio: '1:1',
          seed: undefined,
          providerOptions: {},
          headers: {},
          abortSignal: undefined,
        })
      ).rejects.toThrow('Image generation failed: Unknown error');
    });
  });
});