# User Story 003: Upgrade to AI SDK v6

## Overview

Upgrade the Runpod AI SDK Provider from AI SDK v5 to v6, updating all interfaces, types, and dependencies to align with the new AI SDK 6.0 specification.

## User Story

**As a developer**, I want the Runpod AI SDK Provider to be compatible with AI SDK v6 so that I can use the latest AI SDK features and maintain compatibility with the evolving ecosystem.

## Acceptance Criteria

### 1. Package Dependency Updates

- [x] Update `@ai-sdk/provider` from `^2.0.0` to `^3.0.0`
- [x] Update `@ai-sdk/provider-utils` from `^3.0.5` to `^4.0.0`
- [x] Update `@ai-sdk/openai-compatible` from `^1.0.11` to `^2.0.0`
- [x] Update peer dependencies if necessary
- [x] Run `pnpm install` and verify no dependency conflicts

### 2. Provider Interface Updates

- [x] Update `runpod-provider.ts`:
  - Change `LanguageModelV2` imports/types to `LanguageModelV3`
  - Change `ImageModelV2` imports/types to `ImageModelV3`
  - Change `SpeechModelV2` imports/types to `SpeechModelV3`
- [x] Update `RunpodProvider` interface to use V3 types

```typescript
// Before (v5)
import { ImageModelV2, LanguageModelV2, SpeechModelV2 } from '@ai-sdk/provider';

export interface RunpodProvider {
  (modelId: string): LanguageModelV2;
  imageModel(modelId: string): ImageModelV2;
  speechModel(modelId: string): SpeechModelV2;
}

// After (v6)
import { ImageModelV3, LanguageModelV3, SpeechModelV3 } from '@ai-sdk/provider';

export interface RunpodProvider {
  (modelId: string): LanguageModelV3;
  imageModel(modelId: string): ImageModelV3;
  speechModel(modelId: string): SpeechModelV3;
}
```

### 3. Image Model Updates

- [x] Update `runpod-image-model.ts`:
  - Change `implements ImageModelV2` to `implements ImageModelV3`
  - Update `specificationVersion` from `'v2'` to `'v3'`
  - Replace `ImageModelV2CallWarning` with `SharedV3Warning` type
  - Update method signatures to match `ImageModelV3` interface
  - Update warning format from `{ type: 'unsupported-setting', setting }` to `{ type: 'unsupported', feature }`

```typescript
// Before (v5)
import { ImageModelV2, ImageModelV2CallWarning } from '@ai-sdk/provider';

export class RunpodImageModel implements ImageModelV2 {
  readonly specificationVersion = 'v2';
  // ...
}

// After (v6)
import { ImageModelV3, SharedV3Warning } from '@ai-sdk/provider';

export class RunpodImageModel implements ImageModelV3 {
  readonly specificationVersion = 'v3';
  // ...
}
```

### 4. Speech Model Updates

- [x] Update `runpod-speech-model.ts`:
  - Change `implements SpeechModelV2` to `implements SpeechModelV3`
  - Update `specificationVersion` from `'v2'` to `'v3'`
  - Replace `SpeechModelV2CallWarning` with `SharedV3Warning` type
  - Update method signatures to match `SpeechModelV3` interface
  - Update warning format from `{ type: 'unsupported-setting', setting }` to `{ type: 'unsupported', feature }`

```typescript
// Before (v5)
import { SpeechModelV2, SpeechModelV2CallWarning } from '@ai-sdk/provider';

export class RunpodSpeechModel implements SpeechModelV2 {
  readonly specificationVersion = 'v2';
  // ...
}

// After (v6)
import { SpeechModelV3, SharedV3Warning } from '@ai-sdk/provider';

export class RunpodSpeechModel implements SpeechModelV3 {
  readonly specificationVersion = 'v3';
  // ...
}
```

### 5. Test Updates

- [x] Update `runpod-provider.test.ts`:
  - Update mock class references if using AI SDK test utilities
- [x] Update `runpod-image-model.test.ts`:
  - Update specificationVersion expectation from 'v2' to 'v3'
- [x] Update `runpod-speech-model.test.ts`:
  - Update warning format expectations to V3 format
- [x] Ensure all tests pass with new V3 interfaces

### 6. OpenAI-Compatible Layer Updates

- [x] Verify `OpenAICompatibleChatLanguageModel` and `OpenAICompatibleCompletionLanguageModel` work with v6
- [x] Update any type assertions or casts if interface signatures changed
- [x] Test that chat completions, streaming, function calling still work

### 7. Type Export Updates

- [x] Update `src/index.ts` exports if type names changed (no changes needed)
- [x] Ensure backward compatibility or document breaking changes
- [x] Update `runpod-image-options.ts` and `runpod-chat-options.ts` if needed (no changes needed)

### 8. Documentation Updates

- [ ] Update README.md with any API changes
- [ ] Document minimum AI SDK version requirement (6.0.0)
- [ ] Update examples if function signatures changed
- [ ] Sync changes to `ai/content/providers/03-community-providers/22-runpod.mdx`

### 9. Build and Validation

- [x] Run `pnpm build` and ensure no TypeScript errors
- [x] Run `pnpm test` and ensure all tests pass
- [x] Run `pnpm lint` and fix any linting issues (pre-existing warnings only)
- [x] Run `pnpm type-check` for full type validation
- [x] Test in both Node.js and Edge runtime environments

## Technical Requirements

### Dependencies (Actual Versions)

```json
{
  "dependencies": {
    "@ai-sdk/openai-compatible": "^2.0.0",
    "@ai-sdk/provider": "^3.0.0",
    "@ai-sdk/provider-utils": "^4.0.0"
  }
}
```

### Key Interface Changes from AI SDK v6

| v5 Type | v6 Type |
|---------|---------|
| `LanguageModelV2` | `LanguageModelV3` |
| `ImageModelV2` | `ImageModelV3` |
| `SpeechModelV2` | `SpeechModelV3` |
| `ImageModelV2CallWarning` | `SharedV3Warning` |
| `SpeechModelV2CallWarning` | `SharedV3Warning` |
| `MockLanguageModelV2` | `MockLanguageModelV3` |
| `MockImageModelV2` | `MockImageModelV3` |

### Breaking Changes Addressed

1. **Specification Version**: All models updated `specificationVersion` from `'v2'` to `'v3'`
2. **Warning Type Unification**: Warning types now use `SharedV3Warning` with `{ type: 'unsupported', feature, details? }` format
3. **Method Signatures**: `doGenerate` updated to accept V3 call options (e.g., `prompt` is now `string | undefined`)
4. **Provider Options**: Now typed as `SharedV3ProviderOptions` (Record<string, JSONObject>)

## Success Metrics

- [x] All dependencies updated to v6 stable versions
- [x] All models implement V3 interfaces correctly
- [x] All tests pass in Node.js and Edge environments (31/31)
- [x] No TypeScript compilation errors
- [x] Package builds successfully
- [ ] Documentation reflects v6 compatibility

## Migration Strategy

1. **Phase 1**: Update dependencies and fix compilation errors
2. **Phase 2**: Update model implementations (image, speech, language)
3. **Phase 3**: Update tests and fix any runtime issues
4. **Phase 4**: Update documentation and examples
5. **Phase 5**: Release as new major version (or minor with beta tag)

## Version Considerations

- This is a **breaking change** for users on AI SDK v5
- Consider releasing as:
  - `0.13.0-beta.0` for testing
  - `1.0.0` for stable release (aligns with v6 GA)
- Document peer dependency requirements clearly

## Future Considerations

- Monitor AI SDK v6 GA release and update from beta versions
- Track any additional interface changes before v6 stable
- Consider maintaining v5 compatibility branch if needed

## Dependencies and Blockers

- AI SDK v6 beta package availability
- Stable interface definitions in `@ai-sdk/provider` v3
- Testing against actual AI SDK v6 `generateText`, `generateImage`, `generateSpeech` functions

## Definition of Done

- Package compiles with AI SDK v6 dependencies
- All existing functionality works with AI SDK v6
- Tests pass in all environments
- Documentation updated with v6 requirements
- Changeset created for version bump

