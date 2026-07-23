'use client';

import dynamic from 'next/dynamic';

import { Loading } from '../ui/Loading';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Loading label="Loading Python editor…" />,
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-300"
      aria-label="Python code editor"
    >
      <MonacoEditor
        height="430px"
        language="python"
        theme="light"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={{
          automaticLayout: true,
          fontFamily: 'var(--font-mono), Consolas, monospace',
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          padding: { top: 14, bottom: 14 },
          readOnly,
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          tabSize: 4,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
