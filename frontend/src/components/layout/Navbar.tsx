'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  const navigationLinkClass = (href: string): string =>
    `rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
      pathname === href || (href === '/history' && pathname.startsWith('/history/'))
        ? 'bg-blue-50 text-blue-800'
        : 'text-slate-700 hover:bg-slate-50'
    }`;

  const handleLogout = (): void => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 font-mono text-sm font-bold text-white">
            {'</>'}
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-950">Code Insight</span>
            <span className="hidden text-xs text-slate-500 sm:block">AI Error Feedback</span>
          </span>
        </Link>

        {!isLoading && isAuthenticated ? (
          <>
            <nav
              className="order-3 flex w-full items-center justify-center gap-1 border-t border-slate-100 pt-3 sm:order-none sm:w-auto sm:border-0 sm:pt-0"
              aria-label="Student navigation"
            >
              <Link
                className={navigationLinkClass('/dashboard')}
                href="/dashboard"
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
              >
                Dashboard
              </Link>
              <Link
                className={navigationLinkClass('/history')}
                href="/history"
                aria-current={pathname.startsWith('/history') ? 'page' : undefined}
              >
                History
              </Link>
              <Link
                className={navigationLinkClass('/profile')}
                href="/profile"
                aria-current={pathname === '/profile' ? 'page' : undefined}
              >
                Profile
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-600 lg:inline">
                {user?.name ?? 'Student'}
              </span>
              <Button onClick={handleLogout} type="button" variant="secondary">
                Logout
              </Button>
            </div>
          </>
        ) : null}

        {!isLoading && !isAuthenticated ? (
          <nav className="flex items-center gap-2" aria-label="Authentication">
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
              href="/register"
            >
              Register
            </Link>
          </nav>
        ) : null}
      </Container>
    </header>
  );
}
