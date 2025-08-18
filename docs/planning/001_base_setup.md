# User Story 001: Base Setup for RunPod AI SDK Provider

## Overview

Create a RunPod provider for the AI SDK that enables developers to use RunPod's public endpoints seamlessly with the Vercel AI SDK, following the same patterns as other providers in the ecosystem.

## User Story

**As a developer**, I want to use RunPod's AI models through a dedicated AI SDK provider so that I can integrate RunPod's language models into my applications using the same familiar AI SDK interface that I use with other providers.

## Acceptance Criteria

### 1. Provider Setup and Structure

- [ ] Copy the TogetherAI provider structure from `ai/packages/togetherai` as baseline
- [ ] Adapt the structure to work with RunPod's API endpoints
- [ ] Create `@runpod/ai-sdk-provider` package with proper npm package structure
- [ ] Configure TypeScript build system matching AI SDK patterns
- [ ] Set up testing infrastructure (unit tests, edge tests, node tests)

### 2. Core Provider Implementation

- [ ] Create `RunPodProvider` interface extending `ProviderV2`
- [ ] Implement `createRunPod()` function with configuration options:
  - `apiKey` (required, with `RUNPOD_API_KEY` environment variable fallback)
  - `baseURL` (optional, defaults to RunPod public endpoint base)
  - `headers` (optional, for custom headers)
  - `fetch` (optional, for custom fetch implementation)
- [ ] Support for language model creation with RunPod model IDs

### 3. RunPod API Integration

- [ ] Configure base URLs for RunPod public endpoints:
  - Deep Cognito v2 70B: `https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/`
  - Qwen3 32B AWQ: `https://api.runpod.ai/v2/qwen3-32b-awq/`
- [ ] Implement authentication using Bearer token with `RUNPOD_API_KEY`
- [ ] Handle RunPod-specific API request/response format
- [ ] Map RunPod models to standardized model IDs:
  - `deep-cogito/deep-cogito-v2-llama-70b`
  - `qwen/qwen3-32b-awq`

### 4. OpenAI Compatibility Layer

- [ ] Leverage existing `@ai-sdk/openai-compatible` utilities (RunPod LLM endpoints are fully OpenAI API compatible)
- [ ] Use `OpenAICompatibleChatLanguageModel` directly for chat models
- [ ] Handle RunPod-specific model naming and endpoint routing
- [ ] All OpenAI API features are supported: streaming, function calling, structured outputs, etc.

### 5. TypeScript Types and Configuration

- [ ] Define `RunPodChatModelId` type union for supported models
- [ ] Create model options interfaces for RunPod-specific parameters
- [ ] Export proper TypeScript types for external usage
- [ ] Ensure type safety for model IDs and configurations

### 6. Package Configuration

- [ ] Set up `package.json` with:
  - Name: `@runpod/ai-sdk-provider`
  - Proper dependencies on AI SDK core packages
  - Build scripts for CommonJS and ESM outputs
  - Test scripts for different environments
- [ ] Configure exports for both CommonJS and ESM compatibility
- [ ] Set up proper peer dependencies for zod and other requirements

### 7. API Usage Pattern

The final implementation should support this usage pattern:

```typescript
import { runpod } from "@runpod/ai-sdk-provider";
import { generateText } from "ai";

const { text } = await generateText({
  model: runpod("deep-cogito/deep-cogito-v2-llama-70b"),
  prompt: "Write a Python function that sorts a list:",
});
```

### 8. Testing and Validation

- [ ] Unit tests for provider initialization and configuration
- [ ] Integration tests with mock RunPod API responses
- [ ] Edge runtime compatibility tests
- [ ] Node.js runtime compatibility tests
- [ ] Type checking and linting passes

### 9. Documentation

- [ ] Create comprehensive README.md with:
  - Installation instructions
  - Basic usage examples
  - Model ID reference
  - Configuration options
  - API key setup
- [ ] Document differences from other providers (if any)
- [ ] Include troubleshooting section

### 10. GitHub Actions & NPM Publishing

- [ ] Set up GitHub Actions workflow for:
  - Automated testing on PR and push
  - TypeScript compilation checks
  - Linting and formatting checks
  - Automated NPM publishing on version tags
- [ ] Configure proper NPM publishing with semantic versioning
- [ ] Set up proper GitHub repository structure with issue templates

## Technical Requirements

### Dependencies

- `@ai-sdk/provider` - Core provider interfaces
- `@ai-sdk/provider-utils` - Utility functions for providers
- `@ai-sdk/openai-compatible` - OpenAI compatibility layer
- Standard build tools (TypeScript, tsup, etc.)

### RunPod API Considerations

- RunPod LLM endpoints are **fully OpenAI API compatible** (vLLM backend)
- All OpenAI API features supported: chat completions, streaming, function calling, structured outputs
- Authentication via `Authorization: Bearer {RUNPOD_API_KEY}` header
- Base URLs are model-specific (each model has its own endpoint)
- OpenAI client libraries and tools work directly with RunPod endpoints

### Model Support (Initial)

- **Deep Cognito v2 70B**: General-purpose large language model
- **Qwen3 32B AWQ**: Multilingual model with advanced reasoning capabilities

## Success Metrics

- [ ] Package successfully publishes to NPM as `@runpod/ai-sdk-provider`
- [ ] Provider works seamlessly with AI SDK `generateText`, `generateObject`, `streamText`, and `generateStructuredOutput` functions
- [ ] All OpenAI-compatible features work: streaming, function calling, structured outputs, etc.
- [ ] All tests pass in both Node.js and Edge runtime environments
- [ ] Documentation is clear and enables easy onboarding
- [ ] GitHub Actions successfully automate the CI/CD pipeline

## Future Considerations

- Support for additional RunPod models as they become available
- Image generation support (Flux models) in future iterations
- Embedding model support if RunPod adds embedding endpoints
- Streaming support optimization for RunPod's infrastructure

## Dependencies and Blockers

- Access to RunPod API for testing (API key required)
- Understanding of RunPod's exact API response format
- Alignment with AI SDK provider interface requirements

## Definition of Done

- Package is published to NPM and installable via `npm install @runpod/ai-sdk-provider`
- Developer can successfully use RunPod models with the example code pattern
- All tests pass and documentation is complete
- GitHub Actions pipeline is functional and automated
- Code follows AI SDK conventions and patterns established by other providers
