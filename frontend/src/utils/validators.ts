export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

export function validateHostname(hostname: string): boolean {
  const re = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return re.test(hostname);
}

export function validatePort(port: number): boolean {
  return port > 0 && port <= 65535;
}

export function validateServiceName(service: string): boolean {
  const re = /^[a-zA-Z0-9._-]+$/;
  return re.test(service);
}

export function validateSQLID(sqlId: string): boolean {
  const re = /^[a-zA-Z0-9]{13}$/;
  return re.test(sqlId);
}

export function validatePositiveNumber(value: number): boolean {
  return value > 0;
}

export function validatePercentage(value: number): boolean {
  return value >= 0 && value <= 100;
}