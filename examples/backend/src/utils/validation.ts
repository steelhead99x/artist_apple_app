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

