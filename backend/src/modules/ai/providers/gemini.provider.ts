import { buildErrorExplanationPrompt } from '../ai.prompts.js';
import type { AIProvider } from '../ai.provider.js';
import { AIProviderError, type AIExplanationContext } from '../ai.types.js';

interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImplementation?: typeof fetch;
}

const extractText = (responseBody: unknown): string | null => {
  if (typeof responseBody !== 'object' || responseBody === null) {
    return null;
  }

  const candidates = (responseBody as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const firstCandidate = candidates[0];

  if (typeof firstCandidate !== 'object' || firstCandidate === null) {
    return null;
  }

  const content = (firstCandidate as { content?: unknown }).content;

  if (typeof content !== 'object' || content === null) {
    return null;
  }

  const parts = (content as { parts?: unknown }).parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) =>
      typeof part === 'object' &&
      part !== null &&
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : '',
    )
    .join('\n')
    .trim();

  return text || null;
};

const mapHttpFailure = (status: number): AIProviderError => {
  if ([400, 401, 403].includes(status)) {
    return new AIProviderError('AI_AUTHENTICATION_ERROR');
  }

  if (status === 429) {
    return new AIProviderError('AI_RATE_LIMITED');
  }

  if (status === 408 || status === 504) {
    return new AIProviderError('AI_TIMEOUT');
  }

  if (status >= 500) {
    return new AIProviderError('AI_UNAVAILABLE');
  }

  return new AIProviderError('AI_INVALID_RESPONSE');
};

export class GeminiProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  constructor({ apiKey, model, timeoutMs, fetchImplementation = fetch }: GeminiProviderOptions) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImplementation = fetchImplementation;
  }

  async generateExplanation(context: AIExplanationContext): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    try {
      const response = await this.fetchImplementation(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildErrorExplanationPrompt(context) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1_200,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw mapHttpFailure(response.status);
      }

      const responseBody: unknown = await response.json();
      const explanation = extractText(responseBody);

      if (!explanation) {
        throw new AIProviderError('AI_INVALID_RESPONSE');
      }

      return explanation;
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        throw new AIProviderError('AI_TIMEOUT');
      }

      if (error instanceof SyntaxError) {
        throw new AIProviderError('AI_INVALID_RESPONSE');
      }

      throw new AIProviderError('AI_NETWORK_ERROR');
    }
  }
}
