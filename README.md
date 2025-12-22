# Runpod AI SDK Provider

The **Runpod provider** for the [AI SDK](https://ai-sdk.dev/docs) contains language model and image generation support for [Runpod's](https://runpod.io) public endpoints.

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
  You can obtain your api key from the [Runpod Console](https://console.runpod.io/user/settings) under "API Keys".

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

## Language Models

You can create language models using the provider instance. The first argument is the model ID:

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: runpod('qwen/qwen3-32b-awq'),
  prompt: 'What is the capital of Germany?',
});
```

**Returns:**

- `text` - Generated text string
- `finishReason` - Why generation stopped ('stop', 'length', etc.)
- `usage` - Token usage information (prompt, completion, total tokens)

### Streaming

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { streamText } from 'ai';

const { textStream } = await streamText({
  model: runpod('qwen/qwen3-32b-awq'),
  prompt:
    'Write a short poem about artificial intelligence in exactly 4 lines.',
  temperature: 0.7,
});

for await (const delta of textStream) {
  process.stdout.write(delta);
}
```

### Model Capabilities

| Model ID                          | Description                                                         | Streaming | Object Generation | Tool Usage | Reasoning Notes           |
| --------------------------------- | ------------------------------------------------------------------- | --------- | ----------------- | ---------- | ------------------------- |
| `qwen/qwen3-32b-awq`              | 32B parameter multilingual model with strong reasoning capabilities | ✅        | ❌                | ✅         | Standard reasoning events |
| `openai/gpt-oss-120b`             | 120B parameter open-source GPT model                                | ✅        | ❌                | ✅         | Standard reasoning events |
| `deepcogito/cogito-671b-v2.1-fp8` | 671B parameter Cogito model with FP8 quantization                   | ✅        | ❌                | ✅         | Standard reasoning events |

**Note:** This list is not complete. For a full list of all available models, see the [Runpod Public Endpoint Reference](https://docs.runpod.io/hub/public-endpoint-reference).

### Chat Conversations

```ts
const { text } = await generateText({
  model: runpod('qwen/qwen3-32b-awq'),
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' },
  ],
});
```

### Tool Calling

```ts
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text, toolCalls } = await generateText({
  model: runpod('openai/gpt-oss-120b'),
  prompt: 'What is the weather like in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get weather information for a city',
      inputSchema: z.object({
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

### Structured output

Using `generateObject` to enforce structured ouput is not supported by two models that are part of this provider.

You can still return structured data by instructing the model to return JSON and validating it yourself.

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateText } from 'ai';
import { z } from 'zod';

const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

const { text } = await generateText({
  model: runpod('qwen/qwen3-32b-awq'),
  messages: [
    {
      role: 'system',
      content:
        'return ONLY valid JSON matching { name: string; ingredients: string[]; steps: string[] }',
    },
    { role: 'user', content: 'generate a lasagna recipe.' },
  ],
  temperature: 0,
});

const parsed = JSON.parse(text);
const result = RecipeSchema.safeParse(parsed);

if (!result.success) {
  // handle invalid JSON shape
}

console.log(result.success ? result.data : parsed);
```

## Image Models

You can create Runpod image models using the `.imageModel()` factory method.

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

| Model ID                               | Type |
| -------------------------------------- | ---- |
| `bytedance/seedream-3.0`               | t2i  |
| `bytedance/seedream-4.0`               | t2i  |
| `bytedance/seedream-4.0-edit`          | edit |
| `black-forest-labs/flux-1-schnell`     | t2i  |
| `black-forest-labs/flux-1-dev`         | t2i  |
| `black-forest-labs/flux-1-kontext-dev` | edit |
| `qwen/qwen-image`                      | t2i  |
| `qwen/qwen-image-edit`                 | edit |
| `nano-banana-edit`                     | edit |
| `google/nano-banana-pro-edit`          | edit |
| `pruna/p-image-t2i`                    | t2i  |
| `pruna/p-image-edit`                   | edit |

For the full list of models, see the [Runpod Public Endpoint Reference](https://docs.runpod.io/hub/public-endpoint-reference).

### Pruna Models

Supported models: `pruna/p-image-t2i`, `pruna/p-image-edit`

| Parameter                                 | Supported Values                                  | Notes                                                 |
| :---------------------------------------- | :------------------------------------------------ | :---------------------------------------------------- |
| `aspectRatio`                             | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3` | Standard AI SDK parameter                             |
| `aspectRatio` (t2i only)                  | `custom`                                          | Requires `width` & `height` in providerOptions        |
| `providerOptions.runpod.width` / `height` | `256` - `1440`                                    | Custom dimensions (t2i only). Must be multiple of 16. |
| `providerOptions.runpod.images`           | `string[]`                                        | Required for `p-image-edit`. Supports 1-5 images.     |

**Example: Custom Resolution (t2i)**

```ts
const { image } = await generateImage({
  model: runpod.imageModel('pruna/p-image-t2i'),
  prompt: 'A robot',
  providerOptions: {
    runpod: {
      aspect_ratio: 'custom',
      width: 512,
      height: 768,
    },
  },
});
```

### Google Models

#### Nano Banana Pro

Supported model: `google/nano-banana-pro-edit`

| Parameter                       | Supported Values                                                  | Notes                             |
| :------------------------------ | :---------------------------------------------------------------- | :-------------------------------- |
| `aspectRatio`                   | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `9:21` | Standard AI SDK parameter         |
| `resolution`                    | `1k`, `2k`, `4k`                                                  | Output resolution quality         |
| `output_format`                 | `jpeg`, `png`, `webp`                                             | Output image format               |
| `providerOptions.runpod.images` | `string[]`                                                        | Required. Input image(s) to edit. |

### Other Models

Most other models (Flux, Seedream, Qwen, etc.) support standard `1:1`, `4:3`, and `3:4` aspect ratios.

- **Flux models**: Support `num_inference_steps` and `guidance` settings.
- **Edit models**: Require an input image via `providerOptions.runpod.image` (single) or `images` (multiple).

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

```ts
// Example: Combine multiple images using Nano Banana edit
const { image } = await generateImage({
  model: runpod.imageModel('nano-banana-edit'),
  prompt:
    'Combine these four images into a single realistic 3D character scene.',
  // Defaults to 1:1; you can also set size: '1328x1328' or aspectRatio: '4:3'
  providerOptions: {
    runpod: {
      images: [
        'https://image.runpod.ai/uploads/0bz_xzhuLq/a2166199-5bd5-496b-b9ab-a8bae3f73bdc.jpg',
        'https://image.runpod.ai/uploads/Yw86rhY6xi/2ff8435f-f416-4096-9a4d-2f8c838b2d53.jpg',
        'https://image.runpod.ai/uploads/bpCCX9zLY8/3bc27605-6f9a-40ad-83e9-c29bed45fed9.jpg',
        'https://image.runpod.ai/uploads/LPHEY6pyHp/f950ceb8-fafa-4800-bdf1-fd3fd684d843.jpg',
      ],
      enable_safety_checker: true,
    },
  },
});
```

Check out our [examples](https://github.com/runpod/examples/tree/main/ai-sdk/getting-started) for more code snippets on how to use all the different models.

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

Use `providerOptions.runpod` for model-specific parameters:

| Option                   | Type       | Default | Description                                     |
| ------------------------ | ---------- | ------- | ----------------------------------------------- |
| `negative_prompt`        | `string`   | `""`    | What to avoid in the image                      |
| `enable_safety_checker`  | `boolean`  | `true`  | Content safety filtering                        |
| `disable_safety_checker` | `boolean`  | `false` | Disable safety checker (Pruna)                  |
| `image`                  | `string`   | -       | Input image URL or base64 (Flux Kontext)        |
| `images`                 | `string[]` | -       | Multiple input images (edit models)             |
| `resolution`             | `string`   | `"1k"`  | Output resolution: 1k, 2k, 4k (Nano Banana Pro) |
| `width` / `height`       | `number`   | -       | Custom dimensions (Pruna t2i, 256-1440)         |
| `num_inference_steps`    | `number`   | Auto    | Denoising steps                                 |
| `guidance`               | `number`   | Auto    | Prompt adherence strength                       |
| `output_format`          | `string`   | `"png"` | Output format: png, jpg, jpeg, webp             |
| `maxPollAttempts`        | `number`   | `60`    | Max polling attempts                            |
| `pollIntervalMillis`     | `number`   | `5000`  | Polling interval (ms)                           |

## Speech

You can generate speech using the AI SDK's `experimental_generateSpeech` and a Runpod speech model created via `runpod.speechModel()` (or the shorthand `runpod.speech()`).

### Basic Usage

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { experimental_generateSpeech as generateSpeech } from 'ai';

const result = await generateSpeech({
  model: runpod.speechModel('resembleai/chatterbox-turbo'),
  text: 'Hello from Runpod.',
});

// Save to filesystem:
import { writeFileSync } from 'fs';
writeFileSync('speech.wav', result.audio.uint8Array);
```

**Returns:**

- `result.audio` (`GeneratedAudioFile`)
  - `result.audio.uint8Array` (binary audio)
  - `result.audio.base64` (base64-encoded audio)
  - `result.audio.mediaType` (e.g. `audio/wav`)
  - `result.audio.format` (e.g. `wav`)
- `result.warnings` (e.g. unsupported parameters)
- `result.responses` (telemetry/debug metadata)
- `result.providerMetadata.runpod`
  - `audioUrl` (public URL to the generated audio)
  - `cost` (if available)

### Supported Models

- `resembleai/chatterbox-turbo`

### `resembleai/chatterbox-turbo`

#### Parameters

| Parameter | Type     | Default  | Description                              |
| --------- | -------- | -------- | ---------------------------------------- |
| `text`    | `string` | -        | Required. The text to convert to speech. |
| `voice`   | `string` | `"lucy"` | Built-in voice name (see list below).    |

#### Provider Options

Use `providerOptions.runpod` for model-specific parameters:

| Option      | Type     | Default | Description                                 |
| ----------- | -------- | ------- | ------------------------------------------- |
| `voice_url` | `string` | -       | URL to audio file (5–10s) for voice cloning |
| `voiceUrl`  | `string` | -       | Alias for `voice_url`                       |

> Note: If `voice_url` is provided, the built-in `voice` is ignored.
>
> Note: This speech endpoint currently returns WAV only; `outputFormat` is ignored.

#### Voices

`voice` selects one of the built-in voices (default: `lucy`):

```ts
[
  'aaron',
  'abigail',
  'anaya',
  'andy',
  'archer',
  'brian',
  'chloe',
  'dylan',
  'emmanuel',
  'ethan',
  'evelyn',
  'gavin',
  'gordon',
  'ivan',
  'laura',
  'lucy',
  'madison',
  'marisol',
  'meera',
  'walter',
];
```

#### Voice cloning (via URL)

Use `providerOptions.runpod.voice_url` (or `voiceUrl`) to clone a voice from a short reference audio (5–10s):

```ts
const result = await generateSpeech({
  model: runpod.speech('resembleai/chatterbox-turbo'),
  text: 'Hello!',
  providerOptions: {
    runpod: {
      voice_url: 'https://example.com/voice.wav',
    },
  },
});
```

#### Paralinguistic Tags

Include these tags inline with your text to trigger realistic vocal expressions:

| Tag              | Effect          |
| ---------------- | --------------- |
| `[clear throat]` | Throat clearing |
| `[sigh]`         | Sighing         |
| `[sush]`         | Shushing        |
| `[cough]`        | Coughing        |
| `[groan]`        | Groaning        |
| `[sniff]`        | Sniffing        |
| `[gasp]`         | Gasping         |
| `[chuckle]`      | Chuckling       |
| `[laugh]`        | Laughing        |

```ts
const result = await generateSpeech({
  model: runpod.speech('resembleai/chatterbox-turbo'),
  text: `[sigh] I can't believe it worked! [laugh] This is amazing.`,
  voice: 'lucy',
});
```

## About Runpod

[Runpod](https://runpod.io) is the foundation for developers to build, deploy, and scale custom AI systems.

Beyond some of the public endpoints you've seen above (+ more generative media APIs), Runpod offers private [serverless endpoints](https://docs.runpod.io/serverless/overview) / [pods](https://docs.runpod.io/pods/overview) / [instant clusters](https://docs.runpod.io/instant-clusters), so that you can train, fine-tune or run any open-source or private model on your terms.
