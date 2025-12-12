/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunpodSpeechModel } from './runpod-speech-model';

const mockFetch = vi.fn();

describe('RunpodSpeechModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call runsync and download audio bytes', async () => {
    const model = new RunpodSpeechModel('uhyz0hnkemrk6r', {
      provider: 'runpod.speech',
      baseURL: 'https://api.runpod.ai/v2/uhyz0hnkemrk6r',
      headers: () => ({ Authorization: 'Bearer test-key' }),
      fetch: mockFetch,
    });

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'COMPLETED',
            output: {
              audio_url: 'https://example.com/audio.wav',
              cost: 0,
            },
          }),
          { status: 200, headers: { 'x-request-id': 'abc' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: { 'content-type': 'audio/wav' },
        })
      );

    const result = await model.doGenerate({
      text: 'Hello',
      voice: 'lucy',
      outputFormat: 'wav',
      providerOptions: {},
      headers: {},
      abortSignal: undefined,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.runpod.ai/v2/uhyz0hnkemrk6r/runsync'
    );
    expect(mockFetch.mock.calls[1][0]).toBe('https://example.com/audio.wav');

    expect(result.audio).toBeInstanceOf(Uint8Array);
    expect(Array.from(result.audio as Uint8Array)).toEqual([1, 2, 3, 4]);
    expect(result.warnings).toEqual([]);
  });

  it('should support providerOptions.runpod.voice_url', async () => {
    const model = new RunpodSpeechModel('uhyz0hnkemrk6r', {
      provider: 'runpod.speech',
      baseURL: 'https://api.runpod.ai/v2/uhyz0hnkemrk6r',
      headers: () => ({ Authorization: 'Bearer test-key' }),
      fetch: mockFetch,
    });

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: {
              audio_url: 'https://example.com/audio.wav',
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200 }));

    const result = await model.doGenerate({
      text: 'Hello',
      voice: 'lucy',
      providerOptions: { runpod: { voice_url: 'https://example.com/voice.wav' } },
      headers: {},
      abortSignal: undefined,
    } as any);

    const body = JSON.parse(result.request!.body as string);
    expect(body).toEqual({
      input: {
        prompt: 'Hello',
        voice_url: 'https://example.com/voice.wav',
      },
    });
  });

  it('should warn on unsupported outputFormat', async () => {
    const model = new RunpodSpeechModel('uhyz0hnkemrk6r', {
      provider: 'runpod.speech',
      baseURL: 'https://api.runpod.ai/v2/uhyz0hnkemrk6r',
      headers: () => ({ Authorization: 'Bearer test-key' }),
      fetch: mockFetch,
    });

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: { audio_url: 'https://example.com/audio.wav' },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200 }));

    const result = await model.doGenerate({
      text: 'Hello',
      outputFormat: 'mp3',
      providerOptions: {},
      headers: {},
      abortSignal: undefined,
    } as any);

    expect(result.warnings).toEqual([
      expect.objectContaining({
        type: 'unsupported-setting',
        setting: 'outputFormat',
      }),
    ]);
  });
});

