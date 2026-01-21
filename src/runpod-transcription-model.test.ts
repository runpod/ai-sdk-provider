import { RunpodTranscriptionModel } from './runpod-transcription-model';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

describe('RunpodTranscriptionModel', () => {
  const mockHeaders = () => ({ Authorization: 'Bearer test-key' });
  const mockDate = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('doGenerate', () => {
    it('should submit job and poll for completion with base64 audio', async () => {
      mockFetch
        // First call: submit job
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-123',
              status: 'IN_QUEUE',
            }),
            { status: 200, headers: { 'x-request-id': 'req-123' } }
          )
        )
        // Second call: poll status - completed
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-123',
              status: 'COMPLETED',
              output: {
                result: 'Hello, this is a test transcription.',
                segments: [
                  { text: 'Hello, this is a test transcription.', start: 0, end: 2.5 },
                ],
                language: 'en',
                duration: 2.5,
              },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      const result = await model.doGenerate({
        audio: new Uint8Array([1, 2, 3, 4]),
        mediaType: 'audio/wav',
      });

      expect(result.text).toBe('Hello, this is a test transcription.');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual({
        text: 'Hello, this is a test transcription.',
        startSecond: 0,
        endSecond: 2.5,
      });
      expect(result.language).toBe('en');
      expect(result.durationInSeconds).toBe(2.5);

      // Verify job submission
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/whisper-v3-large/run'
      );
      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input).toHaveProperty('audio_base64');
    });

    it('should use audio URL when provided via providerOptions', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-456', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-456',
              status: 'COMPLETED',
              output: { result: 'Audio URL transcription', language: 'en' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      const result = await model.doGenerate({
        audio: new Uint8Array([]),
        mediaType: 'audio/wav',
        providerOptions: {
          runpod: {
            audio: 'https://example.com/audio.mp3',
          },
        },
      });

      expect(result.text).toBe('Audio URL transcription');

      // Verify audio URL was used instead of base64
      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.audio).toBe('https://example.com/audio.mp3');
      expect(submitBody.input).not.toHaveProperty('audio_base64');
    });

    it('should pass through Whisper options', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-789', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-789',
              status: 'COMPLETED',
              output: { result: 'Test', language: 'es' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
        providerOptions: {
          runpod: {
            language: 'es',
            prompt: 'This is a test context',
            word_timestamps: true,
            translate: false,
            enable_vad: true,
          },
        },
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.language).toBe('es');
      expect(submitBody.input.initial_prompt).toBe('This is a test context');
      expect(submitBody.input.word_timestamps).toBe(true);
      expect(submitBody.input.translate).toBe(false);
      expect(submitBody.input.enable_vad).toBe(true);
    });

    it('should handle failed transcription', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-fail', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-fail',
              status: 'FAILED',
              error: 'Audio format not supported',
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      await expect(
        model.doGenerate({
          audio: new Uint8Array([1, 2, 3]),
          mediaType: 'audio/wav',
        })
      ).rejects.toThrow('Transcription failed: Audio format not supported');
    });

    it('should poll multiple times until completion', async () => {
      mockFetch
        // Submit
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-poll', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        // Poll 1: IN_PROGRESS
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-poll', status: 'IN_PROGRESS' }),
            { status: 200 }
          )
        )
        // Poll 2: IN_PROGRESS
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-poll', status: 'IN_PROGRESS' }),
            { status: 200 }
          )
        )
        // Poll 3: COMPLETED
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-poll',
              status: 'COMPLETED',
              output: { result: 'Finally done!' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      const result = await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
        providerOptions: {
          runpod: {
            pollIntervalMillis: 10, // Speed up test
          },
        },
      });

      expect(result.text).toBe('Finally done!');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 submit + 3 polls
    });

    it('should handle text field in output (alternative format)', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-text', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-text',
              status: 'COMPLETED',
              output: { text: 'Using text field instead of result' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      const result = await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
      });

      expect(result.text).toBe('Using text field instead of result');
    });

    it('should include jobId in providerMetadata', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-metadata', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-metadata',
              status: 'COMPLETED',
              output: { result: 'Test' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      const result = await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
      });

      expect(result.providerMetadata?.runpod?.jobId).toBe('job-metadata');
    });
  });

  describe('model properties', () => {
    it('should have correct specificationVersion', () => {
      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
      });

      expect(model.specificationVersion).toBe('v3');
    });

    it('should have correct provider', () => {
      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
      });

      expect(model.provider).toBe('runpod.transcription');
    });

    it('should have correct modelId', () => {
      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
      });

      expect(model.modelId).toBe('pruna/whisper-v3-large');
    });
  });

  describe('URL handling', () => {
    it('should use /run endpoint by default', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-url', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-url',
              status: 'COMPLETED',
              output: { result: 'Test' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/whisper-v3-large/run'
      );
    });

    it('should use provided /run URL as-is', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-run', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-run',
              status: 'COMPLETED',
              output: { result: 'Test' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodTranscriptionModel('pruna/whisper-v3-large', {
        provider: 'runpod.transcription',
        baseURL: 'https://api.runpod.ai/v2/whisper-v3-large/run',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: {
          currentDate: () => mockDate,
        },
      });

      await model.doGenerate({
        audio: new Uint8Array([1, 2, 3]),
        mediaType: 'audio/wav',
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/whisper-v3-large/run'
      );
    });
  });
});
