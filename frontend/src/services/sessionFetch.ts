export interface SessionIssue {
  code: 'account_locked' | 'admin_logout';
  message: string;
  token: string;
}

export const SESSION_ISSUE_EVENT = 'agrivision:session-issue';
let pendingIssue: SessionIssue | null = null;
export const getSessionIssue = () => pendingIssue;
export const clearSessionIssue = () => {
  pendingIssue = null;
};

export function reportSessionIssue(status: number, body: unknown, token?: string): void {
  if (
    status !== 401 ||
    !token ||
    typeof window === 'undefined' ||
    !body ||
    typeof body !== 'object'
  )
    return;
  const issue = body as { code?: unknown; message?: unknown };
  if (
    (issue.code !== 'account_locked' && issue.code !== 'admin_logout') ||
    typeof issue.message !== 'string'
  )
    return;
  // Ignore late responses from a previous login, including after acknowledgment.
  try {
    const stored =
      localStorage.getItem('leafai_auth_session') ?? sessionStorage.getItem('leafai_auth_session');
    if (!stored || JSON.parse(stored).token !== token) return;
  } catch {
    return;
  }
  pendingIssue = { code: issue.code, message: issue.message, token };
  window.dispatchEvent(
    new CustomEvent<SessionIssue>(SESSION_ISSUE_EVENT, { detail: pendingIssue }),
  );
}

/** Observe authenticated responses without redirecting or polling in the background. */
export async function sessionFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const authorization = new Headers(init?.headers).get('Authorization');
  if (
    response.status !== 401 ||
    !authorization?.startsWith('Bearer ') ||
    typeof window === 'undefined'
  )
    return response;
  const body = await response
    .clone()
    .json()
    .catch(() => null);
  reportSessionIssue(response.status, body, authorization.slice(7));
  return response;
}
