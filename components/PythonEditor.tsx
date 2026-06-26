"use client";

import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

type Props = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  wordWrap?: boolean;
  showMinimap?: boolean;
  fontSize?: number;
};

export default function PythonEditor({
  value,
  onChange,
  readOnly = false,
  wordWrap = false,
  showMinimap = false,
  fontSize = 14,
}: Props) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const ignoreNextChangeRef = useRef(false);

  // Apply incoming `value` without losing the user's cursor when the change came
  // from polling (not from local typing).
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const current = ed.getValue();
    if (current === value) return;
    const sel = ed.getSelection();
    ignoreNextChangeRef.current = true;
    ed.setValue(value);
    if (sel) ed.setSelection(sel);
  }, [value]);

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-dark"
      value={value}
      onMount={onMount}
      onChange={(next) => {
        if (ignoreNextChangeRef.current) {
          ignoreNextChangeRef.current = false;
          return;
        }
        onChange?.(next ?? "");
      }}
      options={{
        readOnly,
        wordWrap: wordWrap ? "on" : "off",
        minimap: { enabled: showMinimap },
        fontSize,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: true,
        renderWhitespace: "selection",
      }}
    />
  );
}
