import React, { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  onClick,
}) => {
  const baseClasses = 'glass-panel p-4 sm:p-6 rounded-2xl';
  const hoverClasses = hoverEffect ? 'glass-panel-hover cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
