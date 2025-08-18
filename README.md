# Runpod AI SDK Provider

The **Runpod provider** for the [AI SDK](https://ai-sdk.dev/docs) contains language model support for [Runpod's](https://runpod.io) public endpoints.

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

| Model ID                               | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `deep-cogito/deep-cogito-v2-llama-70b` | 70B parameter general-purpose LLM with advanced reasoning           |
| `qwen/qwen3-32b-awq`                   | 32B parameter multilingual model with strong reasoning capabilities |

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

## Links

- [Runpod](https://runpod.io) - Cloud platform for AI compute
- [Runpod Public Endpoints Documentation](https://docs.runpod.io/hub/public-endpoints)
- [AI SDK Documentation](https://ai-sdk.dev/docs)
- [GitHub Repository](https://github.com/runpod/ai-sdk-provider)
