# Runpod AI SDK Provider

The **Runpod provider** for the [AI SDK](https://ai-sdk.dev/docs) contains language model and image generation support for [Runpod's](https://runpod.io) public endpoints.

## Installation

```bash
# npm
npm install @runpod/ai-sdk-provider

# pnpm
pnpm add @runpod/ai-sdk-provider

# yarn
yarn add @runpod/ai-sdk-provider
```

## Setup

The Runpod provider requires a Runpod API key. You can obtain one from the [Runpod console](https://console.runpod.io/user/settings) under "API Keys".

### Environment Variable

Set your API key as an environment variable:

```bash
export RUNPOD_API_KEY="your-api-key-here"
```

### Provider Instance

Import the provider:

```ts
import { runpod } from '@runpod/ai-sdk-provider';
```

## Supported Models

### Language Models

| Model ID                               | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `deep-cogito/deep-cogito-v2-llama-70b` | 70B parameter general-purpose LLM with advanced reasoning           |
| `qwen/qwen3-32b-awq`                   | 32B parameter multilingual model with strong reasoning capabilities |

### Image Models

| Model ID                               | Description                     | Supported Aspect Ratios |
| -------------------------------------- | ------------------------------- | ----------------------- |
| `qwen/qwen-image`                      | Text-to-image generation        | 1:1, 4:3, 3:4           |
| `bytedance/seedream-3.0`               | Advanced text-to-image model    | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-kontext-dev` | Context-aware image generation  | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-schnell`     | Fast image generation (4 steps) | 1:1, 4:3, 3:4           |
| `black-forest-labs/flux-1-dev`         | High-quality image generation   | 1:1, 4:3, 3:4           |

## Usage Examples

### Basic Text Generation

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: runpod('deep-cogito/deep-cogito-v2-llama-70b'),
  prompt: 'Write a Python function that sorts a list:',
});

console.log(text);
```

### Streaming

**Note**: Streaming is not yet supported by Runpod's public endpoints. The team is working on implementing this feature.

### Chat Conversations

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateText } from 'ai';

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
import { runpod } from '@runpod/ai-sdk-provider';
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
        // Your weather API call here
        return `The weather in ${city} is sunny.`;
      },
    }),
  },
});
```

### Structured Output

```ts
import { runpod } from '@runpod/ai-sdk-provider';
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

console.log(object.recipe);
```

### Image Generation

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { experimental_generateImage as generateImage } from 'ai';

const { image } = await generateImage({
  model: runpod.imageModel('qwen/qwen-image'),
  prompt: 'A fashion-forward woman in Paris wearing a trench coat',
  aspectRatio: '4:3',
});

// With additional parameters
const { image } = await generateImage({
  model: runpod.imageModel('qwen/qwen-image'),
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

#### Provider Options

The Runpod provider supports additional options via `providerOptions.runpod`:

| Option                  | Type      | Default | Description                                         |
| ----------------------- | --------- | ------- | --------------------------------------------------- |
| `negative_prompt`       | `string`  | -       | Text describing what you don't want in the image    |
| `enable_safety_checker` | `boolean` | `true`  | Enable content safety filtering                     |
| `image`                 | `string`  | -       | Input image URL (required for Flux Kontext models)  |
| `maxPollAttempts`       | `number`  | `60`    | Maximum polling attempts for async image generation |
| `pollIntervalMillis`    | `number`  | `5000`  | Polling interval in milliseconds (5 seconds)        |

**Notes**:

- The provider uses strict validation for image parameters. Unsupported aspect ratios (like `16:9`, `9:16`, `3:2`, `2:3`) will throw an `InvalidArgumentError` with a clear message about supported alternatives.
- Model availability may vary. Some models might be temporarily unavailable or require specific parameters.
- **Verified working models**: All models tested and confirmed working
  - `qwen/qwen-image` - Original model (60s, JPEG)
  - `bytedance/seedream-3.0` - Fast model (17s, JPEG)
  - `black-forest-labs/flux-1-schnell` - Very fast (2s, PNG)
  - `black-forest-labs/flux-1-dev` - High quality (6s, PNG)
  - `black-forest-labs/flux-1-kontext-dev` - Context-aware with input images (38s, PNG)
- The provider automatically handles different parameter formats:
  - **Qwen/Seedream**: `size` parameter, `result` response field
  - **Flux standard**: `width/height` parameters, `image_url` response field
  - **Flux Kontext**: `size` parameter + `image` input, `image_url` response field

## Links

- [Runpod](https://runpod.io) - Cloud platform for AI compute
- [Runpod Public Endpoints Documentation](https://docs.runpod.io/hub/public-endpoints)
- [AI SDK Documentation](https://ai-sdk.dev/docs)
- [GitHub Repository](https://github.com/runpod/ai-sdk-provider)
