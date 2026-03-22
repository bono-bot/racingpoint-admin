'use client';

import { useState, useRef, useCallback } from 'react';
import { api, type TranscribeResponse, type TranscribeSegment } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const SUPPORTED_EXTS = '.mp3,.wav,.flac,.ogg,.m4a,.mp4,.webm,.mpeg,.mov,.avi,.mkv';

export default function TranscribePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscribeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState('whisper-large-v3-turbo');
  const [language, setLanguage] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.transcribe(file, {
        model,
        language: language || undefined,
      });

      if (data.error) {
        setError(typeof data.details === 'string' ? data.details : data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    }
    setLoading(false);
  };

  const copyText = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file?.name?.replace(/\.[^.]+$/, '') || 'transcript';
    a.download = `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSrt = () => {
    if (!result?.segments) return;
    const srt = result.segments.map((seg, i) => {
      const startH = Math.floor(seg.start / 3600);
      const startM = Math.floor((seg.start % 3600) / 60);
      const startS = seg.start % 60;
      const endH = Math.floor(seg.end / 3600);
      const endM = Math.floor((seg.end % 3600) / 60);
      const endS = seg.end % 60;
      const fmt = (h: number, m: number, s: number) =>
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')},${String(Math.round((s % 1) * 1000)).padStart(3, '0')}`;
      return `${i + 1}\n${fmt(startH, startM, startS)} --> ${fmt(endH, endM, endS)}\n${seg.text.trim()}\n`;
    }).join('\n');

    const blob = new Blob([srt], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file?.name?.replace(/\.[^.]+$/, '') || 'transcript';
    a.download = `${baseName}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transcribe</h1>
          <p className="text-sm text-rp-grey mt-1">Audio & video to text — powered by Groq Whisper</p>
        </div>
      </div>

      {/* Upload area */}
      {!result && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
              dragOver
                ? 'border-rp-red bg-rp-red/5'
                : file
                ? 'border-rp-red/40 bg-rp-card'
                : 'border-rp-border hover:border-neutral-500 bg-rp-card'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept={SUPPORTED_EXTS}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              className="hidden"
            />

            {file ? (
              <div>
                <div className="text-3xl mb-3">
                  {file.type.startsWith('video/') ? '\u25B6' : '\u266B'}
                </div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-rp-grey mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs text-rp-grey mt-2">Click to change file</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl text-rp-grey mb-3">&uarr;</div>
                <p className="font-medium">Drop audio or video file here</p>
                <p className="text-sm text-rp-grey mt-1">
                  Or click to browse. MP3, WAV, FLAC, MP4, MOV, WebM and more.
                </p>
                <p className="text-xs text-rp-grey mt-2">Max 25MB for audio, 100MB for video (audio extracted automatically)</p>
              </div>
            )}
          </div>

          {/* Options row */}
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs text-rp-grey mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              >
                <option value="whisper-large-v3-turbo">Whisper Turbo (fast, $0.04/hr)</option>
                <option value="whisper-large-v3">Whisper v3 (accurate, $0.11/hr)</option>
              </select>
            </div>

            <div className="flex-1 max-w-xs">
              <label className="block text-xs text-rp-grey mb-1">Language (optional)</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              >
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
              </select>
            </div>

            <button
              onClick={handleTranscribe}
              disabled={!file || loading}
              className={cn(
                'px-8 py-2 rounded-lg text-sm font-medium transition-colors',
                file && !loading
                  ? 'bg-rp-red hover:bg-red-700 cursor-pointer'
                  : 'bg-rp-card text-rp-grey cursor-not-allowed'
              )}
            >
              {loading ? 'Transcribing...' : 'Transcribe'}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="bg-rp-card border border-rp-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-rp-red border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-medium">Processing...</p>
                  <p className="text-xs text-rp-grey mt-0.5">
                    {file?.type.startsWith('video/') ? 'Extracting audio from video, then transcribing' : 'Sending to Groq Whisper'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Meta bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-xs">
              <span className="text-rp-grey">File:</span>{' '}
              <span>{result.original_filename}</span>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-xs">
              <span className="text-rp-grey">Duration:</span>{' '}
              <span>{result.duration ? formatDuration(result.duration) : '—'}</span>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-xs">
              <span className="text-rp-grey">Language:</span>{' '}
              <span>{result.language || 'Unknown'}</span>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-lg px-3 py-1.5 text-xs">
              <span className="text-rp-grey">Model:</span>{' '}
              <span>{result.model}</span>
            </div>

            <div className="ml-auto flex gap-2">
              <button
                onClick={copyText}
                className="px-3 py-1.5 bg-rp-card border border-rp-border rounded-lg text-xs hover:border-neutral-500 cursor-pointer transition-colors"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                onClick={downloadText}
                className="px-3 py-1.5 bg-rp-card border border-rp-border rounded-lg text-xs hover:border-neutral-500 cursor-pointer transition-colors"
              >
                Download .txt
              </button>
              {result.segments && result.segments.length > 0 && (
                <button
                  onClick={downloadSrt}
                  className="px-3 py-1.5 bg-rp-card border border-rp-border rounded-lg text-xs hover:border-neutral-500 cursor-pointer transition-colors"
                >
                  Download .srt
                </button>
              )}
              <button
                onClick={() => { setResult(null); setFile(null); }}
                className="px-3 py-1.5 bg-rp-red/10 border border-rp-red/30 text-rp-red rounded-lg text-xs hover:bg-rp-red/20 cursor-pointer transition-colors"
              >
                New transcription
              </button>
            </div>
          </div>

          {/* Full transcript */}
          <div className="bg-rp-card border border-rp-border rounded-xl p-5">
            <h2 className="text-sm font-medium text-rp-grey mb-3">Full Transcript</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.text}</p>
          </div>

          {/* Segments with timestamps */}
          {result.segments && result.segments.length > 0 && (
            <div className="bg-rp-card border border-rp-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-rp-grey mb-3">
                Timestamped Segments ({result.segments.length})
              </h2>
              <div className="space-y-2">
                {result.segments.map((seg: TranscribeSegment) => (
                  <div key={seg.id} className="flex gap-3 group">
                    <span className="text-xs font-mono text-rp-red shrink-0 pt-0.5 w-16 text-right">
                      {formatTimestamp(seg.start)}
                    </span>
                    <p className="text-sm leading-relaxed">{seg.text.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
