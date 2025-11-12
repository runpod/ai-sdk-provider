---
"@runpod/ai-sdk-provider": patch
---

Improve error message extraction from Runpod API responses. Users now see actual error messages from the API instead of generic fallbacks like "Unknown error". The error handler extracts nested JSON messages from image API errors and properly surfaces all error details.

