import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './db.js';
import { seedDatabase } from './seed.js';
import { startAutoPlanEngine } from './autoPlanEngine.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes (Mount on both /api/* and /* for Vercel Serverless rewrites)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/user', userRoutes);
app.use('/user', userRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'ZooPay Buy/Sell Platform' });
});

// Serve frontend build static files in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('ZooPay Server is running. Frontend build static file available after npm run build.');
    }
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`ZooPay Server listening on http://localhost:${PORT}`);
  });
}

export default app;
