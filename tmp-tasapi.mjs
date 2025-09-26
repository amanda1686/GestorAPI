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

const req = {
  body: {
    Nombre: 'Tasapi',
    Apellidos: 'Obj',
    email: 'tasapi' + Date.now() + '@example.com',
    contrasena: 'Secret123!',
    tasapi: { foo: 'bar' }
  },
};

await crearEjerciente(req, mockRes('tasapi-obj'));
