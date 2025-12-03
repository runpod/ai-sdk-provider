---
"@runpod/ai-sdk-provider": patch
---

Fix Pruna and Nano Banana Pro model support for all aspect ratios:

Pruna models:
- Skip standard size/aspectRatio validation
- Support all t2i aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, custom
- Support all edit aspect ratios: match_input_image, 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3
- Support custom width/height for t2i (256-1440, must be multiple of 16)
- Support 1-5 images for edit

Nano Banana Pro model:
- Skip standard size/aspectRatio validation
- Support all aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9, 9:21
- Support resolution: 1k, 2k, 4k
- Support output_format: jpeg, png, webp
