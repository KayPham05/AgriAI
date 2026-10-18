'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { restoreAuthSession, type AuthSession } from '@/services/authApi';
import { Button } from '@/components/ui/button';

export function AdminAccess({ children }: { children: (session: AuthSession) => React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; session: AuthSession | null }>({
    loading: true,
    session: null,
  });
  useEffect(() => {
    let active = true;
    restoreAuthSession().then((session) => {
      if (active) setState({ loading: false, session });
    });
    return () => {
      active = false;
    };
  }, []);
  if (!state.loading && state.session?.user.role === 'Admin') return children(state.session);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-5 py-10">
      <h1 className="text-3xl font-bold">Quản trị AgriAI</h1>
      <p role="status" className="text-muted-foreground">
        {state.loading
          ? 'Đang xác thực tài khoản...'
          : state.session
            ? 'Tài khoản này không có quyền Admin.'
            : 'Đăng nhập bằng tài khoản Admin để tiếp tục.'}
      </p>
      {!state.loading && (
        <Button variant="outline" asChild>
          <Link href="/home">Về ứng dụng để đăng nhập</Link>
        </Button>
      )}
    </main>
  );
}
