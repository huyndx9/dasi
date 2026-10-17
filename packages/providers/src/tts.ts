export interface TtsProvider {
  /** Returns encoded audio (mp3) for the text. */
  synthesize(input: { text: string; lang: string; voice?: string }): Promise<ArrayBuffer>;
}
