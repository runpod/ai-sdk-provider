# @runpod/ai-sdk-provider

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
