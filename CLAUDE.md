# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run all tests (node + edge)
pnpm test

# Run only node tests
pnpm test:node

# Run only edge tests
pnpm test:edge

# Run tests in watch mode
pnpm test:watch

# Run a single test file
pnpm vitest --config vitest.node.config.js --run src/runpod-image-model.test.ts

# Lint
pnpm lint

# Type check
pnpm type-check

# Format check
pnpm prettier-check

# Create a changeset for versioning
pnpm changeset
```

## Architecture

This is an AI SDK provider for Runpod that enables language models, image generation, and speech synthesis through Runpod's API endpoints.

### Provider Structure

The provider (`src/runpod-provider.ts`) is a factory function that creates model instances:

- **Language models**: Delegate to `@ai-sdk/openai-compatible` classes (`OpenAICompatibleChatLanguageModel`, `OpenAICompatibleCompletionLanguageModel`)
- **Image models**: Custom `RunpodImageModel` class with extensive model-specific validation and parameter handling
- **Speech models**: Custom `RunpodSpeechModel` class for text-to-speech

### Endpoint Mapping

Models are mapped to Runpod endpoints via hardcoded mappings (`MODEL_ID_TO_ENDPOINT_URL`, `IMAGE_MODEL_ID_TO_ENDPOINT_URL`, `SPEECH_MODEL_ID_TO_ENDPOINT_URL`). Unknown models derive endpoints by replacing slashes with hyphens (e.g., `vendor/model` → `vendor-model`).

### Image Model Complexity

`RunpodImageModel` (`src/runpod-image-model.ts`) contains significant model-specific logic:
- **WAN 2.6**: Pixel count validation (589,824–1,638,400 pixels), aspect ratio constraints (1:4 to 4:1)
- **Pruna models**: Custom aspect_ratio format, skip standard validation
- **Flux Kontext**: Different parameter format than regular Flux models
- **Nano Banana Pro**: Resolution options (1k, 2k, 4k)
- **Qwen Edit 2511**: LoRA endpoint switching based on provider options

### Key Patterns

- Provider function is callable directly: `runpod(modelId)` returns a chat model
- Methods attached to provider: `runpod.image()`, `runpod.speech()`, `runpod.chatModel()`, etc.
- Custom `runpodFetch` wrapper injects `stream_options` for streaming requests
- Image generation uses async polling (`/run` then `/status/{jobId}`) or sync (`/runsync`)

### Test Files

Tests use Vitest with mocked dependencies:
- `runpod-provider.test.ts`: Provider instantiation and config propagation
- `runpod-image-model.test.ts`: Size/aspect ratio validation, model-specific payloads
- `runpod-speech-model.test.ts`: Request construction and audio URL extraction

## Conventions

### Branding

Always use "Runpod" (capital R, lowercase unpod). Never use "RunPod", "RUNPOD", or "run-pod".

### Documentation Sync

**README.md** and the AI SDK community docs (`ai/content/providers/03-community-providers/22-runpod.mdx`) must stay in sync. Any changes to examples, features, or capabilities must be updated in both files.

### Version Management

Use Changesets for all releases. Never manually edit version numbers or CHANGELOG.md. Create changesets with `pnpm changeset` for any user-facing changes.

### Model ID Flexibility

Accept any model ID as a string. Use hardcoded mappings only as endpoint presets for known models. Automatically derive endpoints for unknown models. Invalid models fail at API call time, not at provider creation time.

### API Key

Load from `RUNPOD_API_KEY` environment variable. Allow override via provider options.

## Code Style

- Single quotes, semicolons, 2-space indentation
- Unused variables prefixed with `_` are allowed
- `@typescript-eslint/no-explicit-any` is a warning (not error)
