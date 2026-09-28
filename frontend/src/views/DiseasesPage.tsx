import React, { useState } from 'react';
import { Search, ShieldAlert, Microscope, Biohazard, Zap, ChevronRight, X } from 'lucide-react';
import { Disease } from '../types';

interface DiseasesViewProps {
  diseases: Disease[];
  onSelectDisease: (disease: Disease) => void;
  onDiagnoseDiseasePlant: (plantName: string) => void;
}

const CATEGORIES = ['Tất cả', 'Nấm', 'Vi khuẩn', 'Virus'];

const categoryMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Nấm':     { icon: Microscope,  color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  'Vi khuẩn':{ icon: Biohazard,   color: '#a855f7', bg: 'rgba(168,85,247,.12)' },
  'Virus':   { icon: ShieldAlert, color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
};

const getSeverityLabel = (s?: string) => {
  if (s === 'Severe' || s === 'Nặng') return { label: 'Nguy hại cao', color: '#ef4444', bg: 'rgba(239,68,68,.15)' };
  if (s === 'Moderate') return { label: 'Trung bình', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' };
  return null;
};

export const DiseasesPage: React.FC<DiseasesViewProps> = ({ diseases, onSelectDisease, onDiagnoseDiseasePlant }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedPlant, setSelectedPlant] = useState('Tất cả');

  const plantOptions = ['Tất cả', ...Array.from(new Set(diseases.map(d => d.plant)))];

  const filtered = diseases.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      d.name.toLowerCase().includes(q) ||
      d.plant.toLowerCase().includes(q) ||
      (d.scientificName?.toLowerCase().includes(q) ?? false);
    const matchCat =
      selectedCategory === 'Tất cả' ||
      (selectedCategory === 'Nấm' && (d.category === 'Fungal' || d.category === 'Nấm')) ||
      (selectedCategory === 'Vi khuẩn' && (d.category === 'Bacterial' || d.category === 'Vi khuẩn')) ||
      (selectedCategory === 'Virus' && (d.category === 'Viral' || d.category === 'Virus')) ||
      d.category === selectedCategory;
    const matchPlant = selectedPlant === 'Tất cả' || d.plant === selectedPlant;
    return matchSearch && matchCat && matchPlant;
  });

  // stats
  const severeCount = diseases.filter(d => d.status === 'Severe').length;
  const categoryCount = new Set(diseases.map(d => d.plant)).size;

  return (
    <div className="page-wrap">
      {/* ── Page Hero ── */}
      <div className="page-hero">
        <div className="page-hero-glow-a" aria-hidden="true" />
        <div className="page-hero-glow-b" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="page-hero-eyebrow">
                <Microscope className="h-3.5 w-3.5" /> Thư Viện Bệnh Học Nông Nghiệp
              </span>
              <h1 className="page-hero-title">Cẩm Nang Bệnh Hại Cây</h1>
              <p className="page-hero-desc">
                Thông tin tham khảo về triệu chứng và cách phòng ngừa. Khi bệnh lan nhanh, hãy liên hệ cán bộ bảo vệ thực vật địa phương.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="page-stat-chip">
                <span className="page-stat-value">{diseases.length}</span>
                <span className="page-stat-label">Loại bệnh</span>
              </div>
              <div className="page-stat-chip page-stat-chip--danger">
                <span className="page-stat-value">{severeCount}</span>
                <span className="page-stat-label">Nguy hại cao</span>
              </div>
              <div className="page-stat-chip">
                <span className="page-stat-value">{categoryCount}</span>
                <span className="page-stat-label">Cây ký chủ</span>
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
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            )}
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bệnh, cây trồng..."
              className="page-search-input" />
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

          {/* Plant dropdown */}
          <select value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}
            className="page-select">
            {plantOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* ── Disease Grid ── */}
        <div className="pb-16">
          {filtered.length === 0 ? (
            <div className="page-empty">
              <Microscope className="h-10 w-10" style={{ color: 'var(--bio-pulse)', opacity: .5 }} />
              <p className="mt-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Không tìm thấy bệnh hại phù hợp
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Thử tìm với từ khóa khác hoặc đặt lại bộ lọc.
              </p>
            </div>
          ) : (
            <div className="plants-grid">
              {filtered.map((disease) => {
                const catMeta = categoryMeta[
                  disease.category === 'Fungal' ? 'Nấm'
                  : disease.category === 'Bacterial' ? 'Vi khuẩn'
                  : disease.category === 'Viral' ? 'Virus'
                  : disease.category
                ];
                const sevMeta = getSeverityLabel(disease.status);
                const CatIcon = catMeta?.icon ?? Microscope;

                return (
                  <article key={disease.id} className="plant-card group">
                    {/* Photo */}
                    <button type="button" onClick={() => onSelectDisease(disease)}
                      className="plant-card-photo-wrap" aria-label={`Xem chi tiết ${disease.name}`}>
                      <img src={disease.heroImage} alt={disease.name}
                        className="plant-card-photo" loading="lazy" />
                      <div className="plant-card-photo-shade" aria-hidden="true" />

                      {/* Badges */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        {catMeta && (
                          <span className="plant-badge"
                            style={{ color: catMeta.color, background: catMeta.bg, backdropFilter: 'blur(8px)' }}>
                            <CatIcon className="h-3 w-3" /> {
                              disease.category === 'Fungal' ? 'Nấm'
                              : disease.category === 'Bacterial' ? 'Vi khuẩn'
                              : disease.category === 'Viral' ? 'Virus'
                              : disease.category
                            }
                          </span>
                        )}
                        {sevMeta && (
                          <span className="plant-badge"
                            style={{ color: sevMeta.color, background: sevMeta.bg, backdropFilter: 'blur(8px)' }}>
                            {sevMeta.label}
                          </span>
                        )}
                      </div>

                      <div className="plant-card-hover-cta" aria-hidden="true">
                        <ChevronRight className="h-5 w-5" /> Xem chi tiết
                      </div>
                    </button>

                    {/* Body */}
                    <div className="plant-card-body">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                          style={{ color: 'var(--bio-bright)' }}>
                          Cây ký chủ: {disease.plant}
                        </p>
                        <h3 className="plant-card-name" onClick={() => onSelectDisease(disease)}>
                          {disease.name}
                        </h3>
                        {disease.scientificName && (
                          <p className="plant-card-scientific">{disease.scientificName}</p>
                        )}
                        <p className="plant-card-desc">{disease.overview}</p>
                      </div>

                      <div className="plant-card-footer">
                        <button type="button" onClick={() => onSelectDisease(disease)}
                          className="plant-card-link">
                          Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onDiagnoseDiseasePlant(disease.plant)}
                          className="plant-card-diagnose-btn">
                          <Zap className="h-3.5 w-3.5" /> Kiểm tra lá
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
