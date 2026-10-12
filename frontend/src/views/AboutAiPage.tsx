import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CROP_PHOTOS } from '@/data/cropPhotos';

interface AboutAiViewProps {
  onNavigateDiagnose: () => void;
}

export function AboutAiPage({ onNavigateDiagnose }: AboutAiViewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-5 py-10 sm:px-8 lg:px-12">
      <header className="max-w-3xl border-l-2 border-primary pl-5 sm:pl-7">
        <p className="text-sm font-semibold text-primary">Về AgriAI</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Hiểu kết quả trước khi sử dụng
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          AgriAI dùng ConvNeXt-Tiny để phân loại dấu hiệu bệnh từ ảnh lá. Kết quả giúp bạn có thêm
          thông tin để đối chiếu với cây ngoài thực tế.
        </p>
      </header>
      <section className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <Image
          src={CROP_PHOTOS.rice.imageSrc}
          alt={CROP_PHOTOS.rice.imageAlt}
          width={1536}
          height={1024}
          sizes="(min-width: 1280px) 568px, (min-width: 768px) 50vw, 100vw"
          className="aspect-[4/3] w-full rounded-media object-cover"
        />
        <div className="self-center">
          <h2 className="text-2xl font-semibold">Từ ảnh đến kết quả</h2>
          <ol className="mt-6 grid gap-6 border-l border-border pl-5">
            <li>
              <h3 className="font-semibold">Chọn ảnh rõ nét</h3>
              <p className="mt-1 leading-7 text-muted-foreground">
                Ứng dụng kiểm tra định dạng, dung lượng và khả năng đọc ảnh trước khi tải lên.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Phân loại dấu hiệu trên lá</h3>
              <p className="mt-1 leading-7 text-muted-foreground">
                Mô hình so sánh đặc trưng của ảnh với các lớp cây và bệnh đã được học.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Đọc và đối chiếu</h3>
              <p className="mt-1 leading-7 text-muted-foreground">
                Bạn nhận tên cây, lớp bệnh dự đoán và độ tin cậy. Các kết quả đã lưu có thể xem lại
                trong lịch sử.
              </p>
            </li>
          </ol>
        </div>
      </section>
      <section className="grid gap-8 border-y border-border bg-surface-muted p-6 sm:p-8 md:grid-cols-2 lg:gap-14">
        <div>
          <h2 className="text-2xl font-semibold">Độ tin cậy nói lên điều gì?</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Con số này thể hiện mức độ mô hình nghiêng về lớp dự đoán trong lần phân loại đó. Nó
            không phải cam kết rằng cây chắc chắn mắc bệnh, cũng không phải độ chính xác chung của
            hệ thống.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Khi nào cần thận trọng?</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Ảnh mờ, thiếu sáng, nhiều lá chồng lên nhau hoặc cây nằm ngoài phạm vi mô hình có thể
            cho kết quả không phù hợp. Nếu triệu chứng khác với dự đoán, hãy chụp lại và nhờ chuyên
            gia đối chiếu.
          </p>
        </div>
      </section>
      <section className="max-w-3xl">
        <h2 className="text-2xl font-semibold">Phạm vi hiện tại</h2>
        <p className="mt-4 leading-7 text-muted-foreground">
          Trọng tâm của dự án là phân loại ảnh lá. Grad-CAM đang được nghiên cứu cho phiên bản sau;
          hiện chưa có bản đồ nhiệt để giải thích từng kết quả. Danh mục cây trong cẩm nang không
          đồng nghĩa với danh sách lớp mà mô hình đã được kiểm chứng.
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Kết quả chẩn đoán chỉ mang tính hỗ trợ tham khảo, không thay thế ý kiến chuyên gia.
        </p>
        <Button className="mt-6" onClick={onNavigateDiagnose}>
          Kiểm tra lá <ArrowRight />
        </Button>
      </section>
    </div>
  );
}
