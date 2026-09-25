import React from 'react';
import { ArrowLeft, Sparkles, ChevronRight, CheckCircle2, Leaf } from 'lucide-react';
import { Plant } from '../types';
import { ALL_DISEASES } from '../data/plantData';

interface PlantDetailViewProps {
  plant: Plant;
  onBack: () => void;
  onSelectDisease: (diseaseId: string) => void;
  onDiagnosePlant: (plant: Plant) => void;
}

export const PlantDetailPage: React.FC<PlantDetailViewProps> = ({
  plant,
  onBack,
  onSelectDisease,
  onDiagnosePlant,
}) => {
  return (
    <div className="soft-page max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#647067] hover:text-[#17211B] p-1 -ml-1 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Danh mục Cây trồng</span>
      </button>

      {/* Hero Banner for Plant */}
      <div className="soft-workspace-card bg-white rounded-3xl border border-[#E2E8E4] overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-6 aspect-16/10 md:aspect-auto overflow-hidden bg-slate-100 relative">
          <img
            src={plant.imageUrl}
            alt={plant.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[#17211B]">
            {plant.category}
          </span>
        </div>

        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div>
              <h1 className="font-display font-bold text-3xl text-[#17211B]">{plant.name}</h1>
              <p className="text-sm italic text-[#647067] mt-0.5">{plant.scientificName}</p>
            </div>
            <p className="text-sm text-[#647067] leading-relaxed">
              {plant.description}
            </p>
          </div>

          <div className="pt-4 border-t border-[#E2E8E4] flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => onDiagnosePlant(plant)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Thử giao diện với {plant.name}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section: Detectable Conditions */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display font-bold text-xl text-[#17211B]">
            Dấu hiệu trên lá tham khảo
          </h2>
          <p className="text-xs text-[#647067] mt-1">
            Các tình trạng lá của {plant.name} được liệt kê để tham khảo trong khi mô hình đang huấn luyện.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plant.conditions.map((cond) => {
            const hasDetails = ALL_DISEASES.some((disease) => disease.id === cond.id);
            return (
            <div
              key={cond.id}
              onClick={hasDetails ? () => onSelectDisease(cond.id) : undefined}
              onKeyDown={hasDetails ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectDisease(cond.id); } } : undefined}
              role={hasDetails ? 'button' : undefined}
              tabIndex={hasDetails ? 0 : undefined}
              className={`group bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden flex flex-col justify-between ${hasDetails ? 'hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer' : ''}`}
            >
              <div>
                <div className="aspect-4/3 overflow-hidden bg-slate-100 relative">
                  {cond.imageUrl ? <img
                    src={cond.imageUrl}
                    alt={cond.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ecf3e6] to-[#d9e9ce]"><Leaf className="h-16 w-16 text-[#81a474]" aria-hidden="true" /></div>}
                  {cond.isHealthy && (
                    <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Khỏe mạnh</span>
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <h3 className="font-display font-bold text-sm text-[#17211B] group-hover:text-emerald-700 transition-colors">
                    {cond.name}
                  </h3>
                  {cond.scientificName && (
                    <p className="text-[11px] italic text-[#647067]">{cond.scientificName}</p>
                  )}
                  <p className="text-xs text-[#647067] line-clamp-2 pt-1 leading-relaxed">
                    {cond.shortDescription}
                  </p>
                </div>
              </div>

              {hasDetails && <div className="p-4 pt-0 flex items-center justify-between text-xs text-emerald-700 font-medium">
                <span>Chi tiết bệnh lý</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>}
            </div>
          ); })}
        </div>
      </div>

    </div>
  );
};
