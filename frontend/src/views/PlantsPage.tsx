import React, { useState } from 'react';
import { Search, ChevronRight, Leaf, ScanLine, X } from 'lucide-react';
import { Plant } from '../types';
import { CORE_PLANT_IDS } from '../data/plantData';

interface PlantsViewProps {
  plants: Plant[];
  onSelectPlant: (plant: Plant) => void;
  onDiagnosePlant: (plant: Plant) => void;
}

const CATEGORIES = ['Tất cả', 'Cây lương thực', 'Cây ăn trái', 'Cây công nghiệp'];

export const PlantsPage: React.FC<PlantsViewProps> = ({ plants, onSelectPlant, onDiagnosePlant }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  const filteredPlants = [...plants].sort((a, b) => {
    const ra = CORE_PLANT_IDS.indexOf(a.id);
    const rb = CORE_PLANT_IDS.indexOf(b.id);
    return (ra < 0 ? 100 : ra) - (rb < 0 ? 100 : rb);
  }).filter((plant) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = plant.name.toLowerCase().includes(q) || plant.scientificName.toLowerCase().includes(q);
    const matchCat = selectedCategory === 'Tất cả' || plant.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const coreCount = plants.filter(p => CORE_PLANT_IDS.includes(p.id)).length;

  return (
    <div className="page-wrap">
      {/* ── Page Hero ── */}
      <div className="page-hero">
        <div className="page-hero-glow-a" aria-hidden="true" />
        <div className="page-hero-glow-b" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="page-hero-eyebrow"><Leaf className="h-3.5 w-3.5" /> Thư Viện Thực Vật Học</span>
              <h1 className="page-hero-title">Danh Mục Cây Trồng</h1>
              <p className="page-hero-desc">
                Tìm hiểu các cây trồng quen thuộc và dấu hiệu bệnh lá thường gặp.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="page-stat-chip">
                <span className="page-stat-value">{plants.length}</span>
                <span className="page-stat-label">Loại cây</span>
              </div>
              <div className="page-stat-chip">
                <span className="page-stat-value">{coreCount}</span>
                <span className="page-stat-label">Tích hợp AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="page-toolbar">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="page-search-icon" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            )}
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên cây hoặc tên khoa học..."
              className="page-search-input"
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setSelectedCategory(cat)}
                className={`page-filter-pill ${selectedCategory === cat ? 'page-filter-pill--active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Plant Grid ── */}
        <div className="pb-16">
          {filteredPlants.length === 0 ? (
            <div className="page-empty">
              <Leaf className="h-10 w-10" style={{ color: 'var(--bio-pulse)', opacity: .5 }} />
              <p className="mt-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Không tìm thấy cây phù hợp
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Thử tìm với từ khóa khác hoặc bỏ chọn bộ lọc.
              </p>
            </div>
          ) : (
            <div className="plants-grid">
              {filteredPlants.map((plant) => {
                const isCore = CORE_PLANT_IDS.includes(plant.id);
                return (
                  <article key={plant.id} className="plant-card group">
                    {/* Photo */}
                    <button type="button" onClick={() => onSelectPlant(plant)}
                      className="plant-card-photo-wrap" aria-label={`Xem chi tiết ${plant.name}`}>
                      <img src={plant.imageUrl} alt={plant.name}
                        className="plant-card-photo" loading="lazy" />
                      <div className="plant-card-photo-shade" aria-hidden="true" />

                      {/* Badges */}
                      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                        <span className="plant-badge plant-badge--cat">{plant.category}</span>
                        {isCore && <span className="plant-badge plant-badge--ai">AI</span>}
                      </div>

                      {/* Hover action */}
                      <div className="plant-card-hover-cta" aria-hidden="true">
                        <ChevronRight className="h-5 w-5" />
                        Xem chi tiết
                      </div>
                    </button>

                    {/* Body */}
                    <div className="plant-card-body">
                      <div>
                        <h3 className="plant-card-name" onClick={() => onSelectPlant(plant)}>
                          {plant.name}
                        </h3>
                        <p className="plant-card-scientific">{plant.scientificName}</p>
                        <p className="plant-card-desc">{plant.description}</p>
                      </div>

                      <div className="plant-card-footer">
                        <button type="button" onClick={() => onSelectPlant(plant)}
                          className="plant-card-link">
                          Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onDiagnosePlant(plant)}
                          className="plant-card-diagnose-btn">
                          <ScanLine className="h-3.5 w-3.5" /> Kiểm tra lá
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
