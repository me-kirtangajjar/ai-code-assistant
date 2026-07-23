import type { HTMLAttributes, ReactNode } from 'react';

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'div' | 'main';
}

export function Container({
  children,
  className = '',
  as: Element = 'div',
  ...props
}: ContainerProps) {
  return (
    <Element className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`} {...props}>
      {children}
    </Element>
  );
}
