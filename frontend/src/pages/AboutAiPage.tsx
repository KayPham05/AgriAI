import React from 'react';
import { ArrowRight, Camera, Leaf, Microscope, Sparkles } from 'lucide-react';

interface AboutAiViewProps { onNavigateDiagnose: () => void; }

export const AboutAiPage: React.FC<AboutAiViewProps> = ({ onNavigateDiagnose }) => (
  <div className="nature-about-page bg-[#f7f8f2] pb-20">
    <section className="relative overflow-hidden bg-[#e8efe2]">
      <img src="/images/vietnam-rice-leaves.png" alt="Lá lúa ngoài đồng lúc sáng sớm" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="relative bg-gradient-to-r from-[#173e2a]/95 via-[#173e2a]/82 to-[#173e2a]/15">
        <div className="mx-auto max-w-7xl px-5 py-20 text-white sm:px-8 lg:px-12">
          <span className="text-sm font-bold uppercase tracking-[.18em] text-[#d2e6bd]">Về dự án LeafAI</span>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">Công nghệ bắt đầu từ sự thấu hiểu cây trồng.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/90">Nhóm đang huấn luyện mô hình riêng để nhận diện bệnh trên lá cây. Giao diện hiện tại giúp thử cách chụp ảnh, xem thông tin và hiểu kết quả tương lai.</p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
      <div className="max-w-2xl"><span className="text-sm font-bold uppercase tracking-[.18em] text-[#66864d]">Cách LeafAI được thiết kế</span><h2 className="mt-3 text-3xl font-bold text-[#173e2a] sm:text-4xl">Từ ảnh lá đến thông tin dễ hiểu</h2><p className="mt-4 text-base leading-8 text-[#607163]">Hiện tại frontend kiểm tra tệp ảnh, gửi ảnh đến Backend Demo và hiển thị phản hồi giả lập. Mô hình phân loại vẫn đang được huấn luyện.</p></div>
      <div className="nature-about-grid mt-10 grid gap-5 md:grid-cols-3">
        {[
          { icon: Camera, title: '1. Chuẩn bị ảnh', text: 'Chọn ảnh lá rõ nét. Ứng dụng kiểm tra định dạng, dung lượng và khả năng mở tệp.' },
          { icon: Microscope, title: '2. Mô hình phân loại', text: 'ConvNeXt-Tiny đang được nhóm huấn luyện để dự đoán loại cây và nhãn bệnh từ ảnh lá.' },
          { icon: Sparkles, title: '3. Xem kết quả', text: 'Bản demo trình bày loại cây, tên bệnh và độ tin cậy từ phản hồi backend.' },
        ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-[26px] border border-[#dce6d5] bg-white p-7 shadow-[0_12px_36px_rgba(46,77,47,.06)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf1e3] text-[#2d6840]"><Icon className="h-6 w-6" /></span><h3 className="mt-7 text-xl font-bold text-[#173e2a]">{title}</h3><p className="mt-3 text-sm leading-7 text-[#607163]">{text}</p></div>)}
      </div>
    </section>

    <section className="bg-[#eaf1e5] py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
        <img src="/images/vietnam-rice-farmer.png" alt="Người nông dân quan sát lá lúa tại ruộng" className="aspect-[4/3] w-full rounded-[28px] object-cover object-right shadow-[0_18px_40px_rgba(36,92,58,.13)]" loading="lazy" />
        <div><span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.15em] text-[#66864d]"><Leaf className="h-4 w-4" /> Giải thích bằng hình ảnh</span><h2 className="mt-4 text-3xl font-bold leading-tight text-[#173e2a]">Grad-CAM là một công cụ để kiểm tra mô hình.</h2><p className="mt-5 text-base leading-8 text-[#607163]">Trong kế hoạch nghiên cứu, Grad-CAM sẽ cho thấy vùng ảnh mà mô hình chú ý khi phân loại. Vùng sáng chỉ là gợi ý để đối chiếu với triệu chứng, không tự chứng minh kết quả đúng. Tính năng này chưa được nối vào luồng upload demo.</p><button type="button" onClick={onNavigateDiagnose} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#245c3a] px-6 py-3.5 font-semibold text-white hover:bg-[#194b2e]">Thử upload ảnh lá <ArrowRight className="h-4 w-4" /></button></div>
      </div>
    </section>
  </div>
);
