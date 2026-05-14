import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bell, X, ChevronUp, ChevronDown } from 'lucide-react';

export interface ChatMessage {
  id: string;
  type: 'system' | 'bet' | 'announcement';
  content: string;
  timestamp: number;
}

interface GlobalChatProps {
  messages: ChatMessage[];
}

export const GlobalChat: React.FC<GlobalChatProps> = ({ messages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // 自動捲動到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // 當有新訊息且聊天室是縮小時，顯示預覽氣泡
    if (messages.length > 0 && !isOpen) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMsg.id;
        setShowPreview(true);
        // 5 秒後自動消失
        const timer = setTimeout(() => setShowPreview(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, isOpen]);

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-start max-w-[90vw] sm:max-w-lg">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-[260px] sm:w-[360px] h-48 sm:h-64"
          >
            {/* Header */}
            <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">系統頻道</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Chat Content */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-20">
                  <span className="text-[10px] text-white font-bold uppercase tracking-tighter">等待訊息中...</span>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-[10px] text-white/30 font-bold tabular-nums pt-0.5 shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <div className="flex-1">
                    {msg.type === 'bet' ? (
                      <div className="bg-pink-500/20 border border-pink-500/30 rounded-lg px-2 py-1">
                        <p className="text-[11px] sm:text-xs text-pink-300 font-bold leading-relaxed">
                           {msg.content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-emerald-400 font-bold leading-relaxed">
                        <span className="text-emerald-500/60 mr-1">[系統]</span>
                        {msg.content}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button & Preview Bubble */}
      {!isOpen && (
        <div className="relative flex items-center gap-3">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => {
              setIsOpen(true);
              setShowPreview(false);
            }}
            className="bg-emerald-500 text-white p-3 rounded-full shadow-lg hover:bg-emerald-400 transition-colors active:scale-95 shrink-0"
          >
            <MessageSquare size={20} />
            {messages.length > 0 && !showPreview && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            )}
          </motion.button>

          <AnimatePresence>
            {showPreview && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.8 }}
                onClick={() => {
                  setIsOpen(true);
                  setShowPreview(false);
                }}
                className="bg-pink-600/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-xl border border-pink-400/30 cursor-pointer max-w-[70vw]"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">最新尬廣</span>
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                </div>
                <p className="text-xs font-bold leading-tight line-clamp-2">
                  {messages[messages.length - 1].content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
