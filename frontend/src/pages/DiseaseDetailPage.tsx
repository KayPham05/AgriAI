import React from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Disease } from '../types';

interface DiseaseDetailViewProps {
  disease: Disease;
  onBack: () => void;
  onDiagnosePlant: (plantName: string) => void;
}

export const DiseaseDetailPage: React.FC<DiseaseDetailViewProps> = ({
  disease,
  onBack,
  onDiagnosePlant,
}) => {
  return (
    <div className="soft-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#647067] hover:text-[#17211B] p-1 -ml-1 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Cẩm nang Bệnh hại</span>
      </button>

      {/* Hero Header */}
      <div className="soft-workspace-card bg-white rounded-3xl border border-[#E2E8E4] overflow-hidden shadow-sm">
        
        {/* Banner Image */}
        <div className="aspect-21/9 sm:aspect-3/1 overflow-hidden bg-black relative">
          <img
            src={disease.heroImage}
            alt={disease.name}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Bệnh do {disease.category}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-white border border-white/20">
                  {disease.plant}
                </span>
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl">{disease.name}</h1>
              {disease.scientificName && (
                <p className="text-sm italic text-gray-300 mt-1">{disease.scientificName}</p>
              )}
            </div>

            <button
              onClick={() => onDiagnosePlant(disease.plant)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Thử giao diện với {disease.plant}</span>
            </button>
          </div>
        </div>

        {/* Overview Description */}
        <div className="p-6 sm:p-8 border-b border-[#E2E8E4] bg-[#F8FAF9]">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-800 mb-2">
            Tổng quan bệnh lý
          </h3>
          <p className="text-sm sm:text-base text-[#17211B] leading-relaxed">
            {disease.overview}
          </p>
        </div>

        {/* Core Content Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E2E8E4]">
          
          {/* Left Column: Symptoms & Visual Characteristics */}
          <div className="space-y-6 md:pr-4">
            
            {/* Symptoms */}
            <div>
              <h3 className="font-display font-bold text-base text-[#17211B] flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Triệu chứng điển hình</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#647067]">
                {disease.symptoms.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Characteristics */}
            <div className="pt-4 border-t border-[#E2E8E4]">
              <h3 className="font-display font-bold text-base text-[#17211B] flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Đặc điểm nhận diện qua hình ảnh</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#647067]">
                {disease.visualCharacteristics.map((vc, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                    <span className="leading-relaxed">{vc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Common Causes */}
            <div className="pt-4 border-t border-[#E2E8E4]">
              <h3 className="font-display font-bold text-base text-[#17211B] flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Nguyên nhân & Điều kiện phát sinh</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#647067]">
                {disease.causes.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Right Column: Affected Plants, Prevention & Management */}
          <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
            
            {/* Affected Plants */}
            <div>
              <h3 className="font-display font-bold text-base text-[#17211B] mb-2">
                Cây ký chủ mẫn cảm
              </h3>
              <div className="flex flex-wrap gap-2">
                {disease.affectedPlants.map((ap, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-[#F8FAF9] border border-[#E2E8E4] rounded-lg text-xs font-medium text-[#17211B]"
                  >
                    {ap}
                  </span>
                ))}
              </div>
            </div>

            {/* Prevention */}
            <div className="pt-4 border-t border-[#E2E8E4]">
              <h3 className="font-display font-bold text-base text-[#17211B] flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Biện pháp phòng ngừa khuyến nghị</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#647067]">
                {disease.prevention.map((prev, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{prev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Management & Treatment */}
            <div className="pt-4 border-t border-[#E2E8E4]">
              <h3 className="font-display font-bold text-base text-[#17211B] flex items-center gap-2 mb-3">
                <FileCheck className="w-4 h-4 text-purple-700" />
                <span>Phác đồ xử lý & Phòng trị nông nghiệp</span>
              </h3>
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2 text-xs sm:text-sm text-[#17211B]">
                {disease.management.map((mgmt, idx) => (
                  <p key={idx} className="leading-relaxed">
                    • {mgmt}
                  </p>
                ))}
              </div>
              <p className="text-[11px] text-[#647067] mt-2 italic">
                * Khuyến cáo kỹ thuật được tổng hợp và đối chiếu theo tiêu chuẩn bệnh học thực vật IPPC & FAO.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
