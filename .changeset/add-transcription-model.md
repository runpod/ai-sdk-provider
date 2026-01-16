---
"@runpod/ai-sdk-provider": minor
---

Add transcription model support with `pruna/whisper-v3-large`

- Add `transcriptionModel()` and `transcription()` methods to the provider
- Support audio transcription via RunPod's Whisper endpoint
- Accept audio as `Uint8Array`, base64 string, or URL via providerOptions
- Return transcription text, segments with timing, detected language, and duration
