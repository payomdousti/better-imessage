import React, { memo } from 'react';

export const Tab = memo(function Tab({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active 
          ? 'border-primary text-foreground' 
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
      {count > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>}
    </button>
  );
});

export const TabList = memo(function TabList({ children, className = '' }) {
  return (
    <div className={`flex border-b border-border/50 ${className}`}>
      {children}
    </div>
  );
});

export default Tab;

