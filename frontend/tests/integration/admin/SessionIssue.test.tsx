import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  sessionFetch,
  clearSessionIssue,
  getSessionIssue,
  SESSION_ISSUE_EVENT,
} from '@/services/sessionFetch';
import { SessionIssueModal } from '@/components/modals/SessionIssueModal';

afterEach(() => {
  localStorage.clear();
  clearSessionIssue();
  vi.unstubAllGlobals();
});

it('reports administrative revocation without clearing the session and ignores stale tokens', async () => {
  localStorage.setItem('leafai_auth_session', JSON.stringify({ token: 'current' }));
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'admin_logout', message: 'Phiên bị thu hồi.' }), {
          status: 401,
        }),
    ),
  );
  const receive = vi.fn();
  window.addEventListener(SESSION_ISSUE_EVENT, receive);
  await sessionFetch('/api/auth/me', { headers: { Authorization: 'Bearer previous' } });
  expect(receive).not.toHaveBeenCalled();
  const response = await sessionFetch('/api/auth/me', {
    headers: { Authorization: 'Bearer current' },
  });
  expect(receive).toHaveBeenCalledTimes(1);
  expect(getSessionIssue()?.code).toBe('admin_logout');
  expect(localStorage.getItem('leafai_auth_session')).not.toBeNull();
  expect((await response.json()).code).toBe('admin_logout');
  window.removeEventListener(SESSION_ISSUE_EVENT, receive);
});

it('requires acknowledgment rather than Escape to dismiss an administrative logout', () => {
  const confirm = vi.fn();
  render(
    <SessionIssueModal
      issue={{ code: 'admin_logout', message: 'Phiên bị thu hồi.', token: 'current' }}
      onConfirm={confirm}
    />,
  );
  fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});
