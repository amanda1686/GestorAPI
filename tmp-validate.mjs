import 'dotenv/config';
import { crearEjerciente } from './Controllers/ejercientesController.js';

function mockRes(label) {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      console.log(label, 'status', this.statusCode);
      console.log(label, 'payload', JSON.stringify(payload, null, 2));
    },
  };
}

const validReq = {
  body: {
    Nombre: 'Valid',
    Apellidos: 'User',
    email: 'valid' + Date.now() + '@example.com',
    contrasena: 'Secret123!'
  },
};

const invalidReq = {
  body: {
    Nombre: 'Invalid',
    Apellidos: 'User',
    email: 'invalid' + Date.now() + '@example.com',
    contrasena: 'Secret123!',
    Nivel: 'abc'
  },
};

await crearEjerciente(validReq, mockRes('valid'));
await crearEjerciente(invalidReq, mockRes('invalid'));
