import React, { memo } from 'react';
import { getInitials } from '../../utils/format';

// Generic person icon
const PersonIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Group icon
const GroupIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const Avatar = memo(function Avatar({ name, isGroup = false, size = 'md' }) {
  const initials = getInitials(name);
  
  const sizes = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`${sizes[size]} rounded-full bg-muted flex-shrink-0 flex items-center justify-center font-medium text-muted-foreground`}>
      {isGroup ? (
        <GroupIcon className={iconSizes[size]} />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <PersonIcon className={iconSizes[size]} />
      )}
    </div>
  );
});

export default Avatar;

