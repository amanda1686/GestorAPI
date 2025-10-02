import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import db from './database/db.js';
import ejercientesRoutes from './Routes/ejercientes.js';
import tasacionesRoutes from './Routes/tasaciones.js';
import testigosRoutes from './Routes/testigos.js';
import authRoutes from './Routes/auth.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '10kb' }));
app.use(cors());
app.options('*', cors());
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

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

