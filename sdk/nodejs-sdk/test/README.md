# Test Documentation

## Test Structure

This directory contains all tests for the @pontx/nodejs-sdk package:

```
test/
├── unit/           # Unit tests for individual functions/modules
├── integration/    # Integration tests for component interactions
├── e2e/            # End-to-end tests for real-world scenarios
├── types/          # TypeScript type tests
└── helpers/        # Shared test utilities and helpers
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
pnpm test:watch

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run e2e tests only
pnpm test:e2e

# Run tests with coverage report
pnpm test:coverage
```

### Coverage Requirements

The project maintains a minimum coverage threshold of **90%** for:
- Lines
- Functions
- Branches
- Statements

Coverage reports are generated in multiple formats:
- Terminal output (text)
- HTML report (coverage/index.html)
- JSON report (coverage/coverage.json)

### Installing Coverage Provider

To run coverage tests, you need to install the coverage provider:

```bash
# Install @vitest/coverage-v8 (recommended)
pnpm add -D @vitest/coverage-v8

# Or install @vitest/coverage-istanbul
pnpm add -D @vitest/coverage-istanbul
```

## Test Categories

### Unit Tests (`test/unit/`)

Test individual functions, classes, or modules in isolation.

**Guidelines:**
- Test one thing at a time
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error conditions

**Example:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildUrl } from '../../src/url-builder';

describe('buildUrl', () => {
  it('should replace path parameters', () => {
    const url = buildUrl('/users/{id}', { id: 123 });
    expect(url).toBe('/users/123');
  });
});
```

### Integration Tests (`test/integration/`)

Test the interaction between multiple modules or components.

**Guidelines:**
- Test complete workflows
- Verify data flow between components
- Use realistic configurations
- Mock external services only

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { createClient } from '../../src';

describe('Client Integration', () => {
  it('should execute complete request with validation', async () => {
    const client = createClient({
      pontxSpecMeta: testMeta,
      validation: { schemas: { ... } }
    });

    const result = await client.users.getUser({ id: 1 });
    expect(result).toBeDefined();
  });
});
```

### E2E Tests (`test/e2e/`)

Test complete user scenarios from start to finish.

**Guidelines:**
- Simulate real-world usage
- Test with realistic data
- May use test servers or HTTP mocking
- Verify performance characteristics

### Type Tests (`test/types/`)

Verify TypeScript type inference and type safety.

**Guidelines:**
- Use `expectTypeOf` from vitest for type assertions
- Test type inference correctness
- Test conditional types
- Use `@ts-expect-error` for negative tests

**Example:**
```typescript
import { expectTypeOf } from 'vitest';
import type { Client, APIMethod } from '../../src';

describe('Type Tests', () => {
  it('should infer response type correctly', () => {
    type UserAPI = APIMethod<{ id: number }, void, { name: string }>;
    expectTypeOf<UserAPI['Response']>().toEqualTypeOf<{ name: string }>();
  });
});
```

## Test Helpers

Shared utilities are available in `test/helpers/test-utils.ts`:

```typescript
import {
  createMockResponse,
  createMockFetch,
  createTestSpecMeta,
  delay,
  createSpy
} from '../helpers/test-utils';
```

## Best Practices

1. **Isolation**: Tests should not depend on each other
2. **Clarity**: Test names should clearly describe what is being tested
3. **Speed**: Keep tests fast (< 100ms for unit tests)
4. **Determinism**: Tests should produce consistent results
5. **Coverage**: Aim for >= 90% code coverage
6. **Maintenance**: Keep tests simple and easy to understand

## Debugging Tests

### Run Single Test File
```bash
pnpm test test/unit/example.test.ts
```

### Run Tests Matching Pattern
```bash
pnpm test -t "buildUrl"
```

### Debug with Console Output
```bash
pnpm test --reporter=verbose
```

### Enable Source Maps
Source maps are enabled by default in the vitest config for easier debugging.

## Configuration

Test configuration is in `vitest.config.ts`:
- Test environment: Node.js
- Coverage provider: v8
- Coverage thresholds: 90%
- Test timeout: 10 seconds
- TypeScript support: enabled

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. Ensure all tests pass before merging:

```bash
# Run all tests and generate coverage
pnpm test:coverage

# Verify coverage meets thresholds
# Coverage report will fail if < 90%
```