/** @vitest-environment jsdom */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionFooter from '@/components/SessionFooter';
import { useAuthStore } from '@/store/authStore';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

describe('admin session footer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    replace.mockReset();
    useAuthStore.setState({
      isAuthenticated: true,
      sessionExpiresAt: '2030-01-01T00:05:00.000Z',
      logout: useAuthStore.getState().logout,
    });
  });

  it('shows the backend-provided countdown and updates every second', () => {
    render(<SessionFooter />);
    expect(screen.getByText('5:00')).toBeTruthy();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('4:59')).toBeTruthy();
  });

  it('logs out and redirects when the session expires', () => {
    render(<SessionFooter />);

    act(() => vi.advanceTimersByTime(5 * 60 * 1000));

    expect(replace).toHaveBeenCalledWith('/login');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
