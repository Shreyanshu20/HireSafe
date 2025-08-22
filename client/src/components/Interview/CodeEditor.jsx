import React, { useState, useEffect } from 'react';

const CodeEditor = ({ 
  socketRef, 
  meetingCode, 
  userRole
}) => {
  const [code, setCode] = useState('// Write your code here...\n\n');
  const [language, setLanguage] = useState('javascript');

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on('code-change', (data) => {
        setCode(data.code);
      });

      socketRef.current.on('language-change', (data) => {
        setLanguage(data.language);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('code-change');
        socketRef.current.off('language-change');
      }
    };
  }, [socketRef]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    
    if (socketRef.current) {
      socketRef.current.emit('code-change', {
        meetingCode,
        code: newCode,
        userRole
      });
    }
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    
    if (socketRef.current) {
      socketRef.current.emit('language-change', {
        meetingCode,
        language: newLanguage,
        userRole
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-600 flex justify-between items-center">
        <span className="text-gray-300">Code Editor</span>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded text-xs"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
      </div>

      {/* Editor */}
      <textarea
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none border-none outline-none"
        placeholder="Start coding..."
      />

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-800 border-t border-gray-600 text-gray-400 text-xs">
        {language.toUpperCase()} | {userRole}
      </div>
    </div>
  );
};

export default CodeEditor;