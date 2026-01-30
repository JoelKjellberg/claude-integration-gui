'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkflowMode, MODES, CodexEntry, getModeById } from './types/workflow';
import { getSystemPrompt } from './config/systemPrompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ClaudeCodeGUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [streamingContent, setStreamingContent] = useState('');
  const [currentMode, setCurrentMode] = useState<WorkflowMode>('planning');
  const [showCodex, setShowCodex] = useState(false);
  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load codex entries from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('codex-entries');
    if (saved) {
      try {
        setCodexEntries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load codex entries:', e);
      }
    }
  }, []);

  // Save codex entries to localStorage when changed
  useEffect(() => {
    localStorage.setItem('codex-entries', JSON.stringify(codexEntries));
  }, [codexEntries]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle mode switch commands in input
  const handleModeSwitch = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const switchPatterns = [
      /switch to (\w+) mode/i,
      /(\w+) mode/i,
      /mode[:\s]+(\w+)/i,
    ];

    for (const pattern of switchPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const requestedMode = match[1].toLowerCase();
        const mode = MODES.find(m =>
          m.id === requestedMode ||
          m.name.toLowerCase() === requestedMode
        );
        if (mode) {
          setCurrentMode(mode.id);
          return true;
        }
      }
    }
    return false;
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey.trim()) return;

    // Check for mode switch commands
    if (handleModeSwitch(input)) {
      const mode = getModeById(currentMode);
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: `Switched to **${mode?.name || currentMode}** mode. ${mode?.icon || ''}\n\n${mode?.description || ''}\n\n**What would you like to do?**` }
      ]);
      setInput('');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
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
          mode: currentMode,
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

      // Auto-detect codex entries in response
      if (currentMode === 'codex' && fullContent.includes('[') && fullContent.includes(']')) {
        // Could add automatic codex parsing here
      }
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

  const addCodexEntry = (entry: Omit<CodexEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: CodexEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCodexEntries(prev => [...prev, newEntry]);
  };

  const deleteCodexEntry = (id: string) => {
    setCodexEntries(prev => prev.filter(e => e.id !== id));
  };

  const currentModeConfig = getModeById(currentMode);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Claude Code Architect</h1>
            <span className="text-sm text-gray-400">Hybrid Workflow Edition</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              currentModeConfig?.phase === 'planning'
                ? 'bg-blue-600'
                : 'bg-green-600'
            }`}>
              {currentModeConfig?.phase === 'planning' ? 'Planning Phase' : 'Building Phase'}
            </span>
            <button
              onClick={() => setShowCodex(!showCodex)}
              className={`px-3 py-1 rounded text-sm ${
                showCodex ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Codex ({codexEntries.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex">
        {/* Main Chat Area */}
        <div className={`flex-1 p-4 ${showCodex ? 'w-2/3' : 'w-full'}`}>
          {/* API Key & Model */}
          <div className="mb-4 flex gap-2">
            <input
              type="password"
              placeholder="Anthropic API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 p-2 bg-gray-800 rounded border border-gray-700 text-sm"
            />
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="p-2 bg-gray-800 rounded border border-gray-700 text-sm"
            >
              <option value="claude-sonnet-4-20250514">Claude 4 Sonnet</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </select>
          </div>

          {/* Mode Selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setCurrentMode(mode.id)}
                className={`px-3 py-2 rounded text-sm transition-all ${
                  currentMode === mode.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                title={mode.description}
              >
                {mode.icon} {mode.name}
              </button>
            ))}
          </div>

          {/* Current Mode Info */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{currentModeConfig?.icon}</span>
              <span className="font-semibold">{currentModeConfig?.name} Mode</span>
            </div>
            <p className="text-sm text-gray-400">{currentModeConfig?.description}</p>
          </div>

          {/* Chat Messages */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4 h-[calc(100vh-380px)] overflow-y-auto">
            {messages.length === 0 && !streamingContent ? (
              <div className="text-gray-400">
                <p className="mb-4">Welcome to Claude Code Architect + Builder!</p>
                <p className="text-sm mb-2">Quick commands:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>&quot;switch to code mode&quot; - Start coding</li>
                  <li>&quot;switch to debug mode&quot; - Fix bugs</li>
                  <li>&quot;switch to test mode&quot; - Write tests</li>
                  <li>Or just start describing your project!</li>
                </ul>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
                    <div className="font-bold mb-1 flex items-center gap-2">
                      {msg.role === 'user' ? 'You' : 'Claude'}
                      {msg.role === 'assistant' && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">
                          {currentModeConfig?.name}
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>
                ))}
                {streamingContent && (
                  <div className="mb-4 text-green-300">
                    <div className="font-bold mb-1">Claude:</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {streamingContent}<span className="animate-pulse">|</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
            {loading && !streamingContent && (
              <div className="text-gray-400 flex items-center gap-2">
                <span className="animate-spin">~</span> Thinking...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Describe your project, ask questions, or type 'switch to X mode'..."
              className="flex-1 p-3 bg-gray-800 rounded border border-gray-700 resize-none text-sm"
              rows={3}
              disabled={loading || !apiKey}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={sendMessage}
                disabled={loading || !apiKey || !input.trim()}
                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send
              </button>
              <button
                onClick={() => setMessages([])}
                className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Codex Panel */}
        {showCodex && (
          <div className="w-1/3 border-l border-gray-700 p-4 bg-gray-850 overflow-y-auto h-[calc(100vh-60px)]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>Codex</span>
              <span className="text-sm font-normal text-gray-400">Snippet Library</span>
            </h2>

            {codexEntries.length === 0 ? (
              <div className="text-gray-400 text-sm">
                <p className="mb-2">No snippets saved yet.</p>
                <p>Switch to Codex mode and ask Claude to help you save useful code snippets!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {codexEntries.map((entry) => (
                  <div key={entry.id} className="bg-gray-800 rounded p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs bg-purple-600 px-2 py-0.5 rounded mr-2">
                          {entry.category}
                        </span>
                        <span className="font-medium text-sm">{entry.title}</span>
                        <span className="text-xs text-gray-400 ml-2">v{entry.version}</span>
                      </div>
                      <button
                        onClick={() => deleteCodexEntry(entry.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{entry.description}</p>
                    <pre className="bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                      <code>{entry.code}</code>
                    </pre>
                    {entry.notes && (
                      <p className="text-xs text-yellow-400 mt-2">Note: {entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Form */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  const title = prompt('Snippet title:');
                  const category = prompt('Category (API, Auth, Database, Trading, Utils, Async, Testing, Deploy):') || 'Utils';
                  const code = prompt('Code:');
                  if (title && code) {
                    addCodexEntry({
                      title,
                      category,
                      version: '1.0',
                      description: '',
                      code,
                      language: 'python',
                      usage: '',
                      notes: '',
                    });
                  }
                }}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                + Quick Add Snippet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
