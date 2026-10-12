import Image from 'next/image';

export default function Loading() {
  return (
    <div
      className="flex flex-col items-center gap-4 px-5 py-12"
      role="status"
      aria-label="Đang tải trang"
    >
      <Image
        src="/images/logo.png"
        alt=""
        width={64}
        height={64}
        className="size-16 object-contain"
      />
      <p className="text-sm text-muted-foreground">Đang mở trang...</p>
    </div>
  );
}
