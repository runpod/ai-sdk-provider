# Runpod Image Models

This document lists supported Runpod image models and their capabilities. Follow the provider usage patterns from the main `README.md`.

## Models and Capabilities

| Model ID                               | Description                     | Supported Aspect Ratios               |
| -------------------------------------- | ------------------------------- | ------------------------------------- |
| `bytedance/seedream-3.0`               | Advanced text-to-image model    | 1:1, 4:3, 3:4                         |
| `bytedance/seedream-4.0`               | Text-to-image (v4)              | 1:1 (supports 1024, 2048, 4096)       |
| `bytedance/seedream-4.0-edit`          | Image editing (v4, multi-image) | 1:1 (supports 1024, 1536, 2048, 4096) |
| `black-forest-labs/flux-1-schnell`     | Fast image generation (4 steps) | 1:1, 4:3, 3:4                         |
| `black-forest-labs/flux-1-dev`         | High-quality image generation   | 1:1, 4:3, 3:4                         |
| `black-forest-labs/flux-1-kontext-dev` | Context-aware image generation  | 1:1, 4:3, 3:4                         |
| `qwen/qwen-image`                      | Text-to-image generation        | 1:1, 4:3, 3:4                         |
| `qwen/qwen-image-edit`                 | Image editing (prompt-guided)   | 1:1, 4:3, 3:4                         |
| `nano-banana-edit`                     | Image editing (multi-image)     | 1:1, 4:3, 3:4                         |

## Multi-image Editing Example (Nano Banana)

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { experimental_generateImage as generateImage } from 'ai';

const { image } = await generateImage({
  model: runpod.imageModel('nano-banana-edit'),
  prompt:
    'Combine these four source images into a single realistic 3D character figure scene. Render with realistic materials and proportions.',
  providerOptions: {
    runpod: {
      images: [
        'https://image.runpod.ai/uploads/0bz_xzhuLq/a2166199-5bd5-496b-b9ab-a8bae3f73bdc.jpg',
        'https://image.runpod.ai/uploads/Yw86rhY6xi/2ff8435f-f416-4096-9a4d-2f8c838b2d53.jpg',
        'https://image.runpod.ai/uploads/bpCCX9zLY8/3bc27605-6f9a-40ad-83e9-c29bed45fed9.jpg',
        'https://image.runpod.ai/uploads/LPHEY6pyHp/f950ceb8-fafa-4800-bdf1-fd3fd684d843.jpg',
      ],
      enable_safety_checker: true,
    },
  },
});
```

## Provider Options

| Option                  | Type       | Default | Description                                                              |
| ----------------------- | ---------- | ------- | ------------------------------------------------------------------------ |
| `negative_prompt`       | `string`   | `""`    | Text describing what you don't want in the image                         |
| `enable_safety_checker` | `boolean`  | `true`  | Enable content safety filtering                                          |
| `image`                 | `string`   | -       | Single input image: URL or base64 data URI (Flux Kontext)                |
| `images`                | `string[]` | -       | Multiple input images (e.g., for `nano-banana-edit` multi-image editing) |
| `num_inference_steps`   | `number`   | Auto    | Number of denoising steps (Flux: 4 for schnell, 28 for others)           |
| `guidance`              | `number`   | Auto    | Guidance scale for prompt adherence (Flux: 7 for schnell, 2 for others)  |
| `output_format`         | `string`   | `"png"` | Output image format ("png" or "jpg")                                     |
| `maxPollAttempts`       | `number`   | `60`    | Maximum polling attempts for async generation                            |
| `pollIntervalMillis`    | `number`   | `5000`  | Polling interval in milliseconds (5 seconds)                             |
