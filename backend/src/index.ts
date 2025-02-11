import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { virtualCardsRouter } from './routes/virtualCards';
import budgetsRouter from './routes/budgets';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Create API router
const apiRouter = express.Router();

// Mount routes on API router
apiRouter.use('/auth', authRouter);
apiRouter.use('/virtual-cards', virtualCardsRouter);
apiRouter.use('/budgets', budgetsRouter);

// Mount API router with /api/v1 prefix
app.use('/api/v1', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
