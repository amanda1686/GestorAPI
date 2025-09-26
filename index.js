import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import db from './database/db.js';
import ejercientesRoutes from './Routes/ejercientes.js';

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());
app.use('/ejercientes', ejercientesRoutes);

db.authenticate()
  .then(() => console.log('[db] Conexion a MySQL establecida'))
  .catch((err) => console.error('[db] Error de conexion:', err));

app.get('/', (req, res) => {
  res.send('Servidor Express funcionando');
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
