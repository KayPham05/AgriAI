'use client';

import { useEffect } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { getSessionIssue, reportSessionIssue, sessionFetch } from '@/services/sessionFetch';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** Receive session revocation while the page is idle, including public catalog pages. */
export function useSessionEvents(token: string | undefined, blocked: boolean) {
  useEffect(() => {
    if (!token || blocked) return;
    const sessionToken = token;
    let disposed = false;
    let denied = false;
    let connecting = false;
    let attempts = 0;
    let connection: HubConnection | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let probe: Promise<void> | undefined;
    const controller = new AbortController();
    const stopped = () => disposed || denied || getSessionIssue()?.token === token;

    // On reconnect/focus, replay the persisted revocation reason if its live event was missed.
    function checkSession(): Promise<void> {
      if (stopped()) return Promise.resolve();
      if (probe) return probe;
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), 8000);
      probe = sessionFetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.any([controller.signal, timeout.signal]),
      })
        .then((response) => {
          if (response.status === 401) {
            denied = true;
            void connection?.stop();
          }
        })
        .catch(() => {
          /* Network interruptions are handled by reconnect, not treated as logout. */
        })
        .finally(() => {
          clearTimeout(timer);
          probe = undefined;
        });
      return probe;
    }

    function scheduleRetry() {
      if (stopped() || retryTimer) return;
      retryTimer = setTimeout(
        () => {
          retryTimer = undefined;
          void start();
        },
        Math.min(1000 * 2 ** Math.min(attempts++, 5), 30000),
      );
    }

    async function start() {
      if (stopped() || connecting || (connection && connection.state !== 'Disconnected')) return;
      connecting = true;
      try {
        if (!connection) {
          const { HubConnectionBuilder, HttpTransportType, LogLevel } = await import(
            '@microsoft/signalr'
          );
          if (stopped()) return;
          connection = new HubConnectionBuilder()
            .withUrl(`${baseUrl}/api/session-events`, {
              accessTokenFactory: () => sessionToken,
              transport: HttpTransportType.LongPolling,
              withCredentials: false,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .configureLogging(LogLevel.None)
            .build();
          connection.on('SessionRevoked', (notice: unknown) => {
            if (!disposed) reportSessionIssue(401, notice, token);
          });
          connection.onreconnecting(() => {
            void checkSession();
          });
          connection.onreconnected(() => {
            attempts = 0;
            void checkSession();
          });
          connection.onclose(() => {
            if (!stopped()) void checkSession().then(scheduleRetry);
          });
        }
        await connection.start();
        attempts = 0;
        if (stopped()) await connection.stop();
      } catch {
        await checkSession();
        scheduleRetry();
      } finally {
        connecting = false;
      }
    }

    const resume = () => {
      if (document.visibilityState === 'hidden' || stopped()) return;
      void checkSession().then(() => {
        void start();
      });
    };
    void start();
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(retryTimer);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      void connection?.stop();
    };
  }, [token, blocked]);
}
