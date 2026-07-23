import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, validateBody } from '../../middleware/index.js';
import { runAnalysis, explainSubmission } from './analysis.controller.js';
import { analysisSchema } from './analysis.validator.js';

export const analysisRouter: ExpressRouter = Router();

analysisRouter.post('/run', authenticate, validateBody(analysisSchema), runAnalysis);
analysisRouter.post('/:id/explain', authenticate, explainSubmission);
