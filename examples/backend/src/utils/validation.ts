// Common weak passwords to reject (add more as needed)
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '12345678', 'qwerty', 'abc123',
  'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'admin', 'admin123', 'root', 'toor', 'pass', 'test', 'guest'
];

export function validateEmail(email: string): boolean {
  // More strict email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  // Minimum length increased to 12 characters
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }

  // Maximum length to prevent DoS via bcrypt
  if (password.length > 128) {
    return { valid: false, error: 'Password must be no more than 128 characters long' };
  }

  // Check for complexity requirements (now requires ALL 4 types)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)' };
  }

  // Check against common weak passwords
  const lowerPassword = password.toLowerCase();
  for (const weakPassword of COMMON_WEAK_PASSWORDS) {
    if (lowerPassword.includes(weakPassword)) {
      return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
    }
  }

  // Check for repeated characters (e.g., "aaaaaa")
  if (/(.)\1{5,}/.test(password)) {
    return { valid: false, error: 'Password cannot contain more than 5 repeated characters in a row' };
  }

  // Check for sequential characters (e.g., "123456" or "abcdef")
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    return { valid: false, error: 'Password cannot contain sequential characters (e.g., "123" or "abc")' };
  }

  return { valid: true };
}

export function validateUserType(userType: string): boolean {
  const validTypes = ['booking_agent', 'booking_manager', 'band', 'bar', 'studio', 'user'];
  return validTypes.includes(userType);
}

export function validateRequired(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateFloat(value: any, fieldName: string, min?: number): { valid: boolean; error?: string } {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  return { valid: true };
}

// ============================================================================
// XSS PROTECTION & INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS attacks
 * Strips HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Validate and sanitize user input text
 */
export function validateText(text: string, fieldName: string, maxLength: number = 1000): { valid: boolean; error?: string; sanitized?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }

  // Check for SQL injection patterns (defense in depth - we use parameterized queries)
  const sqlInjectionPatterns = /(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b).*[=;]/i;
  if (sqlInjectionPatterns.test(trimmed)) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }

  return { valid: true, sanitized: sanitizeString(trimmed) };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
}

