import { Router } from 'express';
import { DependencyController } from '@/controllers/dependencyController';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All dependency routes require authentication
router.use(authenticate);

// Dependency analysis routes
router.post('/analyze', DependencyController.analyzeDependencies);
router.get('/graph/:projectId', DependencyController.getDependencyGraph);
router.post('/circular', DependencyController.detectCircularDependencies);
router.post('/external', DependencyController.analyzeExternalLibraries);
router.post('/relationships', DependencyController.analyzeComponentRelationships);

export default router;
