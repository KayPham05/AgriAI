'use client';

import { DiagnosePage } from '@/views/DiagnosePage';

export function LandingPredictionSection({ onRequestLogin }: { onRequestLogin: () => void }) {
  return (
    <section
      id="try-prediction"
      aria-labelledby="landing-prediction-title"
      className="border-b border-border"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:py-16 lg:px-12">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id="landing-prediction-title"
            className="text-3xl font-semibold tracking-tight text-balance"
          >
            Dự đoán ngay
          </h2>
          <p className="leading-7 text-muted-foreground">
            Chọn một ảnh lá rõ nét để xem cây trồng, tình trạng dự đoán và độ tin cậy.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Không cần đăng nhập để kiểm tra. Đăng nhập khi muốn lưu kết quả vào tài khoản.
          </p>
        </div>
        <DiagnosePage embedded onRequestLogin={onRequestLogin} />
      </div>
    </section>
  );
}
