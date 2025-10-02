import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import db from './database/db.js';
import ejercientesRoutes from './Routes/ejercientes.js';
import tasacionesRoutes from './Routes/tasaciones.js';
import testigosRoutes from './Routes/testigos.js';
import authRoutes from './Routes/auth.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json({ limit: '10kb' }));
app.use(cors());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAll = allowedOrigins.includes('*');
  const isAllowedOrigin = !origin || allowAll || allowedOrigins.includes(origin);

  if (isAllowedOrigin) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    } else if (allowAll) {
      res.header('Access-Control-Allow-Origin', '*');
    }
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  const requestHeaders = req.headers['access-control-request-headers'];
  res.header('Access-Control-Allow-Headers', requestHeaders ?? 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400');

  if (!isAllowedOrigin) {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(403);
    }
    return res.status(403).json({ error: 'Origen no permitido' });
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use('/auth', authRoutes);
app.use('/ejercientes', ejercientesRoutes);
app.use('/tasaciones', tasacionesRoutes);
app.use('/testigos', testigosRoutes);

db.authenticate()
  .then(() => console.log('[db] Conexion a MySQL establecida'))
  .catch((err) => console.error('[db] Error de conexion:', err));

app.get('/', (req, res) => {
  res.send('Servidor Express funcionando');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});
