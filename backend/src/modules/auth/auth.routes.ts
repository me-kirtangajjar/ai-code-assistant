import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, validateBody } from '../../middleware/index.js';
import { getCurrentUser, login, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validator.js';

export const authRouter: ExpressRouter = Router();

authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.get('/me', authenticate, getCurrentUser);
