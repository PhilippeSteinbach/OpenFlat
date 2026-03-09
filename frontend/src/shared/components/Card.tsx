import type { ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

export function Card({ className = '', children, onClick, role: roleProp, 'aria-label': ariaLabel }: CardProps) {
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';
  return (
    <div
      className={`rounded-xl bg-white shadow-sm border border-gray-100 p-4 ${interactive} ${className}`}
      onClick={onClick}
      role={roleProp ?? (onClick ? 'button' : undefined)}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
