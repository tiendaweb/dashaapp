import express from 'express';
import { env } from './config/env.js';
import { StateService } from './services/stateService.js';
import { StateController } from './controllers/stateController.js';
import { createStateRoutes } from './routes/stateRoutes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const stateService = new StateService(env.stateFile);
const stateController = new StateController(stateService);

app.get('/health', (_req, res) => res.json({ success: true, message: 'ok' }));
app.use('/api', createStateRoutes(stateController));

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API Node activa en http://localhost:${env.port}`);
});
