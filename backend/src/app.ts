import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupSwagger } from './middleware/swagger';
import { fundingRouter as fundingRoutes } from './routes/funding';
import { fundingSourcesRouter } from './routes/fundingSources';
import { router as emailTemplateRoutes } from './routes/emailTemplates';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import { router as authRoutes } from './routes/auth';
import { router as virtualCardRoutes } from './routes/virtualCards';
import { router as agentRoutes } from './routes/agents';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());

// Set up Swagger UI
setupSwagger(app);

// Rate limiting
app.use('/api/v1', rateLimiter);

// Public routes
app.use('/api/v1/auth', authRoutes);

// Protected routes
app.use('/api/v1/funding', authenticate, fundingRoutes);
app.use('/api/v1/funding/sources', authenticate, fundingSourcesRouter);
app.use('/api/v1/email-templates', authenticate, emailTemplateRoutes);
app.use('/api/v1/virtual-cards', authenticate, virtualCardRoutes);
app.use('/api/v1/agents', authenticate, agentRoutes);

// Error handling
app.use(errorHandler);

export default app;
