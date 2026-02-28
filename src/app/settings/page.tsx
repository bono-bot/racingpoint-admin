'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [gatewayInfo, setGatewayInfo] = useState<{ timestamp: string } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { setGatewayStatus('online'); setGatewayInfo(d); })
      .catch(() => setGatewayStatus('offline'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* System Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">API Gateway</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                gatewayStatus === 'online' ? 'bg-green-500/10 text-green-400' :
                gatewayStatus === 'offline' ? 'bg-red-500/10 text-red-400' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {gatewayStatus === 'checking' ? 'Checking...' : gatewayStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Gateway URL</span>
              <span className="text-xs font-mono text-zinc-500">{process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'}</span>
            </div>
            {gatewayInfo && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Last checked</span>
                <span className="text-xs text-zinc-500">{new Date(gatewayInfo.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Connected Services</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">WhatsApp Bot</span>
              <span className="text-xs text-zinc-500">via API Gateway (SQLite)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">Discord Bot</span>
              <span className="text-xs text-zinc-500">via API Gateway (SQLite)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">Google Calendar</span>
              <span className="text-xs text-zinc-500">via API Gateway (OAuth)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">Google Sheets (Waivers)</span>
              <span className="text-xs text-zinc-500">via API Gateway (OAuth)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">RaceControl</span>
              <span className="text-xs text-zinc-500">via API Gateway (proxy :8080)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">Ollama AI</span>
              <span className="text-xs text-zinc-500">via API Gateway (proxy :32769)</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-300">Tesseract OCR</span>
              <span className="text-xs text-zinc-500">Local (receipt scanning)</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="space-y-2 text-sm text-zinc-400">
            <p><span className="text-zinc-300">App:</span> RacingPoint Admin Dashboard v2.0</p>
            <p><span className="text-zinc-300">Built by:</span> Bono (AI Assistant)</p>
            <p><span className="text-zinc-300">Stack:</span> Next.js 16 + Tailwind CSS + SQLite</p>
            <p><span className="text-zinc-300">Location:</span> 3rd Floor, Vantage Line Mall, Hyderabad</p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Global search</span>
              <kbd className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">Ctrl + K</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Toggle sidebar</span>
              <kbd className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">Click ◀/▶</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
