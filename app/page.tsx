'use client';

import { useState, useRef } from 'react';

export default function ClaudeCodeGUI() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-3-5-sonnet-20241022');
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || !apiKey.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model,
          messages: [...messages, userMessage],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                fullContent += parsed.text;
                setStreamingContent(fullContent);
              }
            } catch (parseError) {
              // Skip non-JSON lines
            }
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
      setStreamingContent('');
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`
      }]);
      setStreamingContent('');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧠 Claude Code GUI</h1>
        
        <div className="mb-4 space-y-2">
          <input
            type="password"
            placeholder="Anthropic API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded border border-gray-700"
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded border border-gray-700"
          >
            <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
          </select>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            <p className="text-gray-400">Skriv ett meddelande för att börja...</p>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
                  <div className="font-bold mb-1">
                    {msg.role === 'user' ? 'Du' : 'Claude'}:
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {streamingContent && (
                <div className="mb-4 text-green-300">
                  <div className="font-bold mb-1">Claude:</div>
                  <div className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">▋</span></div>
                </div>
              )}
            </>
          )}
          {loading && !streamingContent && <div className="text-gray-400">🤔 Tänker...</div>}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Skriv ditt meddelande..."
            className="flex-1 p-2 bg-gray-800 rounded border border-gray-700"
            disabled={loading || !apiKey}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !apiKey || !input.trim()}
            className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skicka
          </button>
        </div>
      </div>
    </div>
  );
}
