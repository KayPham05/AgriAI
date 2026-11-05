import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface GoogleIdentityServices {
  initialize: (config: {
    client_id: string;
    callback: (result: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    config: { theme: 'outline'; size: 'large'; locale: 'vi' },
  ) => void;
}

export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);
  useEffect(() => {
    const google = (window as Window & { google?: { accounts: { id: GoogleIdentityServices } } })
      .google;
    const container = element.current;
    if (!clientId || !ready || !google || !container) return;
    let mounted = true;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (mounted) callback.current(credential);
      },
    });
    google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', locale: 'vi' });
    return () => {
      mounted = false;
      container.replaceChildren();
    };
  }, [clientId, ready]);

  if (!clientId) return null;
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={() => setReady(true)}
        onError={() => setError(true)}
      />
      <div ref={element} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Không tải được nút đăng nhập Google.
        </p>
      )}
    </>
  );
}
