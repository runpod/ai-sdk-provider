# @runpod/ai-sdk-provider

## 0.12.0

### Minor Changes

- dcc2cc5: Add support for speech generation with `resembleai/chatterbox-turbo` model:
  - `speechModel()` and `speech()` methods for text-to-speech
  - Voice cloning via URL (5-10 seconds of audio)
  - 20 built-in voices

### Patch Changes

- ace58c2: Add comprehensive documentation for Pruna and Nano Banana Pro models, including all supported aspect ratios, resolutions, and output formats. Update examples to use standard AI SDK options where possible.

## 0.11.1

### Patch Changes

- f6115ac: Fix Pruna and Nano Banana Pro model support for all aspect ratios:

  Pruna models:
  - Skip standard size/aspectRatio validation
  - Support all t2i aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, custom
  - Support all edit aspect ratios: match_input_image, 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3
  - Support custom width/height for t2i (256-1440, must be multiple of 16)
  - Support 1-5 images for edit

  Nano Banana Pro model:
  - Skip standard size/aspectRatio validation
  - Support all aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9, 9:21
  - Support resolution: 1k, 2k, 4k
  - Support output_format: jpeg, png, webp

## 0.11.0

### Minor Changes

- b8cb204: Add support for Pruna and Nano Banana Pro image models:
  - `pruna/p-image-t2i` - Pruna text-to-image generation
  - `pruna/p-image-edit` - Pruna image editing
  - `google/nano-banana-pro-edit` - Nano Banana Pro image editing (Gemini-powered)

  These models support flexible aspect ratios and additional provider options like `aspect_ratio`, `resolution`, `enable_sync_mode`, and `enable_base64_output`.

## 0.10.0

### Minor Changes

- 3ca13ef: Add support for deepcogito/cogito-671b-v2.1-fp8 model. Users can now use either `deepcogito/cogito-671b-v2.1-fp8` (lowercase) or `deepcogito/cogito-671b-v2.1-FP8` (uppercase) - both will work correctly. The model supports text generation, streaming, object generation, and tool calling.

## 0.9.0

### Minor Changes

- 77439af: Add support for `openai/gpt-oss-120b` model. Users can now use this 120B parameter open-source GPT model for text generation and tool calling. The model supports streaming and tool usage.

## 0.8.1

### Patch Changes

- 9514d33: Improve error message extraction from Runpod API responses. Users now see actual error messages from the API instead of generic fallbacks like "Unknown error". The error handler extracts nested JSON messages from image API errors and properly surfaces all error details.

## 0.8.0

### Minor Changes

- 2394ad6: Accept any model ID string and automatically derive endpoints for unknown models instead of throwing validation errors. Known models use hardcoded endpoint mappings. Added support for IBM Granite models.

### Patch Changes

- 9520f2a: chore: removed deep-cogito

## 0.7.0

### Minor Changes

- a9ffb1d: feat: added bytedance/seedream-4.0 & bytedance/seedream-4.0-edit

## 0.6.0

### Minor Changes

- bec4dfe: feat: added "qwen/qwen-image-edit"

## 0.5.1

### Patch Changes

- 1d60f42: docs: llms don't support object generation

## 0.5.0

### Minor Changes

- a93a4ec: feat: added streamText

## 0.4.1

### Patch Changes

- d7dc293: docs: fix tool calling example

## 0.4.0

### Minor Changes

- 0d8d20a: - chore: updated dependencies to latest version
  - docs: improvements
  - fix: actually use the provided baseURL

## 0.3.3

### Patch Changes

- 7adbc33: docs: moved everything into "about Runpod"

## 0.3.2

### Patch Changes

- 012cb6f: docs: moved "get api key on console" into "apiKey"

## 0.3.1

### Patch Changes

- 179e006: docs: improve intro and outro

## 0.3.0

### Minor Changes

- ef53393: use consistent brandname "Runpod"

## 0.2.1

### Patch Changes

- eb1b7f8: improved docs

## 0.2.0

### Minor Changes

- 1fec4a8: added support for image gen:
  - `qwen/qwen-image`
  - `bytedance/seedream-3.0`
  - `black-forest-labs/flux-1-kontext-dev`
  - `black-forest-labs/flux-1-schnell`
  - `black-forest-labs/flux-1-dev`

## 0.1.1

### Patch Changes

- 3c90c0e: simplified the docs

## 0.1.0

### Minor Changes

- 4fa63d7: first release of the Runpod provider for the AI SDK
  - generateText for llms
    - qwen/qwen3-32b-awq
