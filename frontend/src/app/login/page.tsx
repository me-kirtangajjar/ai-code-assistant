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
  validateLoginInput,
  type FieldErrors,
} from '@/lib';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateLoginInput(email, password);
    setFieldErrors(validationErrors);
    setError(null);

    if (hasFieldErrors(validationErrors)) {
      focusFirstInvalidField(validationErrors, ['email', 'password']);
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace('/dashboard');
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setFieldErrors({
          email: requestError.getFieldMessage('email'),
          password: requestError.getFieldMessage('password'),
        });
      }

      setError(
        requestError instanceof Error ? requestError.message : 'Login could not be completed.',
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
            <p className="text-sm font-semibold text-blue-700">Student workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Log in to run Python and review educational error feedback.
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
              {error ? <ErrorMessage message={error} title="Login failed" /> : null}

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
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                error={fieldErrors.password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                  setError(null);
                }}
                required
              />

              <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Logging in…' : 'Login'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              New to the platform?{' '}
              <Link
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                href="/register"
              >
                Create an account
              </Link>
            </p>
          </Card>
        </div>
      </Container>
    </AuthPageGuard>
  );
}
