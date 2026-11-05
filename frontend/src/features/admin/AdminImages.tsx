import { useEffect, useState } from 'react';
import { moderateImage, readAdminImage } from '@/services/adminApi';
import Image from 'next/image';
import type { AdminImage } from './adminTypes';
import { Button } from '@/components/ui/button';
import { AdminActionDialog } from './AdminActionDialog';
import { Badge } from '@/components/ui/badge';
import { AdminRecordList, formatAdminDate } from './AdminRecordList';

function UploadedImage({ image, token }: { image: AdminImage; token: string }) {
  const [failed, setFailed] = useState(false);
  const [safeUrl, setSafeUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setSafeUrl(null);
    setFailed(false);
    if (image.status === 'Available') {
      readAdminImage(image.id, token, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setSafeUrl(objectUrl);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.id, image.status, token]);
  return (
    <div className="flex items-start gap-3">
      <div className="admin-upload-preview flex aspect-square w-20 shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-muted sm:w-28">
        {safeUrl && !failed ? (
          <Image
            src={safeUrl}
            alt={`Ảnh tải lên của ${image.userName}`}
            width={384}
            height={216}
            unoptimized
            className="size-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <p className="px-4 text-center text-sm text-muted-foreground">
            {image.status === 'Expired'
              ? 'Ảnh đã hết hạn'
              : image.status === 'Deleted'
                ? 'Ảnh đã được xóa'
                : failed
                  ? 'Không thể hiển thị ảnh'
                  : 'Đang tải ảnh...'}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <h2 className="font-semibold">{image.userName}</h2>
        <p className="mt-2 break-all text-sm text-muted-foreground">{image.userEmail}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tải lên: {formatAdminDate(image.uploadedAt)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Hết hạn: {formatAdminDate(image.expiresAt)}
        </p>
        <Badge variant="outline" className="mt-3">
          {image.status === 'Available'
            ? 'Còn lưu trữ'
            : image.status === 'Expired'
              ? 'Hết hạn'
              : 'Đã xóa'}
        </Badge>
      </div>
    </div>
  );
}
export function AdminImages({ token }: { token: string }) {
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<{ image: AdminImage; kind: 'delete' | 'warnings' } | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <AdminRecordList<AdminImage>
        resource="images"
        token={token}
        revision={revision}
        title="Danh sách ảnh đã tải lên"
        empty="Chưa có dữ liệu ảnh đã tải lên"
      >
        {(image) => (
          <div className="flex flex-col gap-4">
            <UploadedImage image={image} token={token} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!image.userId}
                onClick={() => setAction({ image, kind: 'warnings' })}
              >
                Cảnh báo ảnh vi phạm
              </Button>
              <Button
                variant="outline"
                disabled={image.status === 'Deleted'}
                onClick={() => setAction({ image, kind: 'delete' })}
              >
                Xóa ảnh
              </Button>
            </div>
          </div>
        )}
      </AdminRecordList>
      {action && (
        <AdminActionDialog
          key={`${action.image.id}-${action.kind}`}
          title={action.kind === 'delete' ? 'Xóa ảnh' : 'Cảnh báo ảnh vi phạm'}
          description={`${action.image.userEmail}. ${action.kind === 'delete' ? 'Xóa tệp ảnh khỏi lưu trữ. Kết quả chẩn đoán vẫn được giữ lại.' : 'Gửi cảnh báo vào mục Thông báo của chủ ảnh.'}`}
          confirmText={action.kind === 'delete' ? 'Xác nhận xóa ảnh' : 'Gửi cảnh báo'}
          messageLabel={action.kind === 'warnings' ? 'Nội dung cảnh báo' : undefined}
          onClose={() => setAction(null)}
          onConfirm={async (message) => {
            await moderateImage(token, action.image.id, action.kind, message);
            setRevision((value) => value + 1);
            setNotice(
              action.kind === 'delete'
                ? 'Đã xóa ảnh khỏi lưu trữ.'
                : 'Đã gửi cảnh báo cho chủ ảnh.',
            );
          }}
        />
      )}
    </div>
  );
}
