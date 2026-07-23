import { logger } from '../../common/index.js';
import type { AIProvider } from './ai.provider.js';
import {
  AIProviderError,
  type AIExplanationContext,
  type ExecutionExplanationContext,
} from './ai.types.js';

const MAX_EXPLANATION_CHARACTERS = 20_000;

export const generateErrorExplanation = async (
  provider: AIProvider,
  context: AIExplanationContext,
): Promise<string | null> => {
  logger.info('AI explanation generation started.', {
    errorType: context.errorType ?? 'unknown',
  });

  try {
    const explanation = (await provider.generateExplanation(context)).trim();

    if (!explanation || explanation.length > MAX_EXPLANATION_CHARACTERS) {
      logger.warn('AI explanation provider returned an invalid response.', {
        code: 'AI_INVALID_RESPONSE',
      });
      return null;
    }

    logger.info('AI explanation generation completed.', {
      errorType: context.errorType ?? 'unknown',
      responseCharacters: explanation.length,
    });
    return explanation;
  } catch (error) {
    logger.warn('AI explanation is unavailable.', {
      code: error instanceof AIProviderError ? error.code : 'AI_PROVIDER_FAILURE',
      errorType: context.errorType ?? 'unknown',
    });
    return null;
  }
};

export const generateExplanationForExecution = async (
  provider: AIProvider,
  context: ExecutionExplanationContext,
): Promise<string | null> => {
  if (context.status !== 'python_error') {
    logger.info('AI explanation skipped because Python did not report an error.', {
      executionStatus: context.status,
    });
    return null;
  }

  return generateErrorExplanation(provider, context);
};
