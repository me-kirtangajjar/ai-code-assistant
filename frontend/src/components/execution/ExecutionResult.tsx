'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Code, AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';

import { parseAIExplanation } from '@/lib';
import { generateAIExplanation } from '@/services';
import { useAuth } from '@/hooks';
import type { SubmissionResult } from '@/types';
import { Button } from '@/components';

interface ExecutionResultProps {
  result: SubmissionResult;
  onUseCode?: (code: string) => void;
}

const statusStyles = {
  success: 'bg-emerald-100 text-emerald-800',
  python_error: 'bg-amber-100 text-amber-900',
  runner_error: 'bg-red-100 text-red-800',
} as const;

const statusLabels = {
  success: 'Success',
  python_error: 'Python error',
  runner_error: 'Runner error',
} as const;

function OutputBlock({ label, value, defaultOpen = true }: Readonly<{ label: string; value: string; defaultOpen?: boolean }>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!value) return null;

  return (
    <details className="group" open={defaultOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase transition-colors hover:text-slate-700">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
      </summary>
      <pre className="max-h-52 min-h-20 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">
        {value}
      </pre>
    </details>
  );
}

export function ExecutionResult({ result, onUseCode }: ExecutionResultProps) {
  const { accessToken } = useAuth();
  
  const [aiExplanation, setAiExplanation] = useState<string | null>(result.aiExplanation);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [activeTab, setActiveTab] = useState<'what' | 'why' | 'fix' | 'code'>('what');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAiExplanation(result.aiExplanation);
    setAiError(false);
    
    if ((result.status === 'python_error' || result.status === 'runner_error') && !result.aiExplanation && accessToken) {
      void handleGenerateAI();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id]);

  const handleGenerateAI = async () => {
    if (!accessToken) return;
    setIsGeneratingAI(true);
    setAiError(false);
    try {
      const updatedResult = await generateAIExplanation(result.id, accessToken);
      setAiExplanation(updatedResult.aiExplanation);
    } catch {
      setAiError(true);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const aiSections = aiExplanation ? parseAIExplanation(aiExplanation) : null;

  const renderMarkdown = (content: string) => (
    <div className="prose prose-sm prose-slate max-w-none text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Execution result
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Python output</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[result.status]}`}>
          {statusLabels[result.status]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Execution time</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{result.executionTime} ms</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Exit code</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{result.exitCode ?? 'N/A'}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-slate-500">Error type</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
            {result.errorType ?? 'None'}
          </dd>
        </div>
      </dl>

      {result.stdout ? (
        <div>
          <h3 className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Standard output</h3>
          <pre className="max-h-52 min-h-20 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">
            {result.stdout}
          </pre>
        </div>
      ) : null}

      <OutputBlock label="Standard error" value={result.stderr} defaultOpen={false} />
      {result.traceback && <OutputBlock label="Traceback" value={result.traceback} defaultOpen={false} />}
      {!result.stdout && !result.stderr && !result.traceback && (
        <p className="text-sm text-slate-500 italic">No output.</p>
      )}

      {(result.status === 'python_error' || result.status === 'runner_error') && (
        <section className="border-t border-slate-200 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-950">AI feedback</h2>
              </div>
              {result.errorType && (
                <span className="mt-2 inline-block rounded bg-red-100 px-2 py-1 font-mono text-xs font-semibold text-red-800">
                  {result.errorType}
                </span>
              )}
            </div>
          </div>

          {isGeneratingAI ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-700">Generating AI feedback…</p>
            </div>
          ) : aiError ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
              <AlertTriangle className="mb-3 h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-red-800">AI feedback is currently unavailable.</p>
              <Button type="button" variant="secondary" onClick={() => void handleGenerateAI()} className="mt-4 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          ) : aiSections ? (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
                <button
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'what' ? 'border-blue-500 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setActiveTab('what')}
                >
                  What happened
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'why' ? 'border-blue-500 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setActiveTab('why')}
                >
                  Why it happened
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'fix' ? 'border-blue-500 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setActiveTab('fix')}
                >
                  How to fix it
                </button>
                <button
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'code' ? 'border-blue-500 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => setActiveTab('code')}
                >
                  Corrected code
                </button>
              </div>
              <div className="p-5">
                {activeTab === 'what' && (
                  <div>
                    {aiSections.whatHappened ? renderMarkdown(aiSections.whatHappened) : <p className="text-sm text-slate-500">Not provided.</p>}
                  </div>
                )}
                {activeTab === 'why' && (
                  <div>
                    {aiSections.whyItHappened ? renderMarkdown(aiSections.whyItHappened) : <p className="text-sm text-slate-500">Not provided.</p>}
                  </div>
                )}
                {activeTab === 'fix' && (
                  <div>
                    {aiSections.howToFixIt ? renderMarkdown(aiSections.howToFixIt) : <p className="text-sm text-slate-500">Not provided.</p>}
                  </div>
                )}
                {activeTab === 'code' && (
                  <div>
                    {aiSections.correctedCode ? (
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
                          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            Python
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleCopy(aiSections.correctedCode!)}
                              className="flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <Copy className="h-3 w-3" /> {copied ? 'Copied!' : 'Copy'}
                            </button>
                            {onUseCode && (
                              <button
                                type="button"
                                onClick={() => onUseCode(aiSections.correctedCode!)}
                                className="flex items-center gap-1.5 rounded bg-blue-600/20 px-2.5 py-1 text-[11px] font-medium text-blue-400 transition-colors hover:bg-blue-600/30 hover:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <Code className="h-3 w-3" /> Use in editor
                              </button>
                            )}
                          </div>
                        </div>
                        <pre className="m-0 overflow-auto p-4 font-mono text-xs leading-5 text-slate-100">
                          {aiSections.correctedCode}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No corrected code was provided.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
