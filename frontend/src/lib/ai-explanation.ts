import type { AIExplanationSections } from '@/types';


export const parseAIExplanation = (value: string): AIExplanationSections => {
  const extractSection = (header: string, nextHeader?: string): string | null => {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedNext = nextHeader ? nextHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    
    const regex = new RegExp(
      `##\\s*${escapedHeader}\\s*\\n([\\s\\S]*?)(?=${escapedNext ? `##\\s*${escapedNext}` : '$'})`,
      'i'
    );
    
    const match = regex.exec(value);
    return match?.[1] ? match[1].trim() : null;
  };

  const whatHappened = extractSection('What happened', 'Why it happened');
  const whyItHappened = extractSection('Why it happened', 'How to fix it');
  const howToFixIt = extractSection('How to fix it', 'Corrected code');
  const correctedCodeMatch = extractSection('Corrected code');
  
  let correctedCode: string | null = null;
  if (correctedCodeMatch) {
    const codeMatch = /```(?:python)?\s*\n?([\s\S]*?)```/i.exec(correctedCodeMatch);
    correctedCode = codeMatch?.[1] ? codeMatch[1].trim() : correctedCodeMatch;
  } else {
    const codeMatch = /```(?:python)?\s*\n?([\s\S]*?)```/i.exec(value);
    if (codeMatch?.[1]) {
      correctedCode = codeMatch[1].trim();
    }
  }

  return {
    whatHappened: whatHappened || 'Explanation not found.',
    whyItHappened: whyItHappened || null,
    howToFixIt: howToFixIt || null,
    correctedCode,
  };
};
