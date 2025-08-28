import React, { useEffect, useRef, useCallback, memo } from "react";

// ✅ MEMOIZE ChatModal to prevent unnecessary re-renders
const ChatModal = memo(function ChatModal({
  messages, message, onMessageChange, onSendMessage, onClose,
}) {
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { 
    inputRef.current?.focus(); 
  }, []);

  // ✅ SCROLL TO BOTTOM when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ MEMOIZE key handler to prevent recreation
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Panel */}
      <div className="
        absolute right-0 top-0 h-full w-full sm:w-[420px]
        bg-slate-900 text-slate-100 border-l border-white/10
        shadow-2xl flex flex-col
        animate-[slideIn_.25s_ease-out]
      ">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-message text-sky-400"></i>
            <h3 className="font-semibold">Meeting Chat</h3>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close chat"
            className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ✅ SCROLLABLE MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-slate-400 mt-8">No messages yet</p>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className="bg-slate-800 rounded-xl px-3 py-2">
                  <span className="text-sky-300 font-medium">{m.sender}</span>
                  <span className="mx-2 text-slate-500">•</span>
                  <span>{m.data}</span>
                </div>
              ))}
              {/* ✅ SCROLL ANCHOR */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ✅ INPUT AREA - ISOLATED FROM RE-RENDERS */}
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={onMessageChange} // This should NOT cause VideoGrid re-renders now
            placeholder="Type a message…"
            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            onKeyDown={handleKeyDown}
            maxLength={500} // Add reasonable limit
          />
          <button
            onClick={onSendMessage}
            disabled={!message.trim()}
            className="h-11 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-semibold transition"
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
});

export default ChatModal;
