# User Story 003: Video Support for AI SDK Core and Providers

## Overview

Extend the AI SDK core and provider interfaces to support video generation, enabling developers to generate videos via a unified API similar to `experimental_generateImage()`.

## User Story

**As a developer**, I want to generate videos using AI providers through the AI SDK so that I can create short clips or animations using the same consistent patterns I already use for images and text.

## Acceptance Criteria

### 1. Video Model Interface (Provider Layer)

- [ ] Add `VideoModelV2` under `packages/provider/src/video-model/v2/`:
  - [ ] File: `video-model-v2.ts`
  - [ ] File: `video-model-v2-call-options.ts`
  - [ ] File: `video-model-v2-call-warning.ts`
  - [ ] File: `video-model-v2-response-metadata.ts`
  - [ ] File: `index.ts`
- [ ] `VideoModelV2` mirrors `ImageModelV2` shape with video-specific options:
  - `specificationVersion: 'v2'`
  - `provider: string`, `modelId: string`
  - `maxVideosPerCall: number | undefined | ((opts: { modelId: string }) => number | undefined | Promise<number | undefined>)`
  - `doGenerate(options: VideoModelV2CallOptions)` returns:
    - `videos: Array<string> | Array<Uint8Array>` (base64 without data URI or raw bytes)
    - `warnings: Array<VideoModelV2CallWarning>`
    - `providerMetadata?: Record<string, { videos: unknown }>`
    - `response: { timestamp: Date; modelId: string; headers?: Record<string, string> }`
- [ ] `VideoModelV2CallOptions` (initial):
  - `prompt: string`
  - `n?: number`
  - `resolution?: `${number}x${number}``(e.g.,`1024x576`)
  - `aspectRatio?: `${number}:${number}``(e.g.,`16:9`)
  - `durationSeconds?: number`
  - `fps?: number`
  - `seed?: number`
  - `providerOptions?: SharedV2ProviderOptions` (pass-through by provider name)
  - `headers?: SharedV2Headers` (HTTP providers)
  - `abortSignal?: AbortSignal`
- [ ] `VideoModelV2CallWarning` aligns with image warning style (unsupported settings, coercions, truncations, etc.).
- [ ] `VideoModelV2ResponseMetadata` mirrors image response metadata type (timestamp/modelId/headers).

### 2. Provider Interface Extension

- [ ] Update `packages/provider/src/provider/v2/provider-v2.ts` to include:
  ```ts
  videoModel(modelId: string): VideoModelV2;
  ```
- [ ] Ensure all first-party providers can ignore/not implement until they add models, without breaking existing consumers.

### 3. AI SDK Core: Generate Video

- [ ] Add `packages/ai/src/generate-video/`:
  - [ ] `generate-video.ts` (mirrors `generate-image.ts`):
    - Inputs: `model: VideoModelV2`, `prompt`, `n=1`, `maxVideosPerCall?`, `resolution?`, `aspectRatio?`, `durationSeconds?`, `fps?`, `seed?`, `providerOptions?`, `maxRetries?`, `abortSignal?`, `headers?`
    - Retry behavior via `prepareRetries`
    - Parallelization based on `maxVideosPerCall`
    - Wrap outputs as `GeneratedFile` with detected media type (default to `video/mp4` if unknown)
    - Throw `NoVideoGeneratedError` if none returned
  - [ ] `generate-video-result.ts` with `GenerateVideoResult` interface (`video`, `videos`, `warnings`, `responses`, `providerMetadata`)
  - [ ] `index.ts` export mapping:
    ```ts
    export { generateVideo as experimental_generateVideo } from './generate-video';
    ```
- [ ] Update `packages/ai/src/index.ts` to export from `./generate-video`.

### 4. Media Type Detection

- [ ] Extend `packages/ai/src/util/detect-media-type.ts` to support video:
  - [ ] Add `videoMediaTypeSignatures` (initial):
    - `video/mp4` (ftyp/MP4 brands: `ftypisom`, `ftypmp42`, etc.)
    - `video/webm` (EBML: `0x1A 0x45 0xDF 0xA3`)
    - `video/quicktime` (ftyp `qt`)
  - [ ] Allow `detectMediaType` to accept video signatures
  - [ ] Default to `video/mp4` when detection fails
- [ ] Add unit tests for video detection (`detect-media-type.test.ts`).

### 5. Types and Public API

- [ ] Add `packages/ai/src/types/video-model.ts`:
  - `export type VideoModel = VideoModelV2`
  - `export type VideoGenerationWarning = VideoModelV2CallWarning`
  - `export type VideoModelProviderMetadata = VideoModelV2ProviderMetadata`
- [ ] Add `packages/ai/src/types/video-model-response-metadata.ts`.
- [ ] Ensure re-exports from `packages/ai/src/types/index.ts`.

### 6. Testing and Validation

- [ ] Add `MockVideoModelV2` in `packages/ai/src/test/mock-video-model-v2.ts`
- [ ] Unit tests for `generateVideo()` covering:
  - parallelization via `maxVideosPerCall`
  - provider metadata passthrough
  - warnings logging
  - error when no videos generated
  - header passthrough and abort signal
- [ ] Edge runtime compatibility test patterns analogous to images.

### 7. Documentation Updates

- [ ] Update provider developer docs to include `videoModel` in `ProviderV2` examples
- [ ] Add AI SDK Core docs page for `experimental_generateVideo()` usage
- [ ] Usage examples:

  ```ts
  import { experimental_generateVideo as generateVideo } from 'ai';

  const { video } = await generateVideo({
    model: someProvider.video('video-model-id'),
    prompt: 'A drone shot over snowy mountains at sunrise',
    resolution: '1280x720',
    durationSeconds: 5,
    fps: 24,
    seed: 42,
    providerOptions: {
      providerName: {
        motion_strength: 0.7,
      },
    },
  });
  ```

- [ ] Note initial limitation: no streaming video generation in v1.

### 8. Errors & Guardrails

- [ ] Define and throw consistent errors:
  - `NoVideoGeneratedError` – provider returned zero outputs
  - `UnsupportedVideoParamError` – illegal combinations or unsupported format
  - `ProviderRateLimitError` – normalized 429/Quota errors
  - `ProviderServiceError` – 5xx or provider‑specific fatal
  - `AbortedError` – derived from `AbortSignal`
- [ ] Surface non‑fatal warnings on the result:
  - size over `maxBytesPerVideo`, even dimension rounding, provider clamps (fps/duration)

### 9. Concurrency Strategy

- [ ] Batch when `n/count > maxVideosPerCall` and parallelize batches by default
- [ ] Consider `concurrencyStrategy?: 'parallel' | 'sequential'` (default `parallel`) for providers with strict rate limits

### 10. Runtime & Edge Compatibility

- [ ] Avoid Node‑only APIs (`Buffer`, `fs`); use `Uint8Array`, `Blob` where available
- [ ] Use Web Crypto (`subtle.digest`) for SHA‑256 via shared helper
- [ ] Verify Workers/Deno compatibility mirrors image helper

### 11. Storage Guidance (Docs)

- [ ] Browser preview: `URL.createObjectURL(await toBlob(video))` → `<video src controls>`
- [ ] Node persistence (in Node‑only docs tab): `fs.writeFile(path, Buffer.from(video.bytes))`
- [ ] Document filename and `sha256` conventions for CDN caching

### 12. AI Gateway (Docs)

- [ ] Document calling providers through Gateway (observability, quotas, budgets)
- [ ] Note v1 excludes a universal job‑polling abstraction; include example fetch‑polling snippet

### 13. Examples

- [ ] Add `examples/nextjs-video` demo page: model selector, prompt, aspect ratio, duration, fps, preview list
- [ ] Provide one opt‑in real adapter example behind env flags (e.g., `RUNPOD_*`, `REPLICATE_*`, `FAL_*`)
- [ ] Add `MockVideoModelV2` for tests and local demo without credentials

### 14. Testing Plan (Expanded)

- [ ] Unit tests:
  - media‑type detection (MP4/WebM/MOV fixtures)
  - param normalization (aspect ratio → width/height, even‑dimension rounding)
  - error mapping (rate limit, service, unsupported param)
  - concurrency batching (parallel vs sequential, order stable)
  - abort behavior (no further calls after abort)
- [ ] Runtime tests:
  - Edge runtime build passes (no Node APIs)
- [ ] Integration (skipped by default, run with env):
  - round‑trip generates ≥ 1 output and detects mime type

### 15. Docs & Typedoc

- [ ] New API page for `experimental_generateVideo` mirroring `experimental_generateImage`
- [ ] Guides: “Generate & preview video”, “Persist video on Node”, Gateway note
- [ ] Ensure public barrels export `VideoModelV2`, `experimental_generateVideo`, types

### 16. Versioning & Changesets

- [ ] Changesets:
  - `@ai-sdk/ai` (minor: new experimental API)
  - `@ai-sdk/provider` (minor: new interface)
- [ ] Changelogs include usage snippet and migration notes

### 17. Success Metrics

- [ ] `experimental_generateVideo()` returns playable videos as `GeneratedFile` with correct media types
- [ ] Providers can plug in `VideoModelV2` with minimal boilerplate
- [ ] Backwards compatibility maintained for all existing functionality
- [ ] Clear errors for unsupported parameters

### 18. Dependencies and Blockers

- No new external dependencies required
- Provider teams need to implement `VideoModelV2` per provider
- Clarify initial set of supported video MIME types and detection signatures

### 19. Future Considerations

- Streaming video generation (progress events/partial segments)
- Video editing and image-to-video/motion extension flows
- Audio track generation and muxing controls
- Advanced parameters (motion strength, guidance, scheduler)
- Batch/burst multi-clip generation
- Tooling for thumbnails and keyframes extraction

## Definition of Done

- New `VideoModelV2` interface and `videoModel()` in `ProviderV2`
- `experimental_generateVideo()` implemented with tests
- Media type detection supports common video formats
- Public types exported; docs and examples updated
- All tests pass and no regressions in image/text/speech/transcription paths
