# User Story 002: Image Generation Support for Runpod AI SDK Provider

## Overview

Extend the Runpod AI SDK Provider to support image generation using Runpod's text-to-image models, enabling developers to generate images through the same unified AI SDK interface they use for text generation.

## User Story

**As a developer**, I want to generate images using Runpod's image models through the AI SDK provider so that I can create visual content alongside text generation using the same familiar AI SDK interface and consistent patterns.

## Acceptance Criteria

### 1. Image Model Integration

- [ ] Add support for `qwen/qwen-image` model (text-to-image)
- [ ] Implement `RunpodImageModel` class extending `ImageModelV2`
- [ ] Create `RunpodImageModelId` type definition
- [ ] Map Runpod image model to proper endpoint: `https://api.runpod.ai/v2/qwen-image-t2i/run`

### 2. Provider Interface Extension

- [ ] Extend `RunpodProvider` interface to include `imageModel()` method
- [ ] Update `createRunpod()` function to support image model creation
- [ ] Ensure provider implements `ProviderV2` interface completely
- [ ] Add image model method to default provider instance

### 3. Runpod Image API Integration

- [ ] Implement Runpod-specific image generation API calls:
  - Endpoint: `https://api.runpod.ai/v2/qwen-image-t2i/run`
  - Method: `POST` with JSON payload
  - Authentication: `Bearer {RUNPOD_API_KEY}`
- [ ] Handle Runpod's specific request format:
  ```json
  {
    "input": {
      "prompt": "string",
      "negative_prompt": "string",
      "size": "1328*1328",
      "seed": -1,
      "enable_safety_checker": true
    }
  }
  ```
- [ ] Convert AI SDK size format (`"1328x1328"`) to Runpod format (`"1328*1328"`)
- [ ] Handle size parameter conversion: `size?.replace('x', '*')`
- [ ] Map aspect ratios to Runpod's specific dimensions:
  ```typescript
  const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    '1:1': '1328*1328',
    '16:9': '1664*928',
    '9:16': '928*1664',
    '4:3': '1472*1140',
    '3:4': '1140*1472',
    '3:2': '1584*1056',
    '2:3': '1056*1584',
  };
  ```
- [ ] Parse Runpod's response format and extract generated images
- [ ] Convert response to AI SDK's expected format (base64 images)

### 4. AI SDK Image Generation Support

- [ ] Support standard AI SDK `generateImage()` function:

  ```typescript
  import { runpod } from '@runpod/ai-sdk-provider';
  import { experimental_generateImage as generateImage } from 'ai';

  const { image } = await generateImage({
    model: runpod.image('qwen/qwen-image'),
    prompt: 'A sunset over mountains',
  });
  ```

- [ ] Support image generation parameters:
  - `prompt` (required)
  - `n` (number of images, default: 1)
  - `size` (image dimensions)
  - `seed` (for reproducible generation)
- [ ] Handle provider-specific options for Runpod parameters

### 5. TypeScript Types and Configuration

- [ ] Define `RunpodImageModelId` type union for supported image models
- [ ] Create `RunpodImageSettings` interface for model-specific options
- [ ] Export image-related types from main package
- [ ] Update provider interface to include image model methods

### 6. Error Handling and Validation

- [ ] Implement proper error handling for image generation failures
- [ ] Validate image generation parameters (size format, seed range, etc.)
- [ ] Handle Runpod-specific error responses
- [ ] Provide clear error messages for unsupported parameters

### 7. API Usage Pattern

The final implementation should support these usage patterns:

```typescript
import { runpod } from '@runpod/ai-sdk-provider';
import { experimental_generateImage as generateImage } from 'ai';

// Basic image generation
const { image } = await generateImage({
  model: runpod.image('qwen/qwen-image'),
  prompt: 'A fashion-forward woman in Paris',
});

// With additional parameters
const { image } = await generateImage({
  model: runpod.image('qwen/qwen-image'),
  prompt: 'A sunset over mountains',
  size: '1328x1328',
  seed: 42,
  providerOptions: {
    runpod: {
      negative_prompt: 'blurry, low quality',
      enable_safety_checker: true,
    },
  },
});
```

### 8. Testing and Validation

- [ ] Unit tests for image model creation and configuration
- [ ] Mock tests for image generation API calls
- [ ] Integration tests with actual Runpod image API (if API key available)
- [ ] Edge runtime compatibility tests for image models
- [ ] Type checking for image model interfaces

### 9. Documentation Updates

- [ ] Update README.md to include image generation examples
- [ ] Document supported image models and their capabilities
- [ ] Add image generation section to usage examples
- [ ] Update model table to include image models
- [ ] Document Runpod-specific image parameters

### 10. Code Structure

- [ ] Create `src/runpod-image-options.ts` for image model types
- [ ] Create `src/runpod-image-model.ts` for image model implementation
- [ ] Create `src/runpod-image-model.test.ts` for image model tests
- [ ] Update `src/index.ts` to export image-related types and functions
- [ ] Update `src/runpod-provider.ts` to include image model support

## Technical Requirements

### Dependencies

- Existing AI SDK dependencies remain the same
- No additional dependencies required for image generation
- Leverage existing `@ai-sdk/provider` interfaces for `ImageModelV2`

### Runpod Image API Considerations

- **Endpoint Pattern**: Different from LLM endpoints (`/run` vs `/openai/v1`)
- **Request Format**: Custom Runpod format, not OpenAI-compatible
- **Response Format**: Runpod-specific, needs parsing to AI SDK format
- **Authentication**: Same Bearer token as LLM endpoints
- **Model Naming**: `qwen/qwen-image` (simplified) vs `qwen-image-t2i` (endpoint)

### Image Model Support (Initial)

- **Qwen Image T2I**: Text-to-image generation with customizable parameters
- **Size Support**: Configurable image dimensions (default: 1328x1328)
- **Safety Checker**: Optional content filtering
- **Negative Prompts**: Support for negative prompt guidance

## Success Metrics

- [ ] Package supports both text and image generation seamlessly
- [ ] `experimental_generateImage()` function works with Runpod models
- [ ] Image generation parameters are properly validated and passed through
- [ ] Generated images are returned in correct base64 format
- [ ] All existing functionality remains unaffected
- [ ] Documentation clearly explains image generation capabilities

## Future Considerations

- Support for additional Runpod image models as they become available
- Image-to-image generation if Runpod adds support
- Advanced image parameters (style, composition, etc.)
- Batch image generation optimization
- Integration with AI SDK's image streaming capabilities (when available)

## Dependencies and Blockers

- Access to Runpod image generation API for testing
- Understanding of Runpod's image response format and error handling
- Alignment with AI SDK's `ImageModelV2` interface requirements

## Definition of Done

- Developer can generate images using `experimental_generateImage()` with Runpod models
- All image generation parameters work correctly
- Tests pass and documentation includes image generation examples
- Package maintains backward compatibility with existing text generation features
- Image generation follows AI SDK conventions and patterns
