---
"@runpod/ai-sdk-provider": minor
---

add image models: alibaba/wan-2.6 (t2i) and qwen/qwen-image-edit-2511 (edit with lora support)

- alibaba/wan-2.6: text-to-image model with max resolution 1024x1024
- qwen/qwen-image-edit-2511: edit model with max resolution 1536x1536, supports 1-3 input images
- qwen/qwen-image-edit-2511 with loras: automatically switches to lora endpoint when loras providerOption is provided
- added max resolution column to supported models table in docs
