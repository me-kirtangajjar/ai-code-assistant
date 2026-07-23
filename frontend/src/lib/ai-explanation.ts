import type { AIExplanationSections } from '@/types';

const cleanMarkdownLabel = (value: string): string =>
  value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\*\*(.+)\*\*:?$/gm, '$1')
    .trim();

export const parseAIExplanation = (value: string): AIExplanationSections => {
  const codeMatch = /```(?:python)?\s*\n?([\s\S]*?)```/i.exec(value);
  const correctedCode = codeMatch?.[1]?.trim() || null;
  const withoutCode = value.replace(/```(?:python)?\s*\n?[\s\S]*?```/gi, '').trim();
  const suggestedFixMatch = /(?:^|\n)\s*(?:\*\*)?Suggested Fix(?:\*\*)?:?\s*/i.exec(withoutCode);

  if (!suggestedFixMatch || suggestedFixMatch.index === undefined) {
    return {
      explanation: cleanMarkdownLabel(withoutCode),
      suggestedFix: 'Review the explanation above and apply the recommended correction.',
      correctedCode,
    };
  }

  const explanation = withoutCode.slice(0, suggestedFixMatch.index);
  const suggestedFix = withoutCode.slice(suggestedFixMatch.index + suggestedFixMatch[0].length);

  return {
    explanation: cleanMarkdownLabel(explanation),
    suggestedFix: cleanMarkdownLabel(suggestedFix),
    correctedCode,
  };
};
