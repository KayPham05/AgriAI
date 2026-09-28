import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, Eye, History, LayoutGrid, Leaf, List,
  Search, ScanLine, Trash2, X, TrendingUp,
} from 'lucide-react';
import { DiagnosisResult } from '../types';
import { DeleteConfirmModal } from '../components/modals/DeleteConfirmModal';

interface HistoryViewProps {
  history: DiagnosisResult[];
  onSelectResult: (result: DiagnosisResult) => void;
  onDeleteResult: (id: string) => void;
  onNavigateDiagnose: () => void;
}

export const HistoryPage: React.FC<HistoryViewProps> = ({
  history, onSelectResult, onDeleteResult, onNavigateDiagnose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState('Tất cả');
  const [resultFilter, setResultFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const plantOptions = useMemo(
    () => ['Tất cả', ...Array.from(new Set(history.map(h => h.plant)))],
    [history],
  );

  const filtered = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = item.plant.toLowerCase().includes(q) || item.prediction.toLowerCase().includes(q);
    const matchPlant = plantFilter === 'Tất cả' || item.plant === plantFilter;
    const matchResult =
      resultFilter === 'All' ||
      (resultFilter === 'Healthy' && item.isHealthy) ||
      (resultFilter === 'Diseased' && !item.isHealthy);
    return matchSearch && matchPlant && matchResult;
  });

  // Stats
  const total = history.length;
  const healthyCount = history.filter(h => h.isHealthy).length;
  const diseasedCount = total - healthyCount;
  const avgConf = total ? (history.reduce((s, h) => s + h.confidence, 0) / total * 100).toFixed(0) : '—';

  const getConfColor = (conf: number) =>
    conf >= 0.85 ? '#4ade80' : conf >= 0.60 ? '#facc15' : '#f87171';

  return (
    <div className="page-wrap">
      {/* ── Hero ── */}
      <div className="page-hero">
        <div className="page-hero-glow-a" aria-hidden="true" />
        <div className="page-hero-glow-b" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="page-hero-eyebrow"><History className="h-3.5 w-3.5" /> Nhật Ký Kiểm Tra</span>
              <h1 className="page-hero-title">Mẫu đã lưu</h1>
              <p className="page-hero-desc">
                Lịch sử chẩn đoán từ tài khoản LeafAI hoặc kết quả lưu trên trình duyệt khi dùng thử.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="page-stat-chip">
                <span className="page-stat-value">{total}</span>
                <span className="page-stat-label">Tổng mẫu</span>
              </div>
              <div className="page-stat-chip" style={{ '--stat-accent': '#4ade80' } as React.CSSProperties}>
                <span className="page-stat-value">{healthyCount}</span>
                <span className="page-stat-label">Khỏe mạnh</span>
              </div>
              <div className="page-stat-chip" style={{ '--stat-accent': '#f87171' } as React.CSSProperties}>
                <span className="page-stat-value">{diseasedCount}</span>
                <span className="page-stat-label">Có bệnh</span>
              </div>
              <div className="page-stat-chip">
                <span className="page-stat-value">{avgConf}<span style={{ fontSize: '.6em' }}>%</span></span>
                <span className="page-stat-label">Tin cậy TB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="page-toolbar">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="page-search-icon" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            )}
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo cây hoặc tên bệnh..." className="page-search-input" />
          </div>

          {/* Filters */}
          <select value={plantFilter} onChange={e => setPlantFilter(e.target.value)} className="page-select">
            {plantOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="page-select">
            <option value="All">Tất cả kết quả</option>
            <option value="Diseased">Có nhiễm bệnh</option>
            <option value="Healthy">Lá khỏe mạnh</option>
          </select>

          {/* View mode */}
          <div className="history-view-toggle">
            <button type="button" onClick={() => setViewMode('cards')}
              className={`history-view-btn ${viewMode === 'cards' ? 'history-view-btn--active' : ''}`}
              title="Dạng lưới">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewMode('list')}
              className={`history-view-btn ${viewMode === 'list' ? 'history-view-btn--active' : ''}`}
              title="Dạng danh sách">
              <List className="h-4 w-4" />
            </button>
          </div>

          <button type="button" onClick={onNavigateDiagnose} className="plant-card-diagnose-btn whitespace-nowrap">
            <ScanLine className="h-4 w-4" /> Chẩn đoán mới
          </button>
        </div>

        {/* ── Content ── */}
        <div className="pb-16">
          {filtered.length === 0 ? (
            <div className="page-empty">
              {total === 0 ? (
                <>
                  <div className="page-empty-icon">
                    <History className="h-8 w-8" />
                  </div>
                  <p className="mt-5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Chưa có mẫu nào được lưu
                  </p>
                  <p className="mt-2 max-w-xs text-center text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                    Chẩn đoán một ảnh lá mới để kết quả xuất hiện trong lịch sử của bạn.
                  </p>
                  <button type="button" onClick={onNavigateDiagnose}
                    className="diagnose-analyze-btn mt-6 !w-auto !min-w-[180px]">
                    <ScanLine className="h-5 w-5" /> Chẩn đoán ngay
                  </button>
                </>
              ) : (
                <>
                  <Leaf className="h-10 w-10" style={{ color: 'var(--bio-pulse)', opacity: .5 }} />
                  <p className="mt-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Không tìm thấy kết quả phù hợp
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Thử từ khóa khác hoặc bỏ bộ lọc.
                  </p>
                </>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* ── Card Grid ── */
            <div className="plants-grid">
              {filtered.map((item) => {
                const confPct = Math.round(item.confidence * 1000) / 10;
                const confColor = getConfColor(item.confidence);
                return (
                  <article key={item.id} className="plant-card group">
                    {/* Thumbnail */}
                    <button type="button" onClick={() => onSelectResult(item)}
                      className="plant-card-photo-wrap" aria-label={`Xem kết quả ${item.prediction}`}>
                      <img src={item.originalImageUrl} alt={item.prediction}
                        className="plant-card-photo" loading="lazy" />
                      <div className="plant-card-photo-shade" aria-hidden="true" />

                      {/* Confidence badge */}
                      <span className="absolute left-3 top-3 plant-badge font-bold"
                        style={{ color: confColor, background: `${confColor}22`, backdropFilter: 'blur(8px)' }}>
                        {confPct}%
                      </span>

                      {/* Healthy/Disease indicator */}
                      <span className="absolute right-3 top-3 plant-badge"
                        style={item.isHealthy
                          ? { color: '#4ade80', background: 'rgba(74,222,128,.15)', backdropFilter: 'blur(8px)' }
                          : { color: '#f87171', background: 'rgba(248,113,113,.15)', backdropFilter: 'blur(8px)' }
                        }>
                        {item.isHealthy ? <CheckCircle2 className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                        {item.isHealthy ? 'Khỏe' : 'Bệnh'}
                      </span>

                      <div className="plant-card-hover-cta" aria-hidden="true">
                        <Eye className="h-5 w-5" /> Xem chi tiết
                      </div>
                    </button>

                    {/* Body */}
                    <div className="plant-card-body">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--bio-bright)' }}>
                            {item.plant}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {item.timestamp}
                          </p>
                        </div>
                        <h3 className="plant-card-name line-clamp-2" onClick={() => onSelectResult(item)}>
                          {item.prediction}
                        </h3>
                        {item.severity && (
                          <span className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(245,158,11,.1)', color: '#d97706', border: '1px solid rgba(245,158,11,.2)' }}>
                            Mức độ: {item.severity.level === 'Mild' ? 'Nhẹ' : item.severity.level === 'Moderate' ? 'Trung bình' : 'Nặng'} ({item.severity.affectedAreaPercentage}%)
                          </span>
                        )}
                      </div>

                      <div className="plant-card-footer">
                        <button type="button" onClick={() => onSelectResult(item)} className="plant-card-link">
                          <Eye className="h-3.5 w-3.5" /> Xem chi tiết
                        </button>
                        <button type="button" onClick={() => setPendingDeleteId(item.id)}
                          className="plant-card-link"
                          style={{ color: '#ef4444' }}
                          title="Xóa bản ghi">
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* ── List View ── */
            <div className="history-list">
              {filtered.map((item) => {
                const confPct = Math.round(item.confidence * 1000) / 10;
                const confColor = getConfColor(item.confidence);
                return (
                  <div key={item.id} className="history-list-row group">
                    <button type="button" onClick={() => onSelectResult(item)}
                      className="history-list-thumb" aria-label={`Xem ${item.prediction}`}>
                      <img src={item.originalImageUrl} alt={item.prediction}
                        className="h-full w-full object-cover" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider mb-0.5"
                        style={{ color: 'var(--bio-bright)' }}>{item.plant}</p>
                      <h4 className="text-sm font-bold truncate cursor-pointer hover:underline"
                        onClick={() => onSelectResult(item)}
                        style={{ color: 'var(--text-primary)' }}>
                        {item.prediction}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {item.timestamp}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold" style={{ color: confColor }}>{confPct}%</span>
                      <button type="button" onClick={() => onSelectResult(item)}
                        className="plant-card-diagnose-btn !px-3 !py-1.5 !text-xs">
                        <Eye className="h-3.5 w-3.5" /> Xem
                      </button>
                      <button type="button" onClick={() => setPendingDeleteId(item.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: '#ef4444' }} title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => { if (pendingDeleteId) { onDeleteResult(pendingDeleteId); setPendingDeleteId(null); } }}
      />
    </div>
  );
};
