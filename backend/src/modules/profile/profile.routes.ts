import { Router, type Router as ExpressRouter } from 'express';

import { authenticate } from '../../middleware/index.js';
import { getCurrentProfile } from './profile.controller.js';

export const profileRouter: ExpressRouter = Router();

profileRouter.get('/', authenticate, getCurrentProfile);
