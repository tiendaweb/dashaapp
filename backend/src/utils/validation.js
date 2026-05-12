export function validate(schema, payload) {
  const errors = [];

  for (const field of Object.keys(schema)) {
    const rules = schema[field];
    const value = payload[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: 'Campo requerido' });
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push({ field, message: 'Debe ser texto' });
      continue;
    }

    if (rules.min && String(value).length < rules.min) {
      errors.push({ field, message: `Debe tener al menos ${rules.min} caracteres` });
    }

    if (rules.max && String(value).length > rules.max) {
      errors.push({ field, message: `Debe tener máximo ${rules.max} caracteres` });
    }

    if (rules.email) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      if (!ok) errors.push({ field, message: 'Email inválido' });
    }

    if (rules.boolean && typeof value !== 'boolean') {
      errors.push({ field, message: 'Debe ser booleano' });
    }
  }

  return errors;
}
