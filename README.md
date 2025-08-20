# Runpod AI SDK Provider

The **Runpod provider** for the [AI SDK](https://ai-sdk.dev/docs) contains language model and image generation support for [Runpod's](https://runpod.io) public endpoints. Runpod is a foundational platform for developers to build, deploy, and scale custom AI systems.

## Setup

The Runpod provider is available in the `@runpod/ai-sdk-provider` module. You can install it with:

```bash
# npm
npm install @runpod/ai-sdk-provider

# pnpm
pnpm add @runpod/ai-sdk-provider

# yarn
yarn add @runpod/ai-sdk-provider

# bun
bun add @runpod/ai-sdk-provider
```

## Provider Instance

You can import the default provider instance `runpod` from `@runpod/ai-sdk-provider`:

```ts
import { runpod } from '@runpod/ai-sdk-provider';
```

If you need a customized setup, you can import `createRunpod` and create a provider instance with your settings:

```ts
import { createRunpod } from '@runpod/ai-sdk-provider';

const runpod = createRunpod({
  apiKey: 'your-api-key', // optional, defaults to RUNPOD_API_KEY environment variable
  baseURL: 'custom-url', // optional, for custom endpoints
  headers: {
    /* custom headers */
  }, // optional
});
```

You can use the following optional settings to customize the Runpod provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls, e.g. to use proxy servers or custom endpoints.
  Supports vLLM deployments, SGLang servers, and any OpenAI-compatible API.
  The default prefix is `https://api.runpod.ai/v2`.

- **apiKey** _string_

  API key that is being sent using the `Authorization` header.
  It defaults to the `RUNPOD_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

You can obtain your Runpod API key from the [Runpod Console](https://console.runpod.io/user/settings) under "API Keys".

## Language Models

You can create language models using the provider instance. The first argument is the model ID:

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: runpod('deep-cogito/deep-cogito-v2-llama-70b'),
  prompt: 'Write a Python function that sorts a list:',
});
```

**Returns:**

- `text` - Generated text string
- `finishReason` - Why generation stopped ('stop', 'length', etc.)
- `usage` - Token usage information (prompt, completion, total tokens)

Runpod language models can also be used in the `streamText` function (see [AI SDK Core](/docs/ai-sdk-core)).

**Note**: Streaming is not yet supported by Runpod's public endpoints. The team is working on implementing this feature.

### Model Capabilities

| Model ID                               | Description                                                         | Object Generation | Tool Usage |
| -------------------------------------- | ------------------------------------------------------------------- | ----------------- | ---------- |
| `deep-cogito/deep-cogito-v2-llama-70b` | 70B parameter general-purpose LLM with advanced reasoning           | ✅                | ✅         |
| `qwen/qwen3-32b-awq`                   | 32B parameter multilingual model with strong reasoning capabilities | ✅                | ✅         |

### Chat Conversations

```ts
const { text } = await generateText({
  model: runpod('deep-cogito/deep-cogito-v2-llama-70b'),
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' },
  ],
});
```

### Function Calling

```ts
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text, toolCalls } = await generateText({
  model: runpod('deep-cogito/deep-cogito-v2-llama-70b'),
  prompt: 'What is the weather like in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get weather information for a city',
      parameters: z.object({
        city: z.string().describe('The city name'),
      }),
      execute: async ({ city }) => {
        return `The weather in ${city} is sunny.`;
      },
    }),
  },
});
```

**Additional Returns:**

- `toolCalls` - Array of tool calls made by the model
- `toolResults` - Results from executed tools

### Structured Output

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: runpod('qwen/qwen3-32b-awq'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a recipe for chocolate chip cookies.',
});
```

**Returns:**

- `object` - Parsed object matching your schema
- `usage` - Token usage information

## Image Models

You can create Runpod image models using the `.imageModel()` factory method.
For more on image generation with the AI SDK see [generateImage()](/docs/reference/ai-sdk-core/generate-image).

### Basic Usage

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { experimental_generateImage as generateImage } from 'ai';

const { image } = await generateImage({
  model: runpod.imageModel('qwen/qwen-image'),
  prompt: 'A serene mountain landscape at sunset',
  aspectRatio: '4:3',
});

// Save to filesystem
import { writeFileSync } from 'fs';
writeFileSync('landscape.jpg', image.uint8Array);
```

**Returns:**

- `image.uint8Array` - Binary image data (efficient for processing/saving)
- `image.base64` - Base64 encoded string (for web display)
- `image.mediaType` - MIME type ('image/jpeg' or 'image/png')
- `warnings` - Array of any warnings about unsupported parameters

### Model Capabilities

| Model ID                               | Description                     | Supported Aspect Ratios |
| -------------------------------------- | ------------------------------- | ----------------------- |
| `qwen/qwen-image`                      | Text-to-image generation        | 1:1, 4:3, 3:4           |
| `bytedance/seedream-3.0`               | Advanced text-to-image model    | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-schnell`     | Fast image generation (4 steps) | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-dev`         | High-quality image generation   | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-kontext-dev` | Context-aware image generation  | 1:1, 4:3, 3:4           |

**Note**: The provider uses strict validation for image parameters. Unsupported aspect ratios (like `16:9`, `9:16`, `3:2`, `2:3`) will throw an `InvalidArgumentError` with a clear message about supported alternatives.

### Advanced Parameters

```ts
const { image } = await generateImage({
  model: runpod.imageModel('bytedance/seedream-3.0'),
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

#### Modify Image

Transform existing images using text prompts.

```ts
// Example: Transform existing image
const { image } = await generateImage({
  model: runpod.imageModel('black-forest-labs/flux-1-kontext-dev'),
  prompt: 'Transform this into a cyberpunk style with neon lights',
  aspectRatio: '1:1',
  providerOptions: {
    runpod: {
      image: 'https://example.com/input-image.jpg',
    },
  },
});

// Example: Using base64 encoded image
const { image } = await generateImage({
  model: runpod.imageModel('black-forest-labs/flux-1-kontext-dev'),
  prompt: 'Make this image look like a painting',
  providerOptions: {
    runpod: {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    },
  },
});
```

### Advanced Configuration

```ts
// Full control over generation parameters
const { image } = await generateImage({
  model: runpod.imageModel('black-forest-labs/flux-1-dev'),
  prompt: 'A majestic dragon breathing fire in a medieval castle',
  size: '1328x1328',
  seed: 42, // For reproducible results
  providerOptions: {
    runpod: {
      negative_prompt: 'blurry, low quality, distorted, ugly, bad anatomy',
      enable_safety_checker: true,
      num_inference_steps: 50, // Higher quality (default: 28)
      guidance: 3.5, // Stronger prompt adherence (default: 2)
      output_format: 'png', // High quality format
      // Polling settings for long generations
      maxPollAttempts: 30,
      pollIntervalMillis: 4000,
    },
  },
});

// Fast generation with minimal steps
const { image } = await generateImage({
  model: runpod.imageModel('black-forest-labs/flux-1-schnell'),
  prompt: 'A simple red apple',
  aspectRatio: '1:1',
  providerOptions: {
    runpod: {
      num_inference_steps: 2, // Even faster (default: 4)
      guidance: 10, // Higher guidance for simple prompts
      output_format: 'jpg', // Smaller file size
    },
  },
});
```

### Provider Options

Runpod image models support flexible provider options through the `providerOptions.runpod` object:

| Option                  | Type      | Default | Description                                                             |
| ----------------------- | --------- | ------- | ----------------------------------------------------------------------- |
| `negative_prompt`       | `string`  | `""`    | Text describing what you don't want in the image                        |
| `enable_safety_checker` | `boolean` | `true`  | Enable content safety filtering                                         |
| `image`                 | `string`  | -       | Input image: URL or base64 data URI (required for Flux Kontext models)  |
| `num_inference_steps`   | `number`  | Auto    | Number of denoising steps (Flux: 4 for schnell, 28 for others)          |
| `guidance`              | `number`  | Auto    | Guidance scale for prompt adherence (Flux: 7 for schnell, 2 for others) |
| `output_format`         | `string`  | `"png"` | Output image format ("png" or "jpg")                                    |
| `maxPollAttempts`       | `number`  | `60`    | Maximum polling attempts for async generation                           |
| `pollIntervalMillis`    | `number`  | `5000`  | Polling interval in milliseconds (5 seconds)                            |

## Advanced Features

Runpod offers several advanced features to enhance your AI applications:

1. **Multiple Model Families**: Access to both language models (LLMs) and cutting-edge image generation models.

2. **OpenAI Compatibility**: Language models support full OpenAI API features including function calling and structured output.

3. **Custom Endpoint Support**: Use with vLLM, SGLang, or any OpenAI-compatible server.

4. **Advanced Image Controls**: Fine-tune image generation with parameters like inference steps, guidance scale, and output format.

5. **Context-Aware Generation**: Transform existing images with Flux Kontext models using URL or base64 inputs.

6. **Automatic Polling**: Seamless handling of both synchronous and asynchronous image generation.

7. **Strict Validation**: Clear error messages for unsupported parameters to prevent confusion.

## Links

- [Runpod](https://runpod.io) - Cloud platform for AI compute
- [Runpod Public Endpoints Documentation](https://docs.runpod.io/hub/public-endpoints)
- [AI SDK Documentation](https://ai-sdk.dev/docs)
- [GitHub Repository](https://github.com/runpod/ai-sdk-provider)
