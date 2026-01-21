---
'@runpod/ai-sdk-provider': patch
---

fix(image,speech): pass through actual API error messages on FAILED status

When the Runpod API returns a FAILED status, the SDK now surfaces the actual error message instead of throwing generic errors like "Unexpected response status: FAILED".
