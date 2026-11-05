import { useEffect, useState } from 'react';
import { EmailCodeForm } from '@/components/modals/EmailCodeForm';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getEmailTwoFactor, startEmailTwoFactor, verifyEmailTwoFactor } from '@/services/authApi';

export function EmailTwoFactorSettings({ token }: { token: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [challenge, setChallenge] = useState<{ id: string; enable: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void getEmailTwoFactor(token, controller.signal)
      .then((status) => {
        if (!controller.signal.aborted) setEnabled(status.enabled);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Không thể tải trạng thái xác thực hai lớp. Vui lòng tải lại trang.');
      });
    return () => controller.abort();
  }, [token]);

  async function begin(enable: boolean) {
    setPending(true);
    setError('');
    try {
      const result = await startEmailTwoFactor(token, enable);
      setChallenge({ id: result.challengeId, enable });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi mã xác minh.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="mt-2 flex min-h-11 items-center gap-3">
        <Checkbox
          checked={enabled === true}
          disabled={enabled === null || pending || challenge !== null}
          onCheckedChange={(checked) => void begin(checked === true)}
        />
        Xác thực hai lớp qua email
      </Label>
      <p className="text-sm text-muted-foreground">
        Khi bật, mỗi lần đăng nhập sẽ cần mã xác minh gửi đến email tài khoản.
      </p>
      {pending && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Đang gửi mã…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={challenge !== null}
        onOpenChange={(open) => {
          if (!open) setChallenge(null);
        }}
      >
        {challenge && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {challenge.enable ? 'Bật xác thực hai lớp' : 'Tắt xác thực hai lớp'}
              </DialogTitle>
              <DialogDescription>
                Nhập mã 8 chữ số vừa được gửi đến email của bạn.
              </DialogDescription>
            </DialogHeader>
            <EmailCodeForm
              key={challenge.id}
              onVerify={async (code) => {
                await verifyEmailTwoFactor(token, challenge.id, code, challenge.enable);
                setEnabled(challenge.enable);
                setChallenge(null);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
