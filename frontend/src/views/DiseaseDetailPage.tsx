import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReferenceImage } from '@/components/common/ReferenceImage';
import type { Disease } from '../types';
interface DiseaseDetailViewProps {
  disease: Disease;
  onBack: () => void;
  onDiagnosePlant: (plantName: string) => void;
}

export function DiseaseDetailPage({ disease, onBack, onDiagnosePlant }: DiseaseDetailViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 lg:px-12">
      <Button variant="ghost" className="px-0" onClick={onBack}>
        <ArrowLeft />
        Quay lại Cẩm nang Bệnh hại
      </Button>
      <header className="grid items-center gap-8 md:grid-cols-2">
        <ReferenceImage src={disease.heroImage} alt={disease.name} className="rounded-media" />
        <div>
          <p className="text-sm font-medium text-primary">{disease.plant}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {disease.name}
          </h1>
          {disease.scientificName && (
            <p className="mt-2 italic text-muted-foreground">{disease.scientificName}</p>
          )}
          <p className="mt-5 leading-7 text-muted-foreground">{disease.overview}</p>
          <Button className="mt-6" onClick={() => onDiagnosePlant(disease.plant)}>
            Kiểm tra lá <ArrowRight />
          </Button>
        </div>
      </header>
      <div className="grid gap-x-12 gap-y-8 border-t border-border pt-8 md:grid-cols-2">
        <DetailSection title="Triệu chứng điển hình" items={disease.symptoms} />
        <DetailSection
          title="Đặc điểm nhận diện qua hình ảnh"
          items={disease.visualCharacteristics}
        />
        <DetailSection title="Nguyên nhân và điều kiện phát sinh" items={disease.causes} />
        <DetailSection title="Cây ký chủ" items={disease.affectedPlants} />
        <DetailSection title="Biện pháp phòng ngừa" items={disease.prevention} />
        <DetailSection title="Thông tin xử lý tham khảo" items={disease.management} />
      </div>
      <p className="border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
        Kết quả chẩn đoán chỉ mang tính hỗ trợ tham khảo, không thay thế ý kiến chuyên gia.
      </p>
    </div>
  );
}
function DetailSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
