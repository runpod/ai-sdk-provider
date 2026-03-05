import { z } from 'zod';
import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';

// Runpod image API error schema (supports both error formats)
export const runpodImageErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});

export type RunpodImageErrorData = z.infer<typeof runpodImageErrorSchema>;

// Helper function to extract error message from Runpod error data
function extractErrorMessage(data: RunpodImageErrorData): string {
  // Prefer message if available (more descriptive)
  if (data.message) {
    return data.message;
  }

  // If error field exists, try to extract nested JSON message
  if (data.error) {
    // Runpod sometimes returns nested JSON in the error field like:
    // "Error submitting task: 400, {\"code\":400,\"message\":\"...\"}"
    // Try to extract the inner message for cleaner error messages
    // Find the last occurrence of { which likely starts the JSON object
    const lastBraceIndex = data.error.lastIndexOf('{');
    if (lastBraceIndex !== -1) {
      try {
        const jsonStr = data.error.substring(lastBraceIndex);
        const nestedError = JSON.parse(jsonStr);
        if (nestedError.message && typeof nestedError.message === 'string') {
          return nestedError.message;
        }
      } catch {
        // If parsing fails, fall back to the original error string
      }
    }
    return data.error;
  }

  return 'Unknown Runpod error';
}

export const runpodImageFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: runpodImageErrorSchema as any,
  errorToMessage: extractErrorMessage,
});

export const runpodTranscriptionFailedResponseHandler =
  createJsonErrorResponseHandler({
    errorSchema: runpodImageErrorSchema as any,
    errorToMessage: extractErrorMessage,
  });

export const runpodVideoFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: runpodImageErrorSchema as any,
  errorToMessage: extractErrorMessage,
});
