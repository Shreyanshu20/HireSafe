import React from "react";

export default function ChatModal({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/10 backdrop-blur-xs"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-[400px] h-[500px] rounded-lg flex flex-col border border-gray-300 shadow-2xl">
        <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-gray-700  rounded-t-lg">
          <h3 className="m-0 text-lg font-semibold text-gray-50">
            Interview Chat
          </h3>
          <button
            onClick={onClose}
            className="bg-none border-none text-5xl cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-3 overflow-y-auto bg-gray-800">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">No messages yet</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className="mb-3 p-3 bg-gray-700 rounded-lg text-white shadow-sm"
              >
                <strong className="text-blue-300">{msg.sender}: </strong>
                <span>{msg.data}</span>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-300 flex gap-3 bg-gray-800 rounded-b-lg">
          <input
            type="text"
            value={message}
            onChange={onMessageChange}
            placeholder="Type a message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSendMessage();
              }
            }}
          />
          <button
            onClick={onSendMessage}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg cursor-pointer transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
