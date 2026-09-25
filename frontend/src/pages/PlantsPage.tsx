import React, { useState } from 'react';
import { Search, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { Plant } from '../types';
import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from '../data/plantData';

interface PlantsViewProps {
  onSelectPlant: (plant: Plant) => void;
  onDiagnosePlant: (plant: Plant) => void;
}

export const PlantsPage: React.FC<PlantsViewProps> = ({ onSelectPlant, onDiagnosePlant }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  const categories = ['Tất cả', 'Cây lương thực', 'Cây ăn trái', 'Cây công nghiệp'];

  const filteredPlants = [...SUPPORTED_PLANTS].sort((first, second) => {
    const firstRank = CORE_PLANT_IDS.indexOf(first.id);
    const secondRank = CORE_PLANT_IDS.indexOf(second.id);
    return (firstRank < 0 ? 100 : firstRank) - (secondRank < 0 ? 100 : secondRank);
  }).filter((plant) => {
    const matchesSearch = 
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || plant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="soft-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E4] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Thư Viện Thực Vật Học</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#17211B]">
            Danh Mục Cây Trồng
          </h1>
          <p className="text-sm text-[#647067] mt-1 max-w-xl">
            Tìm hiểu các cây trồng quen thuộc và dấu hiệu bệnh lá thường gặp. Danh mục này chưa thể hiện phạm vi mô hình đang huấn luyện.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#647067] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên cây hoặc tên khoa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-[#647067] hover:text-[#17211B] border border-[#E2E8E4] hover:bg-[#F8FAF9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plants Grid */}
      {filteredPlants.length === 0 ? (
        <div className="py-16 text-center text-[#647067] bg-white rounded-3xl border border-[#E2E8E4]">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#CBD5E1]" />
          <h3 className="font-display font-bold text-lg text-[#17211B]">Không tìm thấy giống cây phù hợp</h3>
          <p className="text-xs text-[#647067] mt-1">Vui lòng thử tìm với từ khóa khác hoặc bỏ chọn bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              className="soft-card group bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div 
                  className="aspect-16/10 overflow-hidden bg-slate-100 relative cursor-pointer"
                  onClick={() => onSelectPlant(plant)}
                >
                  <img
                    src={plant.imageUrl}
                    alt={plant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#17211B] shadow-xs">
                    {plant.category}
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 
                        onClick={() => onSelectPlant(plant)}
                        className="font-display font-bold text-lg text-[#17211B] group-hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        {plant.name}
                      </h3>
                      <p className="text-xs italic text-[#647067]">{plant.scientificName}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#647067] line-clamp-2 leading-relaxed pt-1">
                    {plant.description}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="px-5 pb-5 pt-3 border-t border-[#E2E8E4] flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelectPlant(plant)}
                  className="text-xs font-semibold text-[#17211B] hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDiagnosePlant(plant)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-200" />
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
