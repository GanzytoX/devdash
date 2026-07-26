import { Router } from "express";
import authRouter from "./auth";
import publicRouter from "./public";
import servicesRouter from "./services";
import logsRouter from "./logs";
import incidentsRouter from "./incidents";
import systemRouter from "./system";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// --- UNPROTECTED ROUTES ---
router.use(authRouter);   // handles /health and /api/auth/login
router.use(publicRouter); // handles /api/public/status

// --- PROTECTED ROUTES ---
router.use(authenticateToken);

router.use(servicesRouter);   // handles /api/services
router.use(logsRouter);       // handles /api/logs
router.use(incidentsRouter);  // handles /api/incidents
router.use(systemRouter);     // handles /api/system and /api/settings

export default router;
