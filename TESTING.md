# Testing Guide

This document provides comprehensive information about testing in the Artist Space mobile application.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

---

## Overview

The Artist Space app uses **Jest** and **React Native Testing Library** for testing. Our test suite covers:

- ✅ **Unit Tests** - Utility functions and business logic
- ✅ **Component Tests** - React components with user interactions
- ✅ **Integration Tests** - Component integration and data flow
- ⏳ **E2E Tests** - Full user workflows (planned)

---

## Test Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Dependencies include:
# - jest
# - @testing-library/react-native
# - @testing-library/jest-native
```

### Configuration

Tests are configured in `jest.config.js` with:

- **Test Environment**: `node` for utilities, `jsdom` for components
- **Transform**: Babel for TypeScript/JSX
- **Setup Files**: `jest.setup.js` for global mocks
- **Module Name Mapper**: Path aliases and asset mocks

---

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Specific Test Files

```bash
# Run a specific test file
npm test dateFormatters.test.ts

# Run tests matching a pattern
npm test Button
```

### Test Suites

```bash
# Run only unit tests
npm test -- src/utils

# Run only component tests
npm test -- src/components

# Run only screen tests
npm test -- src/screens
```

---

## Test Structure

### Directory Structure

```
src/
├── utils/
│   ├── dateFormatters.ts
│   └── __tests__/
│       └── dateFormatters.test.ts
├── components/
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── StatusBadge.tsx
│       └── __tests__/
│           ├── Button.test.tsx
│           ├── Card.test.tsx
│           └── StatusBadge.test.tsx
└── screens/
    └── __tests__/
        └── (screen tests)
```

### Test File Naming

- Unit tests: `[filename].test.ts`
- Component tests: `[ComponentName].test.tsx`
- Integration tests: `[feature].integration.test.tsx`

---

## Writing Tests

### Unit Tests Example

```typescript
// src/utils/__tests__/dateFormatters.test.ts
import { formatDate } from '../dateFormatters';

describe('formatDate', () => {
  it('should format date string correctly', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/Jan 15, 2024/);
  });
});
```

### Component Tests Example

```typescript
// src/components/common/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Press Me" onPress={onPressMock} />
    );

    fireEvent.press(getByText('Press Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
```

### Accessibility Tests

```typescript
it('should have proper accessibility label', () => {
  const { getByLabelText } = render(
    <Button
      title="Save"
      onPress={() => {}}
      accessibilityLabel="Save changes"
    />
  );

  expect(getByLabelText('Save changes')).toBeTruthy();
});
```

---

## Coverage

### Current Test Coverage

| Category | Files | Coverage | Status |
|----------|-------|----------|--------|
| Utilities | 1/1 | 100% | ✅ All tests passing (26 tests) |
| Components | 1/15 | 7% | ⚠️  StatusBadge: 26 tests (20 passing, 6 need fixes) |
| Components | - | - | 🚧 Button & Card: Babel parsing issues (being investigated) |
| Screens | 0/17 | 0% | ⏳ Pending |
| Services | 0/8 | 0% | ⏳ Pending |

**Overall Coverage Goal**: 80%

**Current Status** (as of latest commit):
- ✅ Jest configuration complete and working
- ✅ dateFormatters tests: 26/26 passing
- ⚠️  StatusBadge tests: 20/26 passing (6 minor test fixes needed)
- 🚧 Button & Card tests: Infrastructure ready, troubleshooting Babel configuration

### Generating Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# View coverage report
open coverage/index.html
```

### Coverage Thresholds

```javascript
// jest.config.js
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

---

## Best Practices

### 1. Test Organization

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    // Rendering tests
  });

  describe('Interaction', () => {
    // User interaction tests
  });

  describe('Accessibility', () => {
    // Accessibility tests
  });

  describe('Edge Cases', () => {
    // Edge case tests
  });
});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should update count when button is pressed', () => {
  // Arrange
  const { getByText } = render(<Counter />);

  // Act
  fireEvent.press(getByText('Increment'));

  // Assert
  expect(getByText('Count: 1')).toBeTruthy();
});
```

### 3. Test Isolation

```typescript
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  cleanup();
});
```

### 4. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('../services/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: [] }))
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn()
};
```

### 5. Test User Interactions

```typescript
// Good - Test user behavior
it('should navigate when button is pressed', () => {
  const { getByText } = render(<Screen navigation={mockNav} />);
  fireEvent.press(getByText('Go to Profile'));
  expect(mockNav.navigate).toHaveBeenCalledWith('Profile');
});

// Avoid - Testing implementation details
it('should call handlePress function', () => {
  // Don't test internal function calls
});
```

### 6. Accessibility Testing

Always include accessibility tests:

```typescript
describe('Accessibility', () => {
  it('should have button role', () => {
    const { getByRole } = render(<Button title="Save" onPress={() => {}} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('should have proper label', () => {
    const { getByLabelText } = render(
      <Button title="Save" accessibilityLabel="Save changes" onPress={() => {}} />
    );
    expect(getByLabelText('Save changes')).toBeTruthy();
  });
});
```

### 7. Async Testing

```typescript
it('should load data on mount', async () => {
  const { findByText } = render(<DataScreen />);

  // Wait for async operation
  await waitFor(() => {
    expect(findByText('Data loaded')).toBeTruthy();
  });
});
```

### 8. Snapshot Testing (Use Sparingly)

```typescript
it('should match snapshot', () => {
  const { toJSON } = render(<Component />);
  expect(toJSON()).toMatchSnapshot();
});
```

---

## Test Categories

### Unit Tests

**Purpose**: Test individual functions and utilities in isolation

**Examples**:
- `dateFormatters.test.ts` - Date/time formatting functions
- `validation.test.ts` - Form validation utilities
- `helpers.test.ts` - Helper functions

**Run**: `npm test -- src/utils`

### Component Tests

**Purpose**: Test React components with user interactions

**Examples**:
- `Button.test.tsx` - Button component with all variants
- `Card.test.tsx` - Card component with different props
- `StatusBadge.test.tsx` - Status badge with all types

**Run**: `npm test -- src/components`

### Integration Tests

**Purpose**: Test how components work together

**Examples**:
- Form submission flows
- Navigation between screens
- Data fetching and display

**Run**: `npm test -- integration`

### Screen Tests

**Purpose**: Test full screen components

**Examples**:
- User flows through screens
- Screen navigation
- Data loading and error states

**Run**: `npm test -- src/screens`

---

## Continuous Integration

Tests run automatically on:

- ✅ **Pre-commit** - Fast unit tests
- ✅ **Pull Request** - Full test suite
- ✅ **Main Branch** - Full suite + coverage

---

## Debugging Tests

### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### Debug Single Test

```bash
# Run test in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand Button.test.tsx
```

### Verbose Output

```bash
# Show detailed test output
npm test -- --verbose

# Show which tests are running
npm test -- --verbose --watch
```

---

## Common Testing Patterns

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react-hooks';

it('should update value', () => {
  const { result } = renderHook(() => useCustomHook());

  act(() => {
    result.current.updateValue('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

### Testing Context

```typescript
const wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthValue}>
    {children}
  </AuthContext.Provider>
);

const { getByText } = render(<Component />, { wrapper });
```

### Testing Navigation

```typescript
const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

const { getByText } = render(
  <Screen navigation={navigation} />
);

fireEvent.press(getByText('Next'));
expect(mockNavigate).toHaveBeenCalledWith('NextScreen');
```

---

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Useful Commands

```bash
# Update snapshots
npm test -- -u

# Run tests related to changed files
npm test -- --onlyChanged

# Run tests in watch mode
npm test -- --watch

# Clear test cache
npm test -- --clearCache
```

---

## Contributing

When adding new features:

1. ✅ Write tests first (TDD approach recommended)
2. ✅ Ensure tests pass: `npm test`
3. ✅ Check coverage: `npm test -- --coverage`
4. ✅ Include accessibility tests
5. ✅ Update this documentation if needed

---

## Troubleshooting

### Tests Failing After Dependency Update

```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Mock Issues

```bash
# Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Snapshot Mismatches

```bash
# Review snapshot differences
npm test -- --verbose

# Update snapshots if changes are intentional
npm test -- -u
```

---

**Last Updated**: November 2024

For questions or issues, please contact the development team or open an issue in the repository.
