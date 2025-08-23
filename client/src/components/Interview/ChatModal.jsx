import React from "react";

export default function ChatModal({ 
  messages, 
  message, 
  onMessageChange, 
  onSendMessage, 
  onClose 
}) {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
      <div className="bg-white w-[400px] h-[500px] rounded-lg flex flex-col">
        <div className="p-[15px] border-b border-gray-300 flex justify-between items-center">
          <h3 className="m-0">Interview Chat</h3>
          <button
            onClick={onClose}
            className="bg-none border-none text-xl cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-[10px] overflow-y-auto max-h-[350px]">
          {messages.length === 0 ? (
            <p className="text-center text-gray-600">No messages yet</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className="mb-[10px] p-2 bg-gray-100 rounded"
              >
                <strong>{msg.sender}: </strong>
                <span>{msg.data}</span>
              </div>
            ))
          )}
        </div>

        <div className="p-[15px] border-t border-gray-300 flex gap-[10px]">
          <input
            type="text"
            value={message}
            onChange={onMessageChange}
            placeholder="Type a message..."
            className="flex-1 p-2 border border-gray-300 rounded"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSendMessage();
              }
            }}
          />
          <button
            onClick={onSendMessage}
            className="px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}