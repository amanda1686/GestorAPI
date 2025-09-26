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
    Nombre: 'Estado',
    Apellidos: 'Incorrecto',
    email: 'estado' + Date.now() + '@example.com',
    contrasena: 'Secret123!',
    estado: 'Activo'
  },
};

await crearEjerciente(req, mockRes('estado-caso'));
