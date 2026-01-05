# Runpod AI SDK Provider

![Runpod AI SDK Provider banner](https://image.runpod.ai/runpod/ai-sdk-provider/banner.jpg)

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

### Examples

Check out our [examples](https://github.com/runpod/examples/tree/main/ai-sdk/getting-started) for more code snippets on how to use all the different models.

### Supported Models

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

With image models you can:

- **Text-to-image**: generate a new image from a text prompt.
- **Edit image**: transform an existing image by providing reference image(s).

All examples use the AI SDK's `generateImage` and `runpod.image(modelId)`.

### Text-to-Image

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateImage } from 'ai';
import { writeFileSync } from 'fs';

const { image } = await generateImage({
  model: runpod.image('pruna/p-image-t2i'),
  prompt: 'A serene mountain landscape at sunset',
  aspectRatio: '4:3',
});

writeFileSync('image.png', image.uint8Array);
```

**Returns:**

- `image.uint8Array` - Binary image data (efficient for processing/saving)
- `image.base64` - Base64 encoded string (for web display)
- `image.mediaType` - MIME type ('image/jpeg' or 'image/png')
- `warnings` - Array of any warnings about unsupported parameters

### Edit Image

For editing, pass reference images via `prompt.images` (recommended). The AI SDK normalizes `prompt.images` into `files` for the provider call.

#### Single reference image (1 input image)

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateImage } from 'ai';

const { image } = await generateImage({
  model: runpod.image('pruna/p-image-edit'),
  prompt: {
    text: 'Virtual staging: add modern Scandinavian furniture: a gray sofa, wooden coffee table, potted plants, and warm lighting',
    images: ['https://image.runpod.ai/demo/empty-room.png'],
  },
  aspectRatio: '16:9',
});
```

#### Multiple reference images (4 input images)

Note: Prior to v1.0.0, images were passed via `providerOptions.runpod.image` / `providerOptions.runpod.images`. This still works but `prompt.images` is now recommended.

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateImage } from 'ai';

const { image } = await generateImage({
  model: runpod.image('google/nano-banana-pro-edit'),
  prompt: {
    text: 'Combine these four robot musicians into an epic band photo on a concert stage with dramatic lighting',
    images: [
      'https://image.runpod.ai/demo/robot-drummer.png',
      'https://image.runpod.ai/demo/robot-guitarist.png',
      'https://image.runpod.ai/demo/robot-bassist.png',
      'https://image.runpod.ai/demo/robot-singer.png',
    ],
  },
});
```

### Examples

Check out our [examples](https://github.com/runpod/examples/tree/main/ai-sdk/getting-started) for more code snippets on how to use all the different models.

### Supported Models

| Model ID                               | Type | Max Resolution |
| -------------------------------------- | ---- | -------------- |
| `alibaba/wan-2.6`                      | t2i  | 1024x1024      |
| `pruna/p-image-t2i`                    | t2i  | 1440x1440      |
| `pruna/p-image-edit`                   | edit | 1440x1440      |
| `google/nano-banana-pro-edit`          | edit | 4k             |
| `bytedance/seedream-3.0`               | t2i  | 4096x4096      |
| `bytedance/seedream-4.0`               | t2i  | 4096x4096      |
| `bytedance/seedream-4.0-edit`          | edit | 4096x4096      |
| `qwen/qwen-image`                      | t2i  | 4096x4096      |
| `qwen/qwen-image-edit`                 | edit | 4096x4096      |
| `qwen/qwen-image-edit-2511`            | edit | 1536x1536      |
| `nano-banana-edit`                     | edit | -              |
| `black-forest-labs/flux-1-schnell`     | t2i  | 2048x2048      |
| `black-forest-labs/flux-1-dev`         | t2i  | 2048x2048      |
| `black-forest-labs/flux-1-kontext-dev` | edit | 2048x2048      |

For the full list of models, see the [Runpod Public Endpoint Reference](https://docs.runpod.io/hub/public-endpoint-reference).

### Provider Options

Additional options through `providerOptions.runpod` (supported options depend on the model):

| Option                   | Type       | Default | Description                                                 |
| ------------------------ | ---------- | ------- | ----------------------------------------------------------- |
| `negative_prompt`        | `string`   | `""`    | What to avoid in the image (model-dependent)                |
| `enable_safety_checker`  | `boolean`  | `true`  | Content safety filtering (model-dependent)                  |
| `disable_safety_checker` | `boolean`  | `false` | Disable safety checker (Pruna)                              |
| `aspect_ratio`           | `string`   | -       | Model-specific aspect ratio (Pruna: supports `custom`)      |
| `image`                  | `string`   | -       | Legacy: Single input image URL/base64 (use `prompt.images`) |
| `images`                 | `string[]` | -       | Legacy: Multiple input images (use `prompt.images`)         |
| `resolution`             | `string`   | `"1k"`  | Output resolution: 1k, 2k, 4k (Nano Banana Pro)             |
| `width` / `height`       | `number`   | -       | Custom dimensions (Pruna t2i, 256-1440; multiples of 16)    |
| `num_inference_steps`    | `number`   | Auto    | Denoising steps (model-dependent)                           |
| `guidance`               | `number`   | Auto    | Prompt adherence strength (model-dependent)                 |
| `output_format`          | `string`   | `"png"` | Output format: png, jpg, jpeg, webp (model-dependent)       |
| `maxPollAttempts`        | `number`   | `60`    | Max polling attempts                                        |
| `pollIntervalMillis`     | `number`   | `5000`  | Polling interval (ms)                                       |

**Example (providerOptions):**

```ts
const { image } = await generateImage({
  model: runpod.image('bytedance/seedream-3.0'),
  prompt: 'A sunset over mountains',
  size: '1328x1328',
  seed: 42,
  providerOptions: {
    runpod: {
      negative_prompt: 'blurry, low quality',
      enable_safety_checker: true,
      maxPollAttempts: 30,
      pollIntervalMillis: 4000,
    },
  },
});
```

### Model-specific Notes

#### Pruna (p-image)

Supported models: `pruna/p-image-t2i`, `pruna/p-image-edit`

- **Text-to-image**: supports standard `aspectRatio` values; for custom dimensions, set `providerOptions.runpod.aspect_ratio = 'custom'` and provide `width`/`height`.
- **Edit image**: supports 1–5 input images via `prompt.images` (recommended) or `files`.

**Example: Custom Dimensions (t2i)**

```ts
const { image } = await generateImage({
  model: runpod.image('pruna/p-image-t2i'),
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

#### Google (Nano Banana Pro)

Supported model: `google/nano-banana-pro-edit`

| Parameter                       | Supported Values                                                  | Notes                                |
| :------------------------------ | :---------------------------------------------------------------- | :----------------------------------- |
| `aspectRatio`                   | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `9:21` | Standard AI SDK parameter            |
| `resolution`                    | `1k`, `2k`, `4k`                                                  | Output resolution quality            |
| `output_format`                 | `jpeg`, `png`, `webp`                                             | Output image format                  |
| `prompt.images`                 | `string[]`                                                        | Recommended. Input image(s) to edit. |
| `files`                         | `ImageModelV3File[]`                                              | Alternative (lower-level).           |
| `providerOptions.runpod.images` | `string[]`                                                        | Legacy. Input image(s) to edit.      |

#### Alibaba (Wan 2.6)

Supported model: `alibaba/wan-2.6`

| Parameter     | Supported Values                               | Notes                     |
| :------------ | :--------------------------------------------- | :------------------------ |
| `size`        | `768x768`, `1024x1024`, `1024x768`, `768x1024` | Max 1024x1024             |
| `aspectRatio` | `1:1`, `4:3`, `3:4`                            | Standard AI SDK parameter |
| `seed`        | `number`                                       | For reproducibility       |

Note: Negative prompts should be included inline in the prompt text (e.g., "A sunset. Negative prompt: blurry, low quality").

#### Qwen (Image Edit 2511)

Supported model: `qwen/qwen-image-edit-2511`

| Parameter         | Supported Values       | Notes                       |
| :---------------- | :--------------------- | :-------------------------- |
| `size`            | Up to `1536x1536`      | Max 1536x1536               |
| `aspectRatio`     | `1:1`, `4:3`, `3:4`    | Standard AI SDK parameter   |
| `seed`            | `number`               | For reproducibility         |
| `prompt.images`   | `string[]`             | 1-3 input images            |
| `output_format`   | `jpeg`, `png`, `webp`  | Default: `jpeg`             |
| `negative_prompt` | `string`               | What to avoid in the output |
| `loras`           | `Array<{path, scale}>` | LoRA adapters (see below)   |

**Example:**

```ts
const { image } = await generateImage({
  model: runpod.image('qwen/qwen-image-edit-2511'),
  prompt: {
    text: 'Transform this into a futuristic neon city scene',
    images: ['https://example.com/input.jpg'],
  },
  size: '1024x1024',
});
```

**Example with LoRA:**

When `loras` is provided, the provider automatically uses the LoRA-enabled endpoint.

```ts
const { image } = await generateImage({
  model: runpod.image('qwen/qwen-image-edit-2511'),
  prompt: {
    text: 'Transform into anime style',
    images: ['https://example.com/input.jpg'],
  },
  size: '1024x1024',
  providerOptions: {
    runpod: {
      loras: [
        {
          path: 'https://huggingface.co/flymy-ai/qwen-image-anime-irl-lora/resolve/main/flymy_anime_irl.safetensors',
          scale: 1,
        },
      ],
    },
  },
});
```

## Speech Models

Generate speech using the AI SDK's `generateSpeech` and `runpod.speech(...)`:

```ts
import { runpod } from '@runpod/ai-sdk-provider';
import { generateSpeech } from 'ai';

const result = await generateSpeech({
  model: runpod.speech('resembleai/chatterbox-turbo'),
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

### Examples

Check out our [examples](https://github.com/runpod/examples/tree/main/ai-sdk/getting-started) for more code snippets on how to use all the different models.

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
