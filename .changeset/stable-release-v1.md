---
"@runpod/ai-sdk-provider": major
---

Release 1.0.0 - AI SDK v6 Compatibility

This release marks the first stable version of the Runpod AI SDK Provider, coinciding with the AI SDK v6 release.

### Breaking Changes

- Now requires AI SDK v6 (`ai@6.x`) - users on AI SDK v5 must upgrade
- Updated to V3 provider interfaces (`LanguageModelV3`, `ImageModelV3`, `SpeechModelV3`)

### New Features

- **Standardized `files` parameter support**: Image models now accept the AI SDK standard `files` parameter for image editing, supporting both URLs and base64 data
- Legacy `providerOptions.runpod.images` still works but `files` is now the recommended approach

### Dependencies

- `@ai-sdk/provider`: ^2.0.0 → ^3.0.0
- `@ai-sdk/provider-utils`: ^3.0.5 → ^4.0.0
- `@ai-sdk/openai-compatible`: ^1.0.11 → ^2.0.0

### What's Unchanged

- Public API remains identical - no code changes required for users already on AI SDK v6
- All language models, image models, and speech models work the same way

