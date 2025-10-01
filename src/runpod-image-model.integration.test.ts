import { describe, it, expect } from 'vitest';
import { createRunpod } from './runpod-provider';
import type { RunpodImageModelId } from './runpod-image-options';

// Integration tests against real Runpod endpoints.
// These tests will be skipped unless RUNPOD_API_KEY is present.

const hasApiKey = !!process.env.RUNPOD_API_KEY;
const maybe = hasApiKey ? describe : describe.skip;

// Helper to convert a remote URL to a data URL for base64 scenarios
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buf = new Uint8Array(await res.arrayBuffer());
  const base64 = Buffer.from(buf).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

const ALL_MODELS: RunpodImageModelId[] = [
  'qwen/qwen-image',
  'qwen/qwen-image-edit',
  'bytedance/seedream-3.0',
  'bytedance/seedream-4.0',
  'bytedance/seedream-4.0-edit',
  'black-forest-labs/flux-1-kontext-dev',
  'black-forest-labs/flux-1-schnell',
  'black-forest-labs/flux-1-dev',
];

const sampleUrls = [
  'https://image.runpod.ai/uploads/WiTaxr1AYF/2c15cbc9-9b03-4d59-bd60-ff3fa024b145.jpg',
  'https://image.runpod.ai/uploads/z6CJphVJ3K/5917c2ca-cfca-45b8-be37-9b47f0269d85.jpg',
];

maybe('RunpodImageModel (integration - all models)', () => {
  const runpod = createRunpod();

  for (const modelId of ALL_MODELS) {
    const titlePrefix = `${modelId}`;

    it(`${titlePrefix}: single image via URL`, async () => {
      const model = runpod.imageModel(modelId);
      const providerOptions: any = {
        runpod: {},
      };

      // Kontext uses single 'image', most others use 'images'
      if (modelId.includes('kontext')) {
        providerOptions.runpod.image = sampleUrls[0];
      } else {
        providerOptions.runpod.images = [sampleUrls[0]];
        // enable safety checker where applicable
        providerOptions.runpod.enable_safety_checker = true;
      }

      const result = await model.doGenerate({
        prompt: 'Integration test image generation',
        n: 1,
        size: modelId.includes('kontext') ? '1328x1328' : '1024x1024',
        aspectRatio: undefined,
        seed: 42,
        providerOptions,
        headers: {},
        abortSignal: undefined,
      });

      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images[0]).toBeInstanceOf(Uint8Array);
      expect((result.images[0] as Uint8Array).length).toBeGreaterThan(0);
    }, 240_000);

    it(`${titlePrefix}: single image via base64`, async () => {
      const model = runpod.imageModel(modelId);
      const b64 = await urlToDataUrl(sampleUrls[0]);
      const providerOptions: any = {
        runpod: {},
      };
      if (modelId.includes('kontext')) {
        providerOptions.runpod.image = b64;
      } else {
        providerOptions.runpod.images = [b64];
        providerOptions.runpod.enable_safety_checker = true;
      }

      const result = await model.doGenerate({
        prompt: 'Integration test image generation',
        n: 1,
        size: modelId.includes('kontext') ? '1328x1328' : '1024x1024',
        aspectRatio: undefined,
        seed: 43,
        providerOptions,
        headers: {},
        abortSignal: undefined,
      });

      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images[0]).toBeInstanceOf(Uint8Array);
      expect((result.images[0] as Uint8Array).length).toBeGreaterThan(0);
    }, 240_000);

    it(`${titlePrefix}: multiple images via URLs`, async () => {
      const model = runpod.imageModel(modelId);
      const providerOptions: any = {
        runpod: {},
      };
      if (modelId.includes('kontext')) {
        // Kontext is single-image; test still with one image
        providerOptions.runpod.image = sampleUrls[0];
      } else {
        providerOptions.runpod.images = sampleUrls;
        providerOptions.runpod.enable_safety_checker = true;
      }

      const result = await model.doGenerate({
        prompt: 'Integration test image generation',
        n: 1,
        size: modelId.includes('kontext') ? '1328x1328' : '1024x1024',
        aspectRatio: undefined,
        seed: 44,
        providerOptions,
        headers: {},
        abortSignal: undefined,
      });

      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images[0]).toBeInstanceOf(Uint8Array);
      expect((result.images[0] as Uint8Array).length).toBeGreaterThan(0);
    }, 300_000);

    it(`${titlePrefix}: multiple images via base64`, async () => {
      const model = runpod.imageModel(modelId);
      const b64s = await Promise.all(sampleUrls.map(urlToDataUrl));
      const providerOptions: any = {
        runpod: {},
      };
      if (modelId.includes('kontext')) {
        // Kontext is single-image; use first only
        providerOptions.runpod.image = b64s[0];
      } else {
        providerOptions.runpod.images = b64s;
        providerOptions.runpod.enable_safety_checker = true;
      }

      const result = await model.doGenerate({
        prompt: 'Integration test image generation',
        n: 1,
        size: modelId.includes('kontext') ? '1328x1328' : '1024x1024',
        aspectRatio: undefined,
        seed: 45,
        providerOptions,
        headers: {},
        abortSignal: undefined,
      });

      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images[0]).toBeInstanceOf(Uint8Array);
      expect((result.images[0] as Uint8Array).length).toBeGreaterThan(0);
    }, 300_000);
  }
});
