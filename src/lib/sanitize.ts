/**
 * Input Sanitization Utility
 * Protects against XSS, SQL injection, and other common attacks
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return String(input).replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char);
}

export function sanitizeText(input: string): string {
  if (!input) return '';
  
  return String(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEmail(input: string): string {
  if (!input) return '';
  return String(input).toLowerCase().trim().replace(/[^a-z0-9@._+-]/g, '');
}

export function sanitizePhone(input: string): string {
  if (!input) return '';
  
  const cleaned = String(input).trim();
  return cleaned.startsWith('+') 
    ? '+' + cleaned.slice(1).replace(/[^0-9]/g, '')
    : cleaned.replace(/[^0-9]/g, '');
}

export function sanitizeUrl(input: string): string {
  if (!input) return '';
  
  try {
    const url = new URL(String(input).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function sanitizeFilename(input: string): string {
  if (!input) return '';
  
  return String(input)
    .replace(/[/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/^\.+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .trim();
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizer: (value: string) => string = sanitizeText
): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const value = obj[key];
    sanitized[key] = typeof value === 'string' 
      ? sanitizer(value)
      : typeof value === 'object' && value !== null
        ? sanitizeObject(value, sanitizer)
        : value;
  }
  
  return sanitized;
}

const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|\/*|\*\/|;|'|"|`)/g,
  /(\bOR\b.*=.*)/gi,
  /(\bAND\b.*=.*)/gi,
];

export function sanitizeSql(input: string): string {
  if (!input) return '';
  return SQL_PATTERNS.reduce((str, pattern) => str.replace(pattern, ''), String(input)).trim();
}

export function sanitizeJson(input: string): string | null {
  if (!input) return null;
  
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return null;
  }
}

const clamp = (value: number, min?: number, max?: number) => {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
};

export function sanitizeInteger(
  input: any,
  options: { min?: number; max?: number; default?: number } = {}
): number {
  const num = parseInt(String(input), 10);
  return isNaN(num) ? (options.default ?? 0) : clamp(num, options.min, options.max);
}

export function sanitizeFloat(
  input: any,
  options: { min?: number; max?: number; default?: number; decimals?: number } = {}
): number {
  const num = parseFloat(String(input));
  if (isNaN(num)) return options.default ?? 0;
  
  const result = clamp(num, options.min, options.max);
  return options.decimals !== undefined ? parseFloat(result.toFixed(options.decimals)) : result;
}

export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') return input;
  return ['true', '1', 'yes', 'on'].includes(String(input).toLowerCase().trim());
}

export function sanitizeEnum<T extends string>(
  input: any,
  allowedValues: readonly T[],
  defaultValue?: T
): T | undefined {
  const str = String(input).trim();
  return allowedValues.includes(str as T) ? (str as T) : defaultValue;
}

export function truncate(input: string, maxLength: number): string {
  if (!input) return '';
  const str = String(input);
  return str.length <= maxLength ? str : str.slice(0, maxLength);
}

export function deepClean<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    
    const value = obj[key];
    
    if (value === undefined || value === null || value === '') continue;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nestedCleaned = deepClean(value);
      if (Object.keys(nestedCleaned).length > 0) {
        cleaned[key] = nestedCleaned;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

export function sanitizeUserContent(input: string, maxLength: number = 5000): string {
  if (!input) return '';
  
  const cleaned = sanitizeHtml(input)
    .replace(/&lt;br&gt;/gi, '\n')
    .replace(/&lt;p&gt;/gi, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  
  return truncate(cleaned, maxLength);
}

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeObject,
  sanitizeSql,
  sanitizeJson,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeEnum,
  truncate,
  deepClean,
  sanitizeUserContent,
};

