import { useState } from 'react';
import Image from 'next/image';
import { moderateImage, type AdminImage } from '@/services/adminApi';
import { Button } from '@/components/ui/button';
import { AdminActionDialog } from './AdminActionDialog';
import { Badge } from '@/components/ui/badge';
import { AdminRecordList, formatAdminDate } from './AdminRecordList';

function UploadedImage({ image }: { image: AdminImage }) {
  const [failed, setFailed] = useState(false);
  const safeUrl =
    image.imageUrl &&
    (/^https?:\/\//i.test(image.imageUrl) || image.imageUrl.startsWith('/uploads/'))
      ? image.imageUrl
      : null;
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-media bg-surface-muted sm:w-48">
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
                : 'Không thể hiển thị ảnh'}
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
  const [action, setAction] = useState<{ image: AdminImage; kind: 'delete' | 'warnings' } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <AdminRecordList<AdminImage>
        resource="images"
        token={token}
        title="Danh sách ảnh đã tải lên"
        empty="Chưa có dữ liệu ảnh đã tải lên"
        revision={revision}
      >
        {(image) => (
          <div className="flex flex-col gap-4">
            <UploadedImage image={image} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setAction({ image, kind: 'warnings' })}>
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
          description={`${action.image.userEmail}. ${action.kind === 'delete' ? 'Xóa ảnh khỏi nơi lưu trữ; lịch sử dự đoán được giữ lại. Thao tác không thể hoàn tác.' : 'Gửi cảnh báo trong ứng dụng đến tài khoản đã đăng ảnh này.'}`}
          confirmText={action.kind === 'delete' ? 'Xác nhận xóa ảnh' : 'Gửi cảnh báo'}
          messageLabel={action.kind === 'warnings' ? 'Nội dung cảnh báo' : undefined}
          onClose={() => setAction(null)}
          onConfirm={async (message) => {
            await moderateImage(token, action.image.id, action.kind, message);
            setNotice(
              action.kind === 'delete'
                ? 'Đã xóa ảnh khỏi nơi lưu trữ.'
                : 'Đã gửi cảnh báo tới chủ ảnh.',
            );
            setRevision((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
