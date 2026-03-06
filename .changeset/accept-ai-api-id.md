---
'@runpod/ai-sdk-provider': minor
---

Accept aiApiId (endpoint ID) as a valid model ID for image models and add video generation support.

Image models now use the same fallback pattern as speech, transcription, and video models: any unrecognized model ID is used directly as `https://api.runpod.ai/v2/{modelId}` instead of incorrectly appending `/openai/v1`. This means aiApiIds like `wan-2-6-t2i` or `black-forest-labs-flux-1-schnell` work out of the box without needing explicit mappings. Console endpoint URLs are also now supported for image models.

Video generation support includes 15 models across multiple providers (Pruna, Vidu, Kling, Wan, Seedance, Sora) with async polling, provider options, and both text-to-video and image-to-video capabilities.
