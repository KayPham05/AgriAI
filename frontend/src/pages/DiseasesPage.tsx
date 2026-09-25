import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Disease } from '../types';
import { ALL_DISEASES } from '../data/plantData';

interface DiseasesViewProps {
  onSelectDisease: (disease: Disease) => void;
  onDiagnoseDiseasePlant: (plantName: string) => void;
}

export const DiseasesPage: React.FC<DiseasesViewProps> = ({
  onSelectDisease,
  onDiagnoseDiseasePlant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedPlant, setSelectedPlant] = useState<string>('Tất cả');

  const categories = ['Tất cả', 'Nấm', 'Vi khuẩn', 'Virus'];
  const plantOptions = ['Tất cả', ...Array.from(new Set(ALL_DISEASES.map((disease) => disease.plant)))];

  const filteredDiseases = ALL_DISEASES.filter((dis) => {
    const matchesSearch = 
      dis.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dis.plant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dis.scientificName && dis.scientificName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      selectedCategory === 'Tất cả' || 
      (selectedCategory === 'Nấm' && (dis.category === 'Fungal' || dis.category === 'Nấm')) ||
      (selectedCategory === 'Vi khuẩn' && (dis.category === 'Bacterial' || dis.category === 'Vi khuẩn')) ||
      (selectedCategory === 'Virus' && (dis.category === 'Viral' || dis.category === 'Virus')) ||
      dis.category === selectedCategory;

    const matchesPlant = selectedPlant === 'Tất cả' || dis.plant === selectedPlant;

    return matchesSearch && matchesCategory && matchesPlant;
  });

  return (
    <div className="soft-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E4] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Thư Viện Bệnh Học Nông Nghiệp</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#17211B]">
            Cẩm Nang Bệnh Hại Cây Trồng
          </h1>
          <p className="text-sm text-[#647067] mt-1 max-w-xl">
            Thông tin tham khảo về triệu chứng và cách phòng ngừa. Khi cây bệnh lan nhanh, hãy hỏi cán bộ bảo vệ thực vật tại địa phương.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#647067] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên bệnh hoặc tác nhân..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-[#647067] hover:text-[#17211B] border border-[#E2E8E4]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Plant Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs text-[#647067]">
          <span>Lọc theo cây trồng:</span>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="bg-white border border-[#E2E8E4] text-[#17211B] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20 cursor-pointer"
          >
            {plantOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Disease Cards Grid */}
      {filteredDiseases.length === 0 ? (
        <div className="py-16 text-center text-[#647067] bg-white rounded-3xl border border-[#E2E8E4]">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#CBD5E1]" />
          <h3 className="font-display font-bold text-lg text-[#17211B]">Không tìm thấy bệnh hại phù hợp</h3>
          <p className="text-xs text-[#647067] mt-1">Hãy thử tìm với từ khóa khác hoặc đặt lại bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiseases.map((disease) => (
            <div
              key={disease.id}
              className="soft-card group bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div 
                  className="aspect-16/10 overflow-hidden bg-slate-100 relative cursor-pointer"
                  onClick={() => onSelectDisease(disease)}
                >
                  <img
                    src={disease.heroImage}
                    alt={disease.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white">
                      {disease.category}
                    </span>
                    {disease.status === 'Severe' && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                        Nguy hại cao
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                    Cây ký chủ: {disease.plant}
                  </span>
                  <h3 
                    onClick={() => onSelectDisease(disease)}
                    className="font-display font-bold text-lg text-[#17211B] group-hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {disease.name}
                  </h3>
                  {disease.scientificName && (
                    <p className="text-xs italic text-[#647067]">{disease.scientificName}</p>
                  )}
                  <p className="text-xs text-[#647067] line-clamp-3 leading-relaxed pt-1">
                    {disease.overview}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-[#E2E8E4] flex items-center justify-between">
                <button
                  onClick={() => onSelectDisease(disease)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDiagnoseDiseasePlant(disease.plant)}
                  className="text-xs font-medium text-[#647067] hover:text-[#17211B] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Thử giao diện</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
