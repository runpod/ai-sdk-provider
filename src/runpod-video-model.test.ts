import { RunpodVideoModel } from './runpod-video-model';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

describe('RunpodVideoModel', () => {
  const mockHeaders = () => ({ Authorization: 'Bearer test-key' });
  const mockDate = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('model properties', () => {
    it('should have correct specificationVersion', () => {
      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
      });

      expect(model.specificationVersion).toBe('v3');
    });

    it('should have correct provider', () => {
      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
      });

      expect(model.provider).toBe('runpod.video');
    });

    it('should have correct modelId', () => {
      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
      });

      expect(model.modelId).toBe('alibaba/wan-2.6-t2v');
    });

    it('should have maxVideosPerCall of 1', () => {
      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
      });

      expect(model.maxVideosPerCall).toBe(1);
    });
  });

  describe('doGenerate', () => {
    it('should submit job and poll for completion with prompt', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-123', status: 'IN_QUEUE' }), {
            status: 200,
            headers: { 'x-request-id': 'req-123' },
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-123',
              status: 'COMPLETED',
              output: {
                video_url: 'https://cdn.runpod.ai/videos/job-123.mp4',
              },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'A cat walking on a beach',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]).toEqual({
        type: 'url',
        url: 'https://cdn.runpod.ai/videos/job-123.mp4',
        mediaType: 'video/mp4',
      });

      // Verify job submission
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/wan-2-6-t2v/run'
      );
      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.prompt).toBe('A cat walking on a beach');
    });

    it('should map duration, fps, and seed parameters', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-params', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-params',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/params.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: 5,
        fps: 24,
        seed: 42,
        image: undefined,
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.duration).toBe(5);
      expect(submitBody.input.fps).toBe(24);
      expect(submitBody.input.seed).toBe(42);
    });

    it('should convert resolution to size with * separator', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-res', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-res',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/res.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: '1280x720',
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.size).toBe('1280*720');
      expect(submitBody.input.aspect_ratio).toBeUndefined();
    });

    it('should map aspectRatio to aspect_ratio when no resolution', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-ar', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-ar',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/ar.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: '16:9',
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.aspect_ratio).toBe('16:9');
      expect(submitBody.input.size).toBeUndefined();
    });

    it('should convert URL image file to URL string', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-img-url', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-img-url',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/i2v.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-i2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-i2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Animate this image',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: {
          type: 'url',
          url: 'https://example.com/image.png',
        },
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.image).toBe('https://example.com/image.png');
    });

    it('should convert base64 file data to data URL', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-img-b64', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-img-b64',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/i2v-b64.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-i2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-i2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Animate this image',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: {
          type: 'file',
          mediaType: 'image/png',
          data: 'aGVsbG8=', // base64 string
        },
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.image).toBe('data:image/png;base64,aGVsbG8=');
    });

    it('should convert Uint8Array file data to data URL', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-img-uint8', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-img-uint8',
              status: 'COMPLETED',
              output: {
                video_url: 'https://cdn.runpod.ai/videos/i2v-uint8.mp4',
              },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-i2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-i2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Animate this image',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: {
          type: 'file',
          mediaType: 'image/jpeg',
          data: new Uint8Array([1, 2, 3]),
        },
        providerOptions: {},
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.image).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should spread providerOptions.runpod into input', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-opts', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-opts',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/opts.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {
          runpod: {
            negative_prompt: 'blurry, low quality',
            guidance_scale: 7.5,
            num_inference_steps: 50,
          },
        },
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.negative_prompt).toBe('blurry, low quality');
      expect(submitBody.input.guidance_scale).toBe(7.5);
      expect(submitBody.input.num_inference_steps).toBe(50);
    });

    it('should not send polling options to the API', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-poll-opts', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-poll-opts',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/poll.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {
          runpod: {
            maxPollAttempts: 60,
            pollIntervalMillis: 10,
          },
        },
      });

      const submitBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(submitBody.input.maxPollAttempts).toBeUndefined();
      expect(submitBody.input.pollIntervalMillis).toBeUndefined();
    });

    it('should poll multiple times until completion', async () => {
      mockFetch
        // Submit
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-poll', status: 'IN_QUEUE' }), {
            status: 200,
          })
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
              output: { video_url: 'https://cdn.runpod.ai/videos/poll.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {
          runpod: {
            pollIntervalMillis: 10,
          },
        },
      });

      expect(result.videos[0].url).toBe(
        'https://cdn.runpod.ai/videos/poll.mp4'
      );
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 submit + 3 polls
    });

    it('should handle FAILED status with error message', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-fail', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-fail',
              status: 'FAILED',
              error: 'GPU out of memory',
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await expect(
        model.doGenerate({
          prompt: 'Test video',
          n: 1,
          aspectRatio: undefined,
          resolution: undefined,
          duration: undefined,
          fps: undefined,
          seed: undefined,
          image: undefined,
          providerOptions: {},
        })
      ).rejects.toThrow('Video generation failed: GPU out of memory');
    });

    it('should warn when n > 1', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-n', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-n',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/n.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 3,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'unsupported',
          feature: 'n > 1',
        })
      );
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
              output: { video_url: 'https://cdn.runpod.ai/videos/meta.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.providerMetadata?.runpod?.jobId).toBe('job-metadata');
    });

    it('should extract video URL from output.result field', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-result', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-result',
              status: 'COMPLETED',
              output: { result: 'https://cdn.runpod.ai/videos/result.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('pruna/p-video', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/p-video',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.videos[0].url).toBe(
        'https://cdn.runpod.ai/videos/result.mp4'
      );
    });

    it('should extract video URL from output.url field', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 'job-url-field', status: 'IN_QUEUE' }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-url-field',
              status: 'COMPLETED',
              output: { url: 'https://cdn.runpod.ai/videos/url-field.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('vidu/q3-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/vidu-q3-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.videos[0].url).toBe(
        'https://cdn.runpod.ai/videos/url-field.mp4'
      );
    });

    it('should extract video URL from string output', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-str', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-str',
              status: 'COMPLETED',
              output: 'https://cdn.runpod.ai/videos/string-output.mp4',
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('openai/sora-2-i2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/sora-2-i2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      const result = await model.doGenerate({
        prompt: 'Test video',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(result.videos[0].url).toBe(
        'https://cdn.runpod.ai/videos/string-output.mp4'
      );
    });
  });

  describe('URL handling', () => {
    it('should use /run endpoint by default', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-url', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-url',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/test.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/wan-2-6-t2v/run'
      );
    });

    it('should use provided /run URL as-is', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'job-run', status: 'IN_QUEUE' }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'job-run',
              status: 'COMPLETED',
              output: { video_url: 'https://cdn.runpod.ai/videos/test.mp4' },
            }),
            { status: 200 }
          )
        );

      const model = new RunpodVideoModel('alibaba/wan-2.6-t2v', {
        provider: 'runpod.video',
        baseURL: 'https://api.runpod.ai/v2/wan-2-6-t2v/run',
        headers: mockHeaders,
        fetch: mockFetch,
        _internal: { currentDate: () => mockDate },
      });

      await model.doGenerate({
        prompt: 'Test',
        n: 1,
        aspectRatio: undefined,
        resolution: undefined,
        duration: undefined,
        fps: undefined,
        seed: undefined,
        image: undefined,
        providerOptions: {},
      });

      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.runpod.ai/v2/wan-2-6-t2v/run'
      );
    });
  });
});
