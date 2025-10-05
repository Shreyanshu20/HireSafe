import React, { useRef, useEffect, useState } from "react";
import * as monaco from "monaco-editor";

// Configure Monaco Editor environment
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.bundle.js';
    }
    return './editor.worker.bundle.js';
  }
};

export default function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  theme = "vs-dark",
  height = "400px",
  readOnly = false,
  onOutputChange,
  outputValue, // Add outputValue prop
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const isUpdatingOutputFromSocketRef = useRef(false);

  const languageOptions = [
    { value: "javascript", label: "JavaScript", icon: "fab fa-js-square", color: "text-yellow-400" },
    { value: "python", label: "Python", icon: "fab fa-python", color: "text-blue-400" },
    { value: "java", label: "Java", icon: "fab fa-java", color: "text-orange-400" },
    { value: "cpp", label: "C++", icon: "fab fa-cuttlefish", color: "text-blue-300" },
  ];

  const getBoilerplateCode = (lang) => {
    switch (lang) {
      case "javascript":
        return `console.log("Hello World!");

function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("Developer"));`;

      case "python":
        return `print("Hello World!")

def greet(name):
    return f"Hello, {name}!"

print(greet("Developer"))`;

      case "java":
        return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
        System.out.println(greet("Developer"));
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`;

      case "cpp":
        return `#include <iostream>
#include <string>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    cout << "Hello World!" << endl;
    cout << greet("Developer") << endl;
    return 0;
}`;

      default:
        return `console.log("Hello World!");`;
    }
  };

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: value || getBoilerplateCode(language || "javascript"),
        language: language === "cpp" ? "cpp" : language || "javascript",
        theme: theme,
        fontSize: 14,
        lineNumbers: "on",
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: "on",
        tabSize: 2,
        insertSpaces: true,
      });

      editorRef.current.onDidChangeModelContent(() => {
        const currentValue = editorRef.current.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value || getBoilerplateCode(language || "javascript"));
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLang = language === "cpp" ? "cpp" : language || "javascript";
        monaco.editor.setModelLanguage(model, monacoLang);
        editorRef.current.setValue(getBoilerplateCode(language));
      }
    }
  }, [language]);

  // Add effect to sync output from socket
  useEffect(() => {
    if (outputValue !== undefined && outputValue !== output) {
      isUpdatingOutputFromSocketRef.current = true;
      setOutput(outputValue);
      setTimeout(() => {
        isUpdatingOutputFromSocketRef.current = false;
      }, 100);
    }
  }, [outputValue, output]);

  const handleLanguageSelect = (e) => {
    const newLanguage = e.target.value;
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  // Execute JavaScript code
  const executeJavaScript = (code) => {
    try {
      const logs = [];
      const safeConsole = {
        log: (...args) => logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')),
        error: (...args) => logs.push(`Error: ${args.join(' ')}`),
        warn: (...args) => logs.push(`Warning: ${args.join(' ')}`),
      };

      const func = new Function('console', code);
      func(safeConsole);
      
      return logs.length > 0 ? logs.join('\n') : "Code executed successfully (no output)";
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  // Execute code using Piston API
  const executeWithPiston = async (code, language) => {
    const languageMap = {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp'
    };

    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: languageMap[language],
          version: '*',
          files: [{
            name: language === 'java' ? 'Main.java' : `main.${language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : 'js'}`,
            content: code
          }]
        })
      });

      const result = await response.json();
      
      if (result.run) {
        let output = '';
        if (result.run.stdout) {
          output += result.run.stdout;
        }
        if (result.run.stderr) {
          output += (output ? '\n' : '') + `Error: ${result.run.stderr}`;
        }
        return output || "Code executed successfully (no output)";
      } else {
        return "Execution failed";
      }
    } catch (error) {
      return `Network Error: ${error.message}`;
    }
  };

  // Fallback Python execution using Pyodide
  const executePythonFallback = async (code) => {
    try {
      if (typeof window.pyodide === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
          script.onload = async () => {
            try {
              window.pyodide = await loadPyodide();
              
              window.pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
              `);
              
              window.pyodide.runPython(code);
              
              const output = window.pyodide.runPython("sys.stdout.getvalue()");
              resolve(output || "Code executed successfully");
            } catch (error) {
              resolve(`Python Error: ${error.message}`);
            }
          };
          script.onerror = () => {
            resolve("Failed to load Python interpreter");
          };
        });
      } else {
        window.pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
        `);
        
        window.pyodide.runPython(code);
        const output = window.pyodide.runPython("sys.stdout.getvalue()");
        return output || "Code executed successfully";
      }
    } catch (error) {
      return `Python Error: ${error.message}`;
    }
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    setIsRunning(true);
    const code = editorRef.current.getValue();
    
    let result;
    
    try {
      if (language === 'javascript') {
        result = executeJavaScript(code);
      } else {
        result = await executeWithPiston(code, language);
        
        if (result.includes('Network Error') && language === 'python') {
          result = await executePythonFallback(code);
        }
      }
    } catch (error) {
      result = `Execution failed: ${error.message}`;
    }

    setOutput(result);
    setIsRunning(false);
    
    // Only send output change if it's not from socket update
    if (onOutputChange && !isUpdatingOutputFromSocketRef.current) {
      onOutputChange(result);
    }
  };

  const clearOutput = () => {
    setOutput("");
    if (onOutputChange && !isUpdatingOutputFromSocketRef.current) {
      onOutputChange("");
    }
  };

  const selectedLanguage = languageOptions.find(opt => opt.value === language) || languageOptions[0];

  return (
    <div className="bg-slate-900/70 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <i className={`${selectedLanguage.icon} ${selectedLanguage.color} text-lg`}></i>
          <h3 className="text-slate-200 text-sm font-semibold">Code Editor</h3>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageSelect}
            className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-slate-700 transition"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              isRunning
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/25"
            }`}
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                Running...
              </>
            ) : (
              <>
                <i className="fa-solid fa-play"></i>
                Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div ref={containerRef} style={{ height }} className="w-full" />

      {/* Output Panel */}
      <div className="border-t border-white/10">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-terminal text-emerald-400"></i>
            <span className="text-slate-200 text-sm font-medium">Output</span>
          </div>
          {output && (
            <button
              onClick={clearOutput}
              className="px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-trash"></i>
              Clear
            </button>
          )}
        </div>
        <div className="bg-black/50 text-emerald-400 text-sm font-mono p-4 h-32 overflow-y-auto">
          {isRunning ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-400 border-t-transparent"></div>
              <span>Executing {selectedLanguage.label} code...</span>
            </div>
          ) : output ? (
            <pre className="whitespace-pre-wrap text-emerald-300">{output}</pre>
          ) : (
            <div className="text-slate-500 flex items-center gap-2">
              <i className="fa-solid fa-info-circle"></i>
              <span>Click "Run" to execute your code</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}