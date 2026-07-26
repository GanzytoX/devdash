import express from "express";
import cors from "cors";
import { config, validateConfig } from "./config";
import { securityHeaders } from "./security";
import router from "./routes";

// Validate configurations at startup
validateConfig();

const app = express();

app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.nodeEnv !== 'production' || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '32kb' }));

// Mount routes
app.use(router);

export { app };
