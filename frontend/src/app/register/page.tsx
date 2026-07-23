'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthPageGuard, Button, Card, Container, ErrorMessage, FormField } from '@/components';
import { useAuth } from '@/hooks';
import {
  ApiClientError,
  focusFirstInvalidField,
  hasFieldErrors,
  validateRegisterInput,
  type FieldErrors,
} from '@/lib';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateRegisterInput(name, email, password);
    setFieldErrors(validationErrors);
    setError(null);

    if (hasFieldErrors(validationErrors)) {
      focusFirstInvalidField(validationErrors, ['name', 'email', 'password']);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name, email, password });
      router.replace('/login');
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setFieldErrors({
          name: requestError.getFieldMessage('name'),
          email: requestError.getFieldMessage('email'),
          password: requestError.getFieldMessage('password'),
        });
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Registration could not be completed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageGuard>
      <Container
        as="main"
        className="flex min-h-[calc(100vh-65px)] items-center justify-center py-10"
      >
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <p className="text-sm font-semibold text-blue-700">Create your student account</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Start learning
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Register to execute Python securely and understand reported errors.
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
              {error ? <ErrorMessage message={error} title="Registration failed" /> : null}

              <FormField
                id="name"
                label="Full name"
                type="text"
                autoComplete="name"
                placeholder="Asha Patel"
                value={name}
                error={fieldErrors.name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                  setError(null);
                }}
                required
              />

              <FormField
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="student@example.com"
                value={email}
                error={fieldErrors.email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                  setError(null);
                }}
                required
              />

              <FormField
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                hint="Use 8–64 characters. Your password is sent only to the authentication endpoint."
                value={password}
                error={fieldErrors.password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                  setError(null);
                }}
                minLength={8}
                maxLength={64}
                required
              />

              <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already registered?{' '}
              <Link
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                href="/login"
              >
                Login
              </Link>
            </p>
          </Card>
        </div>
      </Container>
    </AuthPageGuard>
  );
}
