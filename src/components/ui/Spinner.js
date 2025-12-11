import React from 'react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`${sizes[size]} border-primary/20 border-t-primary rounded-full animate-spin ${className}`} />
  );
}

export function CenteredSpinner({ size = 'md' }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner size={size} />
    </div>
  );
}

export default Spinner;

