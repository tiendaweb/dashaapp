import express from 'express';
import { env } from './config/env.js';
import { StateService } from './services/stateService.js';
import { StateController } from './controllers/stateController.js';
import { createStateRoutes } from './routes/stateRoutes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { AuthService } from './services/authService.js';
import { AuthController } from './controllers/authController.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { EntityController } from './controllers/entityController.js';
import { createEntityRoutes } from './routes/entityRoutes.js';
import { CompanyModel } from './models/companyModel.js';
import { PlanModel } from './models/planModel.js';
import { SubscriptionModel } from './models/subscriptionModel.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const stateService = new StateService(env.stateFile);
const stateController = new StateController(stateService);
const authService = new AuthService();
const authController = new AuthController(authService);
const entityController = new EntityController({
  companyModel: CompanyModel,
  planModel: PlanModel,
  subscriptionModel: SubscriptionModel
});

app.get('/health', (_req, res) => res.json({ success: true, message: 'ok' }));
app.use('/api', createStateRoutes(stateController));
app.use('/api', createAuthRoutes(authController));
app.use('/api', createEntityRoutes(entityController));

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API Node activa en http://localhost:${env.port}`);
});
