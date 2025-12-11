/**
 * Tests for UI components
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Avatar component
const Avatar = ({ name, isGroup = false, size = 'md' }) => {
  const getInitials = (n) => {
    if (!n) return null;
    const hasLetters = /[a-zA-Z]{2,}/.test(n);
    if (!hasLetters) return null;
    return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  const initials = getInitials(name);
  const sizes = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-12 h-12' };

  return (
    <div data-testid="avatar" className={sizes[size]}>
      {isGroup ? (
        <span data-testid="group-icon">👥</span>
      ) : initials ? (
        <span data-testid="initials">{initials}</span>
      ) : (
        <span data-testid="person-icon">👤</span>
      )}
    </div>
  );
};

// Mock Spinner component
const Spinner = ({ size = 'md' }) => (
  <div data-testid="spinner" data-size={size} className="animate-spin" />
);

const CenteredSpinner = ({ size = 'md' }) => (
  <div className="flex items-center justify-center">
    <Spinner size={size} />
  </div>
);

// Mock Tab components
const Tab = ({ active, onClick, children, count }) => (
  <button
    data-testid="tab"
    onClick={onClick}
    className={active ? 'active' : ''}
    data-active={active}
  >
    {children}
    {count > 0 && <span data-testid="tab-count">({count})</span>}
  </button>
);

const TabList = ({ children }) => (
  <div data-testid="tab-list">{children}</div>
);

// Mock SortToggle component
const SortToggle = ({ sortOrder, onToggle }) => (
  <button data-testid="sort-toggle" onClick={onToggle}>
    {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
  </button>
);

describe('Avatar', () => {
  it('should render initials for name', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByTestId('initials')).toHaveTextContent('JD');
  });

  it('should render group icon when isGroup is true', () => {
    render(<Avatar name="Group Chat" isGroup={true} />);
    expect(screen.getByTestId('group-icon')).toBeInTheDocument();
  });

  it('should render person icon for number-only names', () => {
    render(<Avatar name="+1234567890" />);
    expect(screen.getByTestId('person-icon')).toBeInTheDocument();
  });

  it('should render person icon for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByTestId('person-icon')).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Avatar name="Test" size="sm" />);
    expect(screen.getByTestId('avatar')).toHaveClass('w-7');

    rerender(<Avatar name="Test" size="lg" />);
    expect(screen.getByTestId('avatar')).toHaveClass('w-12');
  });
});

describe('Spinner', () => {
  it('should render with animation class', () => {
    render(<Spinner />);
    expect(screen.getByTestId('spinner')).toHaveClass('animate-spin');
  });

  it('should accept size prop', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByTestId('spinner')).toHaveAttribute('data-size', 'lg');
  });
});

describe('CenteredSpinner', () => {
  it('should render spinner inside flex container', () => {
    render(<CenteredSpinner />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});

describe('Tab', () => {
  it('should render with active state', () => {
    render(<Tab active={true} onClick={() => {}}>Messages</Tab>);
    expect(screen.getByTestId('tab')).toHaveClass('active');
    expect(screen.getByTestId('tab')).toHaveAttribute('data-active', 'true');
  });

  it('should render without active state', () => {
    render(<Tab active={false} onClick={() => {}}>Media</Tab>);
    expect(screen.getByTestId('tab')).not.toHaveClass('active');
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Tab active={false} onClick={handleClick}>Links</Tab>);
    fireEvent.click(screen.getByTestId('tab'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should show count when provided', () => {
    render(<Tab active={true} onClick={() => {}} count={42}>Media</Tab>);
    expect(screen.getByTestId('tab-count')).toHaveTextContent('(42)');
  });

  it('should not show count when 0', () => {
    render(<Tab active={true} onClick={() => {}} count={0}>Media</Tab>);
    expect(screen.queryByTestId('tab-count')).not.toBeInTheDocument();
  });
});

describe('TabList', () => {
  it('should render children', () => {
    render(
      <TabList>
        <Tab active={true} onClick={() => {}}>Tab 1</Tab>
        <Tab active={false} onClick={() => {}}>Tab 2</Tab>
      </TabList>
    );
    expect(screen.getAllByTestId('tab')).toHaveLength(2);
  });
});

describe('SortToggle', () => {
  it('should show "Newest" for desc order', () => {
    render(<SortToggle sortOrder="desc" onToggle={() => {}} />);
    expect(screen.getByTestId('sort-toggle')).toHaveTextContent('Newest');
  });

  it('should show "Oldest" for asc order', () => {
    render(<SortToggle sortOrder="asc" onToggle={() => {}} />);
    expect(screen.getByTestId('sort-toggle')).toHaveTextContent('Oldest');
  });

  it('should call onToggle when clicked', () => {
    const handleToggle = jest.fn();
    render(<SortToggle sortOrder="desc" onToggle={handleToggle} />);
    fireEvent.click(screen.getByTestId('sort-toggle'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });
});

