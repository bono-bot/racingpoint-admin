import { apiFetch, rcFetch } from './base';

export interface TranscribeSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob: number;
  no_speech_prob: number;
}

export interface TranscribeWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscribeResponse {
  status?: string;
  text?: string;
  duration?: number;
  language?: string;
  model?: string;
  segments?: TranscribeSegment[];
  words?: TranscribeWord[];
  original_filename?: string;
  error?: string;
  details?: unknown;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';
const API_KEY = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || 'rp-gateway-2026-secure-key';

export const opsApi = {
  health: () => apiFetch('/api/health'),
  getRacecontrol: (path: string) => apiFetch(`/api/racecontrol/${path}`),
  chat: (message: string, history: { role: string; content: string }[]) =>
    rcFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }) as Promise<{ reply?: string; model?: string; error?: string }>,
  transcribe: (file: File, options?: { model?: string; language?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(
      `${GATEWAY_URL}/api/transcribe?model=${options?.model || 'whisper-large-v3-turbo'}${options?.language ? `&language=${options.language}` : ''}&response_format=verbose_json&timestamps=word,segment`,
      {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
        body: formData,
      }
    ).then(r => r.json()) as Promise<TranscribeResponse>;
  },
};
