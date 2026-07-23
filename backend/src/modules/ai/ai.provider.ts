import { getEnvironment } from '../../config/index.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockAIProvider } from './providers/mock.provider.js';
import type { AIExplanationContext } from './ai.types.js';

export interface AIProvider {
  generateExplanation(context: AIExplanationContext): Promise<string>;
}

let configuredProvider: AIProvider | undefined;

export const getAIProvider = (): AIProvider => {
  if (configuredProvider) {
    return configuredProvider;
  }

  const environment = getEnvironment();

  if (environment.aiProvider === 'gemini') {
    if (!environment.geminiApiKey) {
      throw new Error('Gemini provider configuration is incomplete.');
    }

    configuredProvider = new GeminiProvider({
      apiKey: environment.geminiApiKey,
      model: environment.geminiModel,
      timeoutMs: environment.geminiTimeoutMs,
    });
  } else {
    configuredProvider = new MockAIProvider();
  }

  return configuredProvider;
};
