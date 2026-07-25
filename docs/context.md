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
const model = runpod('qwen/qwen3-32b-awq');

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

- ✅ **Always use "Runpod"** (not "Runpod", "runpod", or "run-pod")
- ✅ **Package name**: `@runpod/ai-sdk-provider`
- ✅ **Function names**: `runpod()`, `createRunpod()`
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

### 4. **Model ID Flexibility**

- ✅ Accept any model ID as a string (no strict type validation)
- ✅ Use hardcoded mappings only as endpoint presets for known models
- ✅ Automatically derive endpoints for unknown models by replacing `/` with `-`
- ✅ Example unknown model: `'ibm-granite/granite-4.0-h-small'` → `'https://api.runpod.ai/v2/ibm-granite-granite-4.0-h-small/openai/v1'`
- ✅ Users can override with custom `baseURL` for non-standard endpoints
- ✅ Invalid models fail at API call time (Runpod returns error), not at provider creation time

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
// ✅ Good - Derive endpoint for unknown models
function deriveEndpointURL(modelId: string): string {
  const normalized = modelId.replace(/\//g, '-');
  return `https://api.runpod.ai/v2/${normalized}/openai/v1`;
}

// Use hardcoded mapping if available, otherwise derive
const baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId] || deriveEndpointURL(modelId);
```

### Model Configuration

```typescript
// ✅ Good - Clear mappings and consistent patterns
const MODEL_ID_TO_ENDPOINT_URL: Record<string, string> = {
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

### Dual Documentation Strategy

**CRITICAL**: We maintain TWO documentation files that must stay in sync:

1. **`README.md`** - Main package documentation (for npm, GitHub)
2. **`ai/content/providers/03-community-providers/22-runpod.mdx`** - AI SDK community provider docs

**🚨 SYNC RULE**: Any changes to examples, features, or capabilities must be updated in BOTH files.

- Whenever you modify `README.md`, you must also update
  `ai/content/providers/03-community-providers/22-runpod.mdx` in the AI docs
  within the same PR. These two files should remain identical in content.

### Documentation Structure (Both Files)

1. **Title & Description**
2. **Setup** (installation with tabs)
3. **Provider Instance** (with optional settings in FAL format)
4. **Language Models** (with capabilities table)
5. **Image Models** (with model capabilities and provider options)
6. **Advanced Features**
7. **Links/Resources**

### Optional Settings Format

Always use the FAL/DeepInfra format for optional settings:

```markdown
- **baseURL** _string_

  Use a different URL prefix for API calls, e.g. to use proxy servers or custom endpoints.
  Supports vLLM deployments, SGLang servers, and any OpenAI-compatible API.
  The default prefix is `https://api.runpod.ai/v2`.
```

### Code Comments

```typescript
// ✅ Good - Explain the "why", not the "what"
// Map Runpod model IDs to their OpenAI-compatible names
// This is needed because Runpod uses different naming internally
const MODEL_ID_TO_OPENAI_NAME: Record<string, string> = {
  // ...
};
```

### Documentation Sync Checklist

When updating documentation, ensure BOTH files have:

- ✅ Same installation examples
- ✅ Same model capabilities tables
- ✅ Same usage examples
- ✅ Same provider options
- ✅ Same advanced features list
- ✅ Consistent custom endpoint support (vLLM/SGLang)

### Public Assets (R2)

- ✅ Host README/docs images in public R2 (not in the npm package).
- ✅ Prefer **stable keys** (e.g. `runpod/ai-sdk-provider/banner.jpg`) so URLs don’t churn.
- ✅ Use the permanent public URL (`r2 url <key>`) and reference that in **both** `README.md` and the synced AI docs page.

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

// ❌ Bad - Rejecting unknown models
if (!MODEL_ID_TO_ENDPOINT_URL[modelId]) {
  throw new Error(`Unsupported model: ${modelId}`);
}

// ❌ Bad - Assuming streaming works
const { textStream } = await streamText({ model });
```

### Do This Instead

```typescript
// ✅ Good - Consistent naming
export const runpod = createRunpod();

// ✅ Good - Clear error with context
throw new Error(`Unsupported Runpod model: ${modelId}`);

// ✅ Good - Accept any model ID and derive endpoint
const baseURL = MODEL_ID_TO_ENDPOINT_URL[modelId] || deriveEndpointURL(modelId);

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
