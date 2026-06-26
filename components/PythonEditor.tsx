"use client";

import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

type Props = {
  yText: Y.Text;
  awareness: Awareness;
  readOnly?: boolean;
  wordWrap?: boolean;
  showMinimap?: boolean;
  fontSize?: number;
};

export default function PythonEditor({
  yText,
  awareness,
  readOnly = false,
  wordWrap = false,
  showMinimap = false,
  fontSize = 14,
}: Props) {
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, []);

  const onMount: OnMount = (editor) => {
    const model = editor.getModel();
    if (!model) return;
    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), awareness);
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-dark"
      onMount={onMount}
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
