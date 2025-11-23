import { describe, it, expect } from 'vitest';

/**
 * Example unit test file
 *
 * This file demonstrates the basic structure of a unit test in this project.
 * Unit tests should focus on testing individual functions or modules in isolation.
 */

describe('Example Unit Test', () => {
  it('should demonstrate a basic assertion', () => {
    const result = 1 + 1;
    expect(result).toBe(2);
  });

  it('should test string operations', () => {
    const str = 'hello world';
    expect(str).toContain('world');
    expect(str.toUpperCase()).toBe('HELLO WORLD');
  });

  it('should test object equality', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  it('should test async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  it('should test error throwing', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    expect(throwError).toThrow('Test error');
  });
});

describe('Example Mock Test', () => {
  it('should demonstrate mocking', () => {
    const mockFn = vi.fn((x: number) => x * 2);

    const result = mockFn(5);

    expect(result).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

/**
 * Best Practices for Unit Tests:
 *
 * 1. Test one thing at a time
 * 2. Use descriptive test names
 * 3. Follow the AAA pattern (Arrange, Act, Assert)
 * 4. Keep tests independent
 * 5. Mock external dependencies
 * 6. Test edge cases and error conditions
 * 7. Aim for high coverage (>= 90%)
 */