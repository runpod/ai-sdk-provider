# Runpod AI SDK Provider - Development Conventions

This document outlines the core conventions, rules, and best practices for developing and maintaining the Runpod AI SDK Provider.

## 🌟 What is this Project?

### The AI SDK

The [Vercel AI SDK](https://ai-sdk.dev) is a TypeScript framework that provides a unified interface for working with different AI providers (OpenAI, Anthropic, Google, etc.). It offers standardized functions like `generateText()`, `streamText()`, and `generateObject()` that work consistently across all providers.

### Our Provider

The **Runpod AI SDK Provider** (`@runpod/ai-sdk-provider`) is a custom adapter that enables the AI SDK to work with Runpod's public endpoints. It translates AI SDK calls into Runpod-compatible API requests.

### How it Works

```typescript
// Instead of using OpenAI directly:
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4');

// Users can now use Runpod models:
import { runpod } from '@runpod/ai-sdk-provider';
const model = runpod('deep-cogito/deep-cogito-v2-llama-70b');

// Same AI SDK functions work with both:
const { text } = await generateText({ model, prompt: '...' });
```

### Value Proposition

- ✅ **Unified API**: Same AI SDK interface for Runpod models
- ✅ **OpenAI Compatible**: Leverages Runpod's OpenAI-compatible endpoints
- ✅ **Drop-in Replacement**: Easy migration from other providers
- ✅ **Type Safety**: Full TypeScript support with model validation

## 🏗️ Project Structure

```
ai-sdk-provider/
├── src/                    # Source code
│   ├── index.ts           # Main exports
│   ├── runpod-provider.ts # Core provider implementation
│   ├── runpod-*-options.ts # Model type definitions
│   └── *.test.ts          # Test files (co-located)
├── docs/                   # Documentation
├── .changeset/            # Changesets for versioning
└── dist/                  # Build output (generated)
```

## 🎯 Core Principles

### 1. **Branding & Naming**

- ✅ **Always use "Runpod"** (not "RunPod", "runpod", or "run-pod")
- ✅ **Package name**: `@runpod/ai-sdk-provider`
- ✅ **Function names**: `runpod()`, `createRunPod()`
- ✅ **Types**: `RunpodProvider`, `RunpodChatModelId`

### 2. **OpenAI Compatibility**

- ✅ Runpod endpoints are **OpenAI API compatible**
- ✅ Use `@ai-sdk/openai-compatible` as the foundation
- ✅ Support standard OpenAI features: chat completions, function calling, structured outputs
- ❌ **Streaming is NOT supported yet** - always document this limitation

### 3. **API Key Management**

- ✅ Load from `RUNPOD_API_KEY` environment variable
- ✅ Allow override via provider options
- ✅ Point users to: `https://console.runpod.io/user/settings` → "API Keys"

## 🔧 Development Workflow

### Package Management

- ✅ **Use pnpm** as the primary package manager
- ✅ Maintain `pnpm-lock.yaml` (not `package-lock.json`)
- ✅ Support all package managers in documentation

### Version Management

- ✅ **Use Changesets** for version management and releases
- ✅ Never manually edit version numbers or `CHANGELOG.md`
- ✅ Create changesets with: `pnpm changeset`
- ✅ Automated releases via GitHub Actions

### Code Quality

- ✅ **ESLint**: Use `eslint.config.mjs` for Node 18+ compatibility
- ✅ **Prettier**: Single quotes, 2 spaces, trailing commas
- ✅ **TypeScript**: Strict mode, full type safety
- ✅ **Tests**: Co-located with source files, use Vitest

## 📝 Code Style

### TypeScript

```typescript
// ✅ Good - Consistent naming and exports
export interface RunpodProviderSettings {
  apiKey?: string;
  headers?: Record<string, string>;
}

export function createRunpod(
  options: RunpodProviderSettings = {}
): RunpodProvider {
  // Implementation
}

export const runpod = createRunpod();
```

### Error Handling

```typescript
// ✅ Good - Clear error messages with context
if (!baseURL) {
  throw new Error(
    `Unsupported Runpod model: ${modelId}. Supported models: ${Object.keys(
      MODEL_ID_TO_ENDPOINT_URL
    ).join(', ')}`
  );
}
```

### Model Configuration

```typescript
// ✅ Good - Clear mappings and consistent patterns
const MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
  'deep-cogito/deep-cogito-v2-llama-70b':
    'https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/openai/v1',
  'qwen/qwen3-32b-awq': 'https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1',
};
```

## 🧪 Testing Standards

### Test Structure

- ✅ Use descriptive test names: `"should create a RunpodProvider instance with default options"`
- ✅ Group related tests with `describe` blocks
- ✅ Test both success and error cases
- ✅ Mock external dependencies properly

### Test Coverage

- ✅ **Unit tests**: Core provider functionality
- ✅ **Integration tests**: Model creation and configuration
- ✅ **Edge runtime tests**: Ensure compatibility
- ✅ **Error handling**: Invalid models, missing API keys

## 📚 Documentation

### README.md Structure

1. **Title & Description**
2. **Installation** (npm, pnpm, yarn)
3. **Setup** (API key instructions)
4. **Supported Models** (table format)
5. **Usage Examples** (basic → advanced)
6. **Streaming Note** (not supported yet)
7. **Links**

### Code Comments

```typescript
// ✅ Good - Explain the "why", not the "what"
// Map Runpod model IDs to their OpenAI-compatible names
// This is needed because Runpod uses different naming internally
const MODEL_ID_TO_OPENAI_NAME: Record<string, string> = {
  // ...
};
```

## 🚀 Release Management

- ✅ **Use Changesets** for all releases - see [CONTRIBUTING.md](../.github/CONTRIBUTING.md) for detailed process
- ✅ **Never manually edit** version numbers or `CHANGELOG.md`
- ✅ **Create changeset** for any user-facing changes with `pnpm changeset`

## 🔍 Common Patterns

### Provider Creation

```typescript
// ✅ Standard pattern for AI SDK providers
const provider = (modelId: RunpodChatModelId) => createChatModel(modelId);
provider.chatModel = createChatModel;
provider.languageModel = createChatModel;
provider.completionModel = createCompletionModel;
return provider;
```

### Environment Variable Loading

```typescript
// ✅ Use AI SDK utilities for consistent behavior
const apiKey = loadApiKey({
  apiKey: options.apiKey,
  environmentVariableName: 'RUNPOD_API_KEY',
  description: 'Runpod',
});
```

## ❌ Common Pitfalls

### Don't Do This

```typescript
// ❌ Bad - Inconsistent naming
export const RunPodProvider = createRunPod();

// ❌ Bad - Missing error context
throw new Error('Invalid model');

// ❌ Bad - Hardcoded values
const baseURL = 'https://api.runpod.ai/v2/model/openai/v1';

// ❌ Bad - Assuming streaming works
const { textStream } = await streamText({ model });
```

### Do This Instead

```typescript
// ✅ Good - Consistent naming
export const runpod = createRunpod();

// ✅ Good - Clear error with context
throw new Error(`Unsupported Runpod model: ${modelId}`);

// ✅ Good - Configurable mappings
const baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId];

// ✅ Good - Document streaming limitations
// Note: Streaming is not yet supported by Runpod's public endpoints
```

## 🛠️ Development Commands

```bash
# Development
pnpm dev          # Watch mode compilation
pnpm build        # Production build
pnpm test         # Run all tests
pnpm test:watch   # Watch mode testing

# Code Quality
pnpm lint         # ESLint checking
pnpm prettier     # Format code
pnpm type-check   # TypeScript checking

# Release Management
pnpm changeset           # Create changeset
pnpm changeset:version   # Update versions
pnpm changeset:publish   # Publish to npm
```

---

**Remember**: These conventions exist to maintain consistency, quality, and ease of maintenance. When in doubt, follow the existing patterns in the codebase.
