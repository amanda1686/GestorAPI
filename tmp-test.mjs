import 'dotenv/config';
import { crearEjerciente } from './Controllers/ejercientesController.js';

function mockRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      console.log('status', this.statusCode);
      console.log('payload', JSON.stringify(payload, null, 2));
    },
  };
}

const req = {
  body: {
    Nombre: 'Amanda',
    Apellidos: 'Rodriguez',
    email: 'testduplicate@example.com',
    contrasena: 'Secret123!'
  },
};

// create first
await crearEjerciente({ body: req.body }, mockRes());
// create duplicate
await crearEjerciente({ body: req.body }, mockRes());
