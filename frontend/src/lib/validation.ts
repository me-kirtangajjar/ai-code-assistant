export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email: string): string | undefined => {
  const normalized = email.trim();

  if (!normalized) return 'Email is required.';
  if (normalized.length > 254 || !emailPattern.test(normalized))
    return 'Enter a valid email address.';
  return undefined;
};

export const validatePassword = (password: string): string | undefined => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must contain at least 8 characters.';
  if (password.length > 64) return 'Password must contain at most 64 characters.';
  if (new TextEncoder().encode(password).length > 72) return 'Password is too long when encoded.';
  return undefined;
};

export const validateLoginInput = (email: string, password: string): FieldErrors => ({
  email: validateEmail(email),
  password: validatePassword(password),
});

export const validateRegisterInput = (
  name: string,
  email: string,
  password: string,
): FieldErrors => {
  const normalizedName = name.trim();

  return {
    name:
      normalizedName.length < 2 || normalizedName.length > 100
        ? 'Name must contain between 2 and 100 characters.'
        : undefined,
    email: validateEmail(email),
    password: validatePassword(password),
  };
};

export const hasFieldErrors = (errors: FieldErrors): boolean => Object.values(errors).some(Boolean);

export const focusFirstInvalidField = (
  errors: FieldErrors,
  fieldOrder: readonly (keyof FieldErrors)[],
): void => {
  const firstInvalidField = fieldOrder.find((field) => Boolean(errors[field]));

  if (!firstInvalidField) return;

  window.requestAnimationFrame(() => {
    document.getElementById(firstInvalidField)?.focus();
  });
};
