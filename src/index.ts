import { config } from "dotenv";
import e from "express";
import helmet from "helmet";
import cors from 'cors';

import BotClient from "./services/Client";
import { ALLOWED_ORIGINS, PORT } from "./config";
import rateLimit from "express-rate-limit";
import authenticateApiKey from "./middlewares/verifyApiKey";
import status from "./routes/status";

config();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise);
    console.error('📄 Reason:', reason);
});

const app = e();

app.use(helmet())
app.use(cors({
    origin: ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    maxAge: 86400,
}));
app.set('trust proxy', 1);
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

const bot = new BotClient();
bot.init()

app.use(authenticateApiKey);
app.use('/status', status(bot));

app.listen(PORT, () => {
    console.log("Nice try, App is live on", `http://localhost:${PORT}`);
});

