export type RunpodVideoModelId =
  | 'pruna/p-video'
  | 'vidu/q3-t2v'
  | 'vidu/q3-i2v'
  | 'kwaivgi/kling-v2.6-std-motion-control'
  | 'kwaivgi/kling-video-o1-r2v'
  | 'kwaivgi/kling-v2.1-i2v-pro'
  | 'alibaba/wan-2.6-t2v'
  | 'alibaba/wan-2.6-i2v'
  | 'alibaba/wan-2.5'
  | 'alibaba/wan-2.2-t2v-720-lora'
  | 'alibaba/wan-2.2-i2v-720'
  | 'alibaba/wan-2.1-i2v-720'
  | 'bytedance/seedance-v1.5-pro-i2v'
  | 'openai/sora-2-pro-i2v'
  | 'openai/sora-2-i2v'
  | (string & {});

export interface RunpodVideoProviderOptions {
  /**
   * Negative prompt to guide what to avoid in the generated video.
   */
  negative_prompt?: string;

  /**
   * Style preset for video generation (model-specific).
   */
  style?: string;

  /**
   * Guidance scale for prompt adherence.
   */
  guidance_scale?: number;

  /**
   * Number of inference steps.
   */
  num_inference_steps?: number;

  /**
   * Maximum number of polling attempts before timing out.
   * @default 120
   */
  maxPollAttempts?: number;

  /**
   * Interval between polling attempts in milliseconds.
   * @default 5000
   */
  pollIntervalMillis?: number;

  /**
   * Additional model-specific parameters are passed through via
   * index signature.
   */
  [key: string]: unknown;
}
