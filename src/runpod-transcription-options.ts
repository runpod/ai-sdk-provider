export type RunpodTranscriptionModelId =
  | 'pruna/whisper-v3-large'
  | (string & {});

export interface RunpodTranscriptionProviderOptions {
  /**
   * URL to audio file. Use this if you want to pass an audio URL directly
   * instead of binary audio data.
   */
  audio?: string;

  /**
   * Optional context prompt to guide the transcription (initial_prompt in Whisper).
   */
  prompt?: string;

  /**
   * Alias for prompt - the initial prompt for the first window.
   */
  initial_prompt?: string;

  /**
   * Language of the audio in ISO-639-1 format (e.g., 'en', 'es', 'fr').
   * If not specified, Whisper will auto-detect the language.
   */
  language?: string;

  /**
   * Whether to include word-level timestamps in the response.
   * @default false
   */
  word_timestamps?: boolean;

  /**
   * Whisper model to use.
   * Options: 'tiny', 'base', 'small', 'medium', 'large-v1', 'large-v2', 'large-v3', 'turbo'
   * @default 'base'
   */
  model?: string;

  /**
   * Output format for transcription.
   * Options: 'plain_text', 'formatted_text', 'srt', 'vtt'
   * @default 'plain_text'
   */
  transcription?: string;

  /**
   * Whether to translate the audio to English.
   * @default false
   */
  translate?: boolean;

  /**
   * Whether to enable voice activity detection.
   * @default false
   */
  enable_vad?: boolean;

  /**
   * Maximum number of polling attempts before timing out.
   * @default 120
   */
  maxPollAttempts?: number;

  /**
   * Interval between polling attempts in milliseconds.
   * @default 2000
   */
  pollIntervalMillis?: number;
}
