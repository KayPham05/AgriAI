import Image from 'next/image';

export function AppSplashScreen() {
  return (
    <div
      className="grid min-h-[100dvh] place-items-center bg-background px-5"
      role="status"
      aria-label="Đang tải AgriAI"
    >
      <div className="text-center">
        <Image
          src="/images/logo.png"
          alt="AgriAI"
          width={64}
          height={64}
          className="mx-auto size-16 object-contain"
        />
        <p className="mt-4 text-sm text-muted-foreground">Đang mở AgriAI...</p>
      </div>
    </div>
  );
}
