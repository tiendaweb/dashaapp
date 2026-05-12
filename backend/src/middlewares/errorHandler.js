import { fail } from '../utils/http.js';

export function notFound(_req, res) {
  return fail(res, 'Ruta no encontrada', 404);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  return fail(res, err.message || 'Error interno del servidor', status);
}
