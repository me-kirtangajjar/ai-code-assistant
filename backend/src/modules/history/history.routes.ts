import { Router, type Router as ExpressRouter } from 'express';

import { authenticate } from '../../middleware/index.js';
import { getHistoryDetail, listHistory } from './history.controller.js';

export const historyRouter: ExpressRouter = Router();

historyRouter.get('/', authenticate, listHistory);
historyRouter.get('/:id', authenticate, getHistoryDetail);
