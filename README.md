# RunPod AI SDK Provider

The **RunPod provider** for the [AI SDK](https://ai-sdk.dev/docs) contains language model support for [RunPod's](https://runpod.io) public endpoints.

## Features

- ✅ **Full OpenAI API Compatibility** - RunPod's LLM endpoints are fully OpenAI API compatible
- ✅ **Chat Completions** - Support for chat-based conversations
- ✅ **Text Completions** - Support for text completion tasks
- ✅ **Streaming** - Real-time response streaming
- ✅ **Function Calling** - Support for tool/function calling
- ✅ **Structured Outputs** - Generate structured JSON responses
- ✅ **TypeScript** - Full TypeScript support with type safety

## Installation

```bash
npm install @runpod/ai-sdk-provider
```

## Setup

The RunPod provider requires a RunPod API key. You can obtain one from the [RunPod console](https://runpod.io).

### Environment Variable

Set your API key as an environment variable:

```bash
export RUNPOD_API_KEY="your-api-key-here"
```

### Provider Instance

Import the default provider instance:

```ts
import { runpod } from "@runpod/ai-sdk-provider";
```

Or create a custom instance with configuration:

```ts
import { createRunPod } from "@runpod/ai-sdk-provider";

const runpod = createRunPod({
  apiKey: "your-api-key", // optional if RUNPOD_API_KEY is set
  headers: {
    "Custom-Header": "value",
  },
});
```

## Supported Models

| Model ID                               | Description                                                         |
| -------------------------------------- | ------------------------------------------------------------------- |
| `deep-cogito/deep-cogito-v2-llama-70b` | 70B parameter general-purpose LLM with advanced reasoning           |
| `qwen/qwen3-32b-awq`                   | 32B parameter multilingual model with strong reasoning capabilities |

## Usage Examples

### Basic Text Generation

```ts
import { runpod } from "@runpod/ai-sdk-provider";
import { generateText } from "ai";

const { text } = await generateText({
  model: runpod("deep-cogito/deep-cogito-v2-llama-70b"),
  prompt: "Write a Python function that sorts a list:",
});

console.log(text);
```

### Streaming

```ts
import { runpod } from "@runpod/ai-sdk-provider";
import { streamText } from "ai";

const { textStream } = await streamText({
  model: runpod("qwen/qwen3-32b-awq"),
  prompt: "Explain quantum computing in simple terms.",
});

for await (const textPart of textStream) {
  process.stdout.write(textPart);
}
```

### Chat Conversations

```ts
import { runpod } from "@runpod/ai-sdk-provider";
import { generateText } from "ai";

const { text } = await generateText({
  model: runpod("deep-cogito/deep-cogito-v2-llama-70b"),
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
  ],
});
```

### Function Calling

```ts
import { runpod } from "@runpod/ai-sdk-provider";
import { generateText, tool } from "ai";
import { z } from "zod";

const { text, toolCalls } = await generateText({
  model: runpod("deep-cogito/deep-cogito-v2-llama-70b"),
  prompt: "What is the weather like in San Francisco?",
  tools: {
    getWeather: tool({
      description: "Get weather information for a city",
      parameters: z.object({
        city: z.string().describe("The city name"),
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
import { runpod } from "@runpod/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

const { object } = await generateObject({
  model: runpod("qwen/qwen3-32b-awq"),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: "Generate a recipe for chocolate chip cookies.",
});

console.log(object.recipe);
```

## Model Methods

The provider supports multiple ways to create models:

```ts
// Default chat model
const model1 = runpod("deep-cogito/deep-cogito-v2-llama-70b");

// Explicit chat model
const model2 = runpod.chatModel("deep-cogito/deep-cogito-v2-llama-70b");

// Language model (alias for chat)
const model3 = runpod.languageModel("qwen/qwen3-32b-awq");

// Completion model
const model4 = runpod.completionModel("deep-cogito/deep-cogito-v2-llama-70b");
```

## Configuration Options

When creating a custom provider instance:

```ts
import { createRunPod } from "@runpod/ai-sdk-provider";

const runpod = createRunPod({
  // API key (optional if RUNPOD_API_KEY environment variable is set)
  apiKey: "your-api-key",

  // Custom headers to include in requests
  headers: {
    "Custom-Header": "value",
  },

  // Custom fetch implementation for testing or middleware
  fetch: customFetch,
});
```

## Error Handling

The provider includes comprehensive error handling:

```ts
import { runpod } from "@runpod/ai-sdk-provider";
import { generateText } from "ai";

try {
  const { text } = await generateText({
    model: runpod("deep-cogito/deep-cogito-v2-llama-70b"),
    prompt: "Hello, world!",
  });
} catch (error) {
  if (error.name === "AI_APICallError") {
    console.error("API call failed:", error.message);
  } else if (error.name === "AI_InvalidArgumentError") {
    console.error("Invalid argument:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## TypeScript Support

The provider includes full TypeScript support:

```ts
import type {
  RunPodProvider,
  RunPodProviderSettings,
  RunPodChatModelId,
  RunPodCompletionModelId,
} from "@runpod/ai-sdk-provider";

// Type-safe model IDs
const modelId: RunPodChatModelId = "deep-cogito/deep-cogito-v2-llama-70b";
```

## API Compatibility

Since RunPod's endpoints are fully OpenAI API compatible, all standard OpenAI features work:

- Chat completions (`/chat/completions`)
- Text completions (`/completions`)
- Streaming responses
- Function/tool calling
- Structured outputs
- All OpenAI-compatible parameters

## Links

- [RunPod](https://runpod.io) - Cloud platform for AI compute
- [RunPod Public Endpoints Documentation](https://docs.runpod.io/hub/public-endpoints)
- [AI SDK Documentation](https://ai-sdk.dev/docs)
- [GitHub Repository](https://github.com/runpod/ai-sdk-provider)

## License

Apache 2.0
