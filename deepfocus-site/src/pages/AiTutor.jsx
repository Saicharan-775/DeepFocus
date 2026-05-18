import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, Send, Code2, History, RotateCcw, PanelLeftClose, Bot, User } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function AiTutor() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hello! I am your AI Tutor. Ask me any coding question or paste a problem, and I'll help you solve it!" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const provider = localStorage.getItem('df_ai_provider') || 'demo';
    const geminiKey = localStorage.getItem('df_gemini_key');
    const openaiKey = localStorage.getItem('df_openai_key');
    setHasKey(provider === 'demo' || (provider === 'gemini' ? !!geminiKey : !!openaiKey));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const provider = localStorage.getItem('df_ai_provider') || 'demo';
    const geminiKey = localStorage.getItem('df_gemini_key')?.trim();
    const openaiKey = localStorage.getItem('df_openai_key')?.trim();
    const keyToUse = provider === 'gemini' ? geminiKey : openaiKey;

    if (!message.trim() || (provider !== 'demo' && !keyToUse)) return;
    
    const userMsg = { role: 'user', content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setMessage('');
    setIsLoading(true);

    // Create an empty model message for streaming
    setMessages(prev => [...prev, { role: 'model', content: "" }]);

    try {
      if (provider === 'demo') {
        const demoText = "Here is a great way to optimize that algorithm! Using a **Two Pointer** approach can reduce the time complexity from O(N²) to O(N). \n\n```java\npublic int maxArea(int[] height) {\n    int maxArea = 0;\n    int left = 0;\n    int right = height.length - 1;\n    \n    while (left < right) {\n        int currentArea = Math.min(height[left], height[right]) * (right - left);\n        maxArea = Math.max(maxArea, currentArea);\n        \n        if (height[left] < height[right]) {\n            left++;\n        } else {\n            right--;\n        }\n    }\n    return maxArea;\n}\n```\nLet me know if you want me to break down the time complexity further!";
        setIsLoading(false);
        for (let i = 0; i < demoText.length; i += 2) {
           await new Promise(r => setTimeout(r, 10));
           setMessages(prev => {
             const updated = [...prev];
             const lastIdx = updated.length - 1;
             updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + demoText.substring(i, i+2) };
             return updated;
           });
        }
      } else if (provider === 'gemini') {
        const selectedModel = localStorage.getItem('df_gemini_model') || 'gemini-1.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${geminiKey}&alt=sse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: "You are an elite competitive programming DSA tutor. Use the Socratic method to guide the user. Do not immediately give away the entire solution unless asked. Be concise, professional, and format code blocks perfectly." }]},
            contents: newMessages.slice(1).map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            }))
          })
        });

        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        setIsLoading(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                 try {
                   const data = JSON.parse(line.slice(6));
                   const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                   if (text) {
                     setMessages(prev => {
                       const updated = [...prev];
                       const lastIdx = updated.length - 1;
                       updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + text };
                       return updated;
                     });
                   }
                 } catch (e) {}
              }
            }
          }
        }
      } else {
        const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            stream: true,
            messages: [
              { role: 'system', content: "You are an elite competitive programming DSA tutor. Use the Socratic method to guide the user. Do not immediately give away the entire solution unless asked. Be concise, professional, and format code blocks perfectly." },
              ...newMessages.slice(1).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
              }))
            ]
          })
        });

        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        setIsLoading(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                 try {
                   const data = JSON.parse(line.slice(6));
                   const text = data.choices?.[0]?.delta?.content;
                   if (text) {
                     setMessages(prev => {
                       const updated = [...prev];
                       const lastIdx = updated.length - 1;
                       updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + text };
                       return updated;
                     });
                   }
                 } catch (e) {}
              }
            }
          }
        }
      }
    } catch (error) {
      setIsLoading(false);
      let errorMsg = `Error: ${error.message}`;
      
      if (/quota|limit|exceeded|429/i.test(error.message)) {
        errorMsg = "API Quota Exceeded (429).\\n\\n**Why is this happening with a new API key?**\\n\\n1. **OpenAI**: New accounts require a linked credit card with a prepaid balance (minimum $5) to use the API. Free credits are no longer provided.\\n2. **Google Gemini**: Your region may restrict free-tier API access, or you may be exceeding the free RPM (Requests Per Minute) limit.\\n\\n**Solution**: Check your billing dashboard or switch to Demo Mode in Settings.";
      }

      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx].content === "") {
          updated[lastIdx] = { ...updated[lastIdx], content: errorMsg };
        } else {
          updated.push({ role: 'model', content: errorMsg });
        }
        return updated;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Markdown is rendered directly using react-markdown in the JSX

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Left Sidebar (History) */}
      <div className="w-72 bg-[#050505] rounded-3xl border border-white/5 flex flex-col overflow-hidden hidden lg:flex shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01] relative z-10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-violet-400" /> Chat History
          </span>
          <button className="text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg">
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {['Dynamic Programming Help', 'Why TLE on Two Sum?', 'Explain BFS vs DFS', 'React Hydration Error'].map((item, i) => (
            <button key={i} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${i === 0 ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
              <div className="truncate">{item}</div>
              <div className="text-[10px] text-gray-500 mt-1">{i === 0 ? 'Today' : 'Yesterday'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#050505] rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#000000]/40 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Bot size={20} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                DeepFocus Tutor
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-300">Beta</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-emerald-400 font-medium tracking-wide">Online • {localStorage.getItem('df_ai_provider') === 'demo' ? 'Demo Mode' : (localStorage.getItem('df_gemini_model') || 'gemini-1.5-flash')}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([{ role: 'model', content: "Hello! I am your AI Tutor. Ask me any coding question or paste a problem, and I'll help you solve it!" }])} className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2 border border-white/5 hover:border-white/10">
            <RotateCcw size={14} /> New Chat
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scrollbar-hide">
          {!hasKey && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-lg backdrop-blur-sm">
              <div className="p-2 bg-rose-500/20 rounded-lg shrink-0">
                <span className="text-rose-400 text-lg">⚠️</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-400">API Connection Required</h4>
                <p className="text-sm text-rose-300/80 mt-1 leading-relaxed">Please go to Settings and add your Google Gemini or OpenAI API Key to use the Tutor. Alternatively, you can enable Demo Mode for a simulated experience.</p>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.98 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              transition={{ duration: 0.3 }}
              key={idx} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex flex-shrink-0 items-center justify-center border border-violet-500/30 mb-1">
                    <Sparkles size={14} className="text-violet-400" />
                  </div>
                )}
                <div className={`
                  ${msg.role === 'user' 
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-[0_4px_20px_rgba(99,102,241,0.2)]' 
                    : 'bg-[#0A0A0A] border border-white/10 text-gray-300 rounded-2xl rounded-tl-sm shadow-xl'
                  } px-5 py-4`}>
                  <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-gray-300'}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="rounded-xl overflow-hidden my-4 border border-white/10 shadow-lg">
                              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#1e1e1e]">
                                <span className="text-xs font-mono text-gray-400 flex items-center gap-2"><Code2 size={14} /> {match[1]}</span>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, background: '#1e1e1e', fontSize: '0.85rem' }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[0.85em] text-violet-300" {...props}>
                              {children}
                            </code>
                          );
                        },
                        p({ children }) { return <p className="mb-3 last:mb-0">{children}</p>; },
                        ul({ children }) { return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>; },
                        ol({ children }) { return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>; },
                        a({ href, children }) { return <a href={href} className="text-violet-400 hover:underline" target="_blank" rel="noreferrer">{children}</a>; },
                        h1({ children }) { return <h1 className="text-xl font-bold mb-3 mt-4 text-white">{children}</h1>; },
                        h2({ children }) { return <h2 className="text-lg font-bold mb-3 mt-4 text-white">{children}</h2>; },
                        h3({ children }) { return <h3 className="text-base font-bold mb-2 mt-3 text-white">{children}</h3>; }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex flex-shrink-0 items-center justify-center border border-violet-500/30 mb-1">
                <Sparkles size={14} className="text-violet-400 animate-pulse" />
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 text-gray-300 px-4 py-2 rounded-2xl rounded-tl-sm shadow-xl">
                <div className="w-12 h-8 flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 relative z-10">
          <div className="relative flex items-end gap-3 bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-inner focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything about algorithms, data structures, or code..."
              className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-500 resize-none max-h-32 min-h-[44px] py-3 px-4 focus:outline-none scrollbar-hide font-sans"
              rows={1}
            />
            <button 
              onClick={sendMessage}
              className="p-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all shrink-0 disabled:opacity-50 shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:shadow-none" 
              disabled={!message.trim() || (!hasKey && localStorage.getItem('df_ai_provider') !== 'demo') || isLoading}
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
          <div className="text-center mt-3">
            <span className="text-[10px] text-gray-500 font-medium tracking-wide">DeepFocus AI Tutor can make mistakes. Consider verifying important logic.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
