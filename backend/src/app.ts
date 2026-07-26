import express from "express";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import { config, validateConfig } from "./config";
import { securityHeaders } from "./middleware/securityHeaders";
import { validateRequestOrigin } from "./middleware/requestOrigin";
import router from "./routes";

// Validate configurations at startup
validateConfig();

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS_ORIGIN_DENIED'));
  },
}));
app.use(express.json({ limit: '32kb', strict: true }));
app.use(validateRequestOrigin);

app.use(router);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof SyntaxError) {
    return res.status(400).json({ error: 'El cuerpo JSON no es válido.' });
  }
  if (error instanceof Error && error.message === 'CORS_ORIGIN_DENIED') {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }

  console.error('Unhandled request error:', error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

export { app };
