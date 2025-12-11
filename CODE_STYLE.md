# Code Style Guide

This project follows a **functional programming style** across both frontend and backend.

## General Principles

1. **Prefer pure functions** - Functions should avoid side effects when possible
2. **Prefer const** - Use `const` for all declarations
3. **Prefer arrow functions** - Except for React components with memo
4. **Early returns** - Return early to avoid deep nesting
5. **Descriptive names** - Functions should be verbs, variables should be nouns

## Backend (Node.js/Express)

### File Structure

```javascript
/**
 * Module description
 * @module module-name
 */

const express = require('express');
const { dependency } = require('./path');

// ============================================================
// Pure functions for data transformation
// ============================================================

const transformData = (input) => {
  // ...
};

// ============================================================
// Route handlers
// ============================================================

router.get('/endpoint', async (req, res) => {
  // ...
});

module.exports = router;
```

### Async Patterns

**Always use async/await** - No callbacks, no raw promises:

```javascript
// ✅ Good
router.get('/endpoint', async (req, res) => {
  try {
    const data = await dbAll('SELECT * FROM table');
    res.json(data);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// ❌ Bad - callbacks
router.get('/endpoint', (req, res) => {
  db.all('SELECT * FROM table', [], (err, rows) => {
    if (err) { /* ... */ }
    res.json(rows);
  });
});
```

### Helper Functions

Extract pure transformation logic from routes:

```javascript
// ✅ Good - pure function
const buildContactFilter = (contactIds) => {
  if (contactIds.length === 0) {
    return { filter: '', params: [] };
  }
  // ...
  return { filter, params };
};

router.get('/search', async (req, res) => {
  const { filter, params } = buildContactFilter(req.query.contacts);
  // ...
});
```

## Frontend (React)

### Component Structure

```javascript
/**
 * Component description
 * @module components/ComponentName
 */

import React, { useState, useMemo, useCallback, memo } from 'react';

// ============================================================
// Sub-components (if any)
// ============================================================

const SubComponent = memo(({ prop }) => (
  <div>{prop}</div>
));

// ============================================================
// Main component
// ============================================================

const ComponentName = ({ prop1, prop2, onAction }) => {
  // Hooks at top
  const [state, setState] = useState(null);
  
  // Memoized values
  const computed = useMemo(() => /* ... */, [dep]);
  
  // Callbacks
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);
  
  // Render
  return (
    <div onClick={handleClick}>
      {computed}
    </div>
  );
};

export default memo(ComponentName);
```

### Hooks

- Name custom hooks with `use` prefix
- Extract reusable logic into hooks
- Hooks should return objects with named properties:

```javascript
// ✅ Good
export const useInfiniteScroll = (fetchMore, options) => {
  // ...
  return { loaderRef, loadingMore };
};

// ❌ Bad - tuple return
export const useInfiniteScroll = (fetchMore, options) => {
  // ...
  return [loaderRef, loadingMore];
};
```

### Utilities

Pure utility functions go in `src/utils/`:

```javascript
/**
 * Formatting utilities
 * @module utils/format
 */

// ============================================================
// Time formatting
// ============================================================

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  // ...
};

export const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString();
```

## Comments

Use JSDoc for module headers and exported functions:

```javascript
/**
 * Module description
 * @module module-name
 */

/**
 * Function description
 * @param {string} param - Parameter description
 * @returns {Object} Return description
 */
export const myFunction = (param) => {
  // ...
};
```

Use section dividers for organization:

```javascript
// ============================================================
// Section Name
// ============================================================
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `useInfiniteScroll.js` |
| React Components | PascalCase | `SearchBar` |
| Functions | camelCase | `formatRelativeTime` |
| Constants | UPPER_SNAKE_CASE | `MAX_CACHE_SIZE` |
| CSS classes | kebab-case | `message-bubble` |

## Testing

Tests follow the same functional style:

```javascript
describe('moduleName', () => {
  describe('functionName', () => {
    it('should do something', () => {
      const result = functionName(input);
      expect(result).toBe(expected);
    });
  });
});
```

