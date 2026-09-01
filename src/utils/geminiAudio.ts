import { getApiUrl, fetchWithFailover } from './format';

/**
 * Converts raw 16-bit linear PCM (base64) samples into Float32Array
 * using explicit little-endian byte ordering.
 */
export function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const evenLen = len - (len % 2);
  const bytes = new Uint8Array(evenLen);
  for (let i = 0; i < evenLen; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, evenLen);
  const sampleCount = evenLen / 2;
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const sample16 = dataView.getInt16(i * 2, true);
    float32[i] = sample16 / 32768.0;
  }
  return float32;
}

/**
 * Gemini Native Audio Streaming and Playback Player
 * Provides low-latency, gapless streaming audio playback using Web Audio API
 * and supports instant interruption / barge-in.
 */
export class GeminiAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private abortController: AbortController | null = null;
  private isCurrentlySpeaking: boolean = false;
  private endTimeout: any = null;

  public get isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  private initContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Immediately stops all active audio playback, clears queues,
   * and aborts any active streaming fetch request.
   */
  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources = [];
    this.nextStartTime = 0;
    this.isCurrentlySpeaking = false;
  }

  /**
   * Plays a single base64 PCM chunk gaplessly in the Web Audio context.
   */
  public playPcmChunk(base64Chunk: string, sampleRate = 24000): void {
    if (!base64Chunk) return;
    const ctx = this.initContext();
    const floatData = base64ToFloat32Array(base64Chunk);
    if (floatData.length === 0) return;

    const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
    this.activeSources.push(source);
    this.isCurrentlySpeaking = true;

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
    };
  }

  /**
   * Streams speech from the server-side Gemini native audio model (`gemini-3.1-flash-tts-preview`)
   * and begins audio playback chunk-by-chunk with zero initial lag.
   */
  public async streamSpeech(
    text: string,
    isUrdu: boolean,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    this.stop();
    if (!text || !text.trim()) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const ctx = this.initContext();
      this.nextStartTime = ctx.currentTime;

      const response = await fetchWithFailover('/api/ai/gemini-speech-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          isUrdu,
          voiceName: 'Zephyr',
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Speech stream failed with status: ${response.status}`);
      }

      onStart?.();
      this.isCurrentlySpeaking = true;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const data = JSON.parse(jsonStr);
            if (data.chunk) {
              this.playPcmChunk(data.chunk, data.sampleRate || 24000);
            }
          } catch (_) {
            // Ignore parse errors on partial frames
          }
        }
      }

      // Schedule onEnd callback once all queued chunks have finished playing
      const remainingTime = Math.max(0, (this.nextStartTime - ctx.currentTime) * 1000);
      this.endTimeout = setTimeout(() => {
        this.isCurrentlySpeaking = false;
        onEnd?.();
      }, remainingTime + 80);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Gemini Audio Streaming error:', err);
        // Fallback to single-shot native audio if streaming hit a network error
        try {
          await this.playSingleShotSpeech(text, isUrdu, onStart, onEnd);
        } catch (fallbackErr) {
          console.warn('Gemini single-shot audio failed, falling back to Web SpeechSynthesis:', fallbackErr);
          this.playBrowserSpeechSynthesis(text, isUrdu, onStart, onEnd, onError);
        }
      }
    }
  }

  /**
   * Browser SpeechSynthesis fallback for offline / low-latency voice
   */
  public playBrowserSpeechSynthesis(
    text: string,
    isUrdu: boolean,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onError?.(new Error('SpeechSynthesis not supported'));
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isUrdu ? 'ur-PK' : 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const urduVoice = voices.find((v) => v.lang.startsWith('ur') || v.lang.startsWith('hi'));
      if (urduVoice && isUrdu) {
        utterance.voice = urduVoice;
      }

      utterance.onstart = () => {
        this.isCurrentlySpeaking = true;
        onStart?.();
      };
      utterance.onend = () => {
        this.isCurrentlySpeaking = false;
        onEnd?.();
      };
      utterance.onerror = (e) => {
        this.isCurrentlySpeaking = false;
        onError?.(e);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isCurrentlySpeaking = false;
      onError?.(e);
      onEnd?.();
    }
  }

  /**
   * Non-streaming fallback for single-shot native Gemini audio response.
   */
  public async playSingleShotSpeech(
    text: string,
    isUrdu: boolean,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!text.trim()) return;
    this.stop();

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const ctx = this.initContext();
    const response = await fetchWithFailover('/api/ai/gemini-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        isUrdu,
        voiceName: 'Zephyr',
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error('Gemini Speech request failed');
    }

    const data = await response.json();
    if (data.audioBase64) {
      onStart?.();
      this.playPcmChunk(data.audioBase64, data.sampleRate || 24000);
      const remainingTime = Math.max(0, (this.nextStartTime - ctx.currentTime) * 1000);
      this.endTimeout = setTimeout(() => {
        this.isCurrentlySpeaking = false;
        onEnd?.();
      }, remainingTime + 80);
    } else {
      onEnd?.();
    }
  }
}

export const globalGeminiAudio = new GeminiAudioPlayer();
