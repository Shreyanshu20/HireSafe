import React, { useRef, useEffect, useState } from "react";
import * as monaco from "monaco-editor";

// Configure Monaco Editor environment
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './json.worker.bundle.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return './css.worker.bundle.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return './html.worker.bundle.js';
    }
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
  onRun,
  theme = "vs-dark",
  height = "400px",
  readOnly = false,
  onOutputChange,
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const isUpdatingFromSocketRef = useRef(false);

  const languageOptions = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
  ];

  const getBoilerplateCode = (lang) => {
    switch (lang) {
      case "javascript":
        return `console.log("Hello World!");`;

      case "python":
        return `print("Hello World!")`;

      case "java":
        return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`;

      case "cpp":
        return `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    return 0;
}`;

      default:
        return `console.log("Hello World!");`;
    }
  };

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      // Configure Monaco Editor with minimal features to avoid worker issues
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: value || getBoilerplateCode(language || "javascript"),
        language: language || "javascript",
        theme: theme,
        fontSize: 14,
        lineNumbers: "on",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: readOnly,
        automaticLayout: true,
        minimap: {
          enabled: false,
        },
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: false,
          verticalHasArrows: true,
          horizontalHasArrows: true,
        },
        // Disable features that require workers
        suggestOnTriggerCharacters: false,
        quickSuggestions: false,
        parameterHints: {
          enabled: false,
        },
        wordWrap: "on",
        wrappingIndent: "indent",
        formatOnType: false,
        formatOnPaste: false,
        tabSize: 2,
        insertSpaces: true,
        // Disable TypeScript/JavaScript specific features
        typescript: {
          diagnostics: {
            noSemanticValidation: true,
            noSyntaxValidation: true,
          },
        },
        javascript: {
          diagnostics: {
            noSemanticValidation: true,
            noSyntaxValidation: true,
          },
        },
      });

      editorRef.current.onDidChangeModelContent(() => {
        const currentValue = editorRef.current.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });

      editorRef.current.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          handleRunCode();
        }
      );

      editorRef.current.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => {
          try {
            editorRef.current.getAction("editor.action.formatDocument").run();
          } catch (error) {
            console.warn("Format action not available");
          }
        }
      );
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
        monaco.editor.setModelLanguage(model, language || "javascript");
        const currentValue = editorRef.current.getValue();
        if (!currentValue || currentValue.includes("Hello World!")) {
          editorRef.current.setValue(getBoilerplateCode(language));
        }
      }
    }
  }, [language]);

  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  const handleLanguageSelect = (e) => {
    const newLanguage = e.target.value;
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  const executeCode = (code, lang) => {
    try {
      switch (lang) {
        case "javascript":
          const logs = [];
          const safeConsole = {
            log: (...args) => logs.push(args.join(" ")),
            error: (...args) => logs.push(`Error: ${args.join(" ")}`),
            warn: (...args) => logs.push(`Warning: ${args.join(" ")}`),
          };

          const func = new Function("console", code);
          func(safeConsole);
          
          return logs.length > 0 ? logs.join("\n") : "No console output";

        case "python":
          return `Python execution not available in browser.\nCode to execute:\n${code}`;

        case "java":
          return `Java execution not available in browser.\nCode to execute:\n${code}`;

        case "cpp":
          return `C++ execution not available in browser.\nCode to execute:\n${code}`;

        default:
          return `Execution not supported for ${lang}`;
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;

    setIsRunning(true);
    const code = editorRef.current.getValue();
    
    setTimeout(() => {
      const result = executeCode(code, language);
      setOutput(result);
      setIsRunning(false);
      
      if (onOutputChange && !isUpdatingFromSocketRef.current) {
        onOutputChange(result);
      }
    }, 500);
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      try {
        editorRef.current.getAction("editor.action.formatDocument").run();
      } catch (error) {
        console.warn("Format action not available");
      }
    }
  };

  const clearOutput = () => {
    setOutput("");
    if (onOutputChange && !isUpdatingFromSocketRef.current) {
      onOutputChange("");
    }
  };

  useEffect(() => {
    const handleCodeChangeEvent = (event) => {
      const data = event.detail;
      if (data.code !== undefined && onChange) {
        const currentValue = editorRef.current?.getValue();
        if (currentValue !== data.code) {
          editorRef.current?.setValue(data.code);
        }
      }
    };

    window.addEventListener('interviewCodeChange', handleCodeChangeEvent);
    
    return () => {
      window.removeEventListener('interviewCodeChange', handleCodeChangeEvent);
    };
  }, [onChange]);

  useEffect(() => {
    const handleOutputChangeEvent = (event) => {
      const data = event.detail;
      if (data.output !== undefined) {
        isUpdatingFromSocketRef.current = true;
        setOutput(data.output);
        setTimeout(() => {
          isUpdatingFromSocketRef.current = false;
        }, 100);
      }
    };

    window.addEventListener('interviewOutputChange', handleOutputChangeEvent);
    
    return () => {
      window.removeEventListener('interviewOutputChange', handleOutputChangeEvent);
    };
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <h3 className="text-white text-sm font-medium">Code Editor</h3>

        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={handleLanguageSelect}
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleFormatCode}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
            title="Format Code (Ctrl+Shift+F)"
          >
            Format
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className={`text-white text-xs px-3 py-1 rounded transition-colors ${
              isRunning
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            title="Run Code (Ctrl+Enter)"
          >
            {isRunning ? "Running..." : "▶ Run"}
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ height }} className="w-full" />

      <div className="border-t border-gray-700">
        <div className="flex items-center justify-between p-2 bg-gray-800">
          <span className="text-white text-xs font-medium">Output</span>
          <button
            onClick={clearOutput}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="bg-black text-green-400 text-xs font-mono p-3 h-32 overflow-y-auto">
          {isRunning ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400 mr-2"></div>
              Executing code...
            </div>
          ) : output ? (
            <pre className="whitespace-pre-wrap">{output}</pre>
          ) : (
            <span className="text-gray-500">Click "Run" to see output here...</span>
          )}
        </div>
      </div>

      <div className="px-3 py-1 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>
            Language:{" "}
            {languageOptions.find((opt) => opt.value === language)?.label ||
              "JavaScript"}
          </span>
          <span>Shortcuts: Ctrl+Enter (Run) | Ctrl+Shift+F (Format)</span>
        </div>
      </div>
    </div>
  );
}