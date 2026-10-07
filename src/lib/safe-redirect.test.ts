import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps same-site paths', () => {
    expect(safeRedirectPath('/exams/react?mode=full#top', '/dashboard')).toBe('/exams/react?mode=full#top');
    expect(safeRedirectPath('/', '/dashboard')).toBe('/');
  });

  it('falls back when there is nothing to keep', () => {
    expect(safeRedirectPath(undefined, '/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('', '/dashboard')).toBe('/dashboard');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    'javascript:alert(1)',
    'dashboard',
  ])('rejects %j', (next) => {
    expect(safeRedirectPath(next, '/dashboard')).toBe('/dashboard');
  });
});
