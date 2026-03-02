'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = {
        role: 'system',
        content: `You are Bono, the AI assistant for RacingPoint eSports and Cafe admin dashboard. Help admins with questions about bookings, customers, revenue, leaderboard, inventory, and business operations. Be concise and helpful.`,
      };

      const chatMessages = [
        systemPrompt,
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input.trim() },
      ];

      const data = await api.chat(chatMessages);
      const assistantMsg: Message = { role: 'assistant', content: data.reply || 'Sorry, I could not process that.' };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service unavailable. Make sure Ollama is running.' }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-rp-grey py-16">
            <p className="text-lg mb-2">Hey, I am Bono!</p>
            <p className="text-sm">Ask me anything about RacingPoint — bookings, customers, leaderboards, inventory...</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
              m.role === 'user'
                ? 'bg-rp-red/10 text-red-100 border border-rp-red/20'
                : 'bg-rp-card border border-rp-border'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-rp-card border border-rp-border rounded-xl px-4 py-3 text-sm text-rp-grey">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Bono something..."
          className="flex-1 bg-rp-card border border-rp-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-rp-red"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-rp-red hover:bg-rp-red disabled:bg-rp-card disabled:text-rp-grey rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
