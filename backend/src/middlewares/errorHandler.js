import { fail } from '../utils/http.js';

export function notFound(_req, res) {
  return fail(res, 'Ruta no encontrada', 404);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = status >= 500 ? 'Error interno del servidor' : err.message || 'Error en la solicitud';
  return fail(res, message, status);
}
