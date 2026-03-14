function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function toLowerTrimmedString(value) {
  return toTrimmedString(value).toLowerCase();
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInteger(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (!Number.isInteger(value)) return null;
    return value;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return null;
}

function normalizeArray(value, { wrapSingle = false } = {}) {
  if (Array.isArray(value)) return value;
  if (wrapSingle && value !== undefined) return [value];
  return null;
}

function validate(rules = [], options = {}) {
  const message = options.message || 'Validation failed';

  return function validateMiddleware(req, res, next) {
    const errors = [];

    for (const rule of rules) {
      const {
        in: location = 'body',
        field,
        required = false,
        type,
        trim = false,
        toLower = false,
        default: defaultValue,
        min,
        max,
        minLen,
        maxLen,
        oneOf,
        regex,
        wrapSingle = false,
        custom,
      } = rule;

      const container = req[location];
      if (!container || typeof container !== 'object') {
        errors.push({ field, message: `Invalid request ${location}` });
        continue;
      }

      let value = container[field];

      const isMissing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '');

      if (isMissing && defaultValue !== undefined) {
        value = defaultValue;
        container[field] = value;
      }

      if (required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        // Optional + not provided
        continue;
      }

      let coerced = value;
      if (type === 'string') {
        if (typeof value === 'object') {
          errors.push({ field, message: `${field} must be a string` });
          continue;
        }
        coerced = toLower ? toLowerTrimmedString(value) : (trim ? toTrimmedString(value) : String(value));
        if (maxLen !== undefined && coerced.length > maxLen) {
          errors.push({ field, message: `${field} must be at most ${maxLen} characters` });
          continue;
        }
        if (minLen !== undefined && coerced.length < minLen) {
          errors.push({ field, message: `${field} must be at least ${minLen} characters` });
          continue;
        }
        if (regex && !regex.test(coerced)) {
          errors.push({ field, message: `${field} is invalid` });
          continue;
        }
      } else if (type === 'number') {
        coerced = toNumber(value);
        if (coerced === null) {
          errors.push({ field, message: `${field} must be a number` });
          continue;
        }
        if (min !== undefined && coerced < min) {
          errors.push({ field, message: `${field} must be >= ${min}` });
          continue;
        }
        if (max !== undefined && coerced > max) {
          errors.push({ field, message: `${field} must be <= ${max}` });
          continue;
        }
      } else if (type === 'integer') {
        coerced = toInteger(value);
        if (coerced === null) {
          errors.push({ field, message: `${field} must be an integer` });
          continue;
        }
        if (min !== undefined && coerced < min) {
          errors.push({ field, message: `${field} must be >= ${min}` });
          continue;
        }
        if (max !== undefined && coerced > max) {
          errors.push({ field, message: `${field} must be <= ${max}` });
          continue;
        }
      } else if (type === 'boolean') {
        coerced = toBoolean(value);
        if (coerced === null) {
          errors.push({ field, message: `${field} must be a boolean` });
          continue;
        }
      } else if (type === 'array') {
        coerced = normalizeArray(value, { wrapSingle });
        if (!coerced) {
          errors.push({ field, message: `${field} must be an array` });
          continue;
        }
      } else if (type === 'object') {
        if (!isPlainObject(value)) {
          errors.push({ field, message: `${field} must be an object` });
          continue;
        }
      }

      if (oneOf && Array.isArray(oneOf) && !oneOf.includes(coerced)) {
        errors.push({ field, message: `${field} must be one of: ${oneOf.join(', ')}` });
        continue;
      }

      if (typeof custom === 'function') {
        const maybeError = custom(coerced, req);
        if (typeof maybeError === 'string' && maybeError) {
          errors.push({ field, message: maybeError });
          continue;
        }
      }

      container[field] = coerced;
    }

    if (errors.length > 0) {
      return res.status(400).json({ message, errors });
    }

    return next();
  };
}

module.exports = {
  validate,
  toInteger,
  toNumber,
  toBoolean,
  toTrimmedString,
  toLowerTrimmedString,
  isPlainObject,
};
