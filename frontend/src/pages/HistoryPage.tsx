import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Eye, 
  LayoutGrid, 
  List, 
  Sparkles
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
  history,
  onSelectResult,
  onDeleteResult,
  onNavigateDiagnose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All'); // 'All' | 'Diseased' | 'Healthy'
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Extract unique plants in history
  const plantOptions = ['Tất cả', ...Array.from(new Set(history.map((h) => h.plant)))];

  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      item.plant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prediction.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlant = plantFilter === 'All' || plantFilter === 'Tất cả' || item.plant === plantFilter;
    const matchesResult = 
      resultFilter === 'All' ||
      (resultFilter === 'Healthy' && item.isHealthy) ||
      (resultFilter === 'Diseased' && !item.isHealthy);

    return matchesSearch && matchesPlant && matchesResult;
  });

  return (
    <div className="soft-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8E4] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký Kiểm Tra</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#17211B]">
            Mẫu đã lưu
          </h1>
          <p className="text-sm text-[#647067] mt-1">
            Các kết quả minh họa bạn đã lưu trên trình duyệt này. Chưa có lịch sử chẩn đoán từ mô hình AI.
          </p>
        </div>

        {/* View Mode Toggle & Primary CTA */}
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-[#E2E8E4] flex items-center shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-emerald-50 text-emerald-800' : 'text-[#647067]'
              }`}
              title="Dạng lưới thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-emerald-50 text-emerald-800' : 'text-[#647067]'
              }`}
              title="Dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNavigateDiagnose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chẩn đoán lá mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#647067] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo giống cây hoặc tên bệnh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 shadow-2xs"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end text-xs">
          
          {/* Plant filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#647067]">Cây trồng:</span>
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="bg-white border border-[#E2E8E4] text-[#17211B] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none cursor-pointer"
            >
              {plantOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#647067]">Tình trạng:</span>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-white border border-[#E2E8E4] text-[#17211B] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">Tất cả kết quả</option>
              <option value="Diseased">Có nhiễm bệnh</option>
              <option value="Healthy">Lá khỏe mạnh</option>
            </select>
          </div>

        </div>
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="py-20 px-6 text-center bg-white rounded-3xl border border-[#E2E8E4] max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-100">
            <History className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-[#17211B]">Chưa có mẫu nào được lưu</h3>
            <p className="text-xs text-[#647067] mt-1 max-w-sm mx-auto leading-relaxed">
              Luồng upload demo hiện hiển thị kết quả ngay trên trang chẩn đoán và chưa lưu bản ghi mới.
            </p>
          </div>
          <button
            onClick={onNavigateDiagnose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Chẩn đoán chiếc lá đầu tiên</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="soft-card bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image Thumbnail */}
                <div 
                  className="aspect-16/10 overflow-hidden bg-black relative cursor-pointer group"
                  onClick={() => onSelectResult(item)}
                >
                  <img
                    src={item.originalImageUrl}
                    alt={item.prediction}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs ${
                    item.confidence >= 0.85
                      ? 'bg-emerald-600 text-white'
                      : item.confidence >= 0.60
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {Math.round(item.confidence * 1000) / 10}%
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#647067]">
                    <span className="font-semibold uppercase tracking-wider text-emerald-800">
                      Cây: {item.plant}
                    </span>
                    <span className="text-[11px] font-mono">{item.timestamp}</span>
                  </div>

                  <h3 
                    onClick={() => onSelectResult(item)}
                    className="font-display font-bold text-lg text-[#17211B] hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {item.prediction}
                  </h3>

                  {item.severity && (
                    <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-medium border border-amber-200/60">
                      Mức độ: {item.severity.level === 'Mild' ? 'Nhẹ' : item.severity.level === 'Moderate' ? 'Trung bình' : 'Nặng'} ({item.severity.affectedAreaPercentage}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 pb-5 pt-3 border-t border-[#E2E8E4] flex items-center justify-between text-xs">
                <button
                  onClick={() => onSelectResult(item)}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem chi tiết</span>
                </button>

                <button
                  onClick={() => setPendingDeleteId(item.id)}
                  className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 p-1 cursor-pointer"
                  title="Xóa bản ghi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        
        /* List View */
        <div className="bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden divide-y divide-[#E2E8E4]">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAF9] transition-colors"
            >
              <div className="flex items-center gap-4">
                <img
                  src={item.originalImageUrl}
                  alt={item.prediction}
                  className="w-14 h-14 rounded-xl object-cover border border-[#E2E8E4] shrink-0"
                />
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                    {item.plant}
                  </span>
                  <h4 
                    onClick={() => onSelectResult(item)}
                    className="font-display font-bold text-base text-[#17211B] hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {item.prediction}
                  </h4>
                  <span className="text-xs text-[#647067] font-mono">{item.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  item.confidence >= 0.85
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {Math.round(item.confidence * 1000) / 10}% Tin cậy
                </span>

                <button
                  onClick={() => onSelectResult(item)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Xem</span>
                </button>

                <button
                  onClick={() => setPendingDeleteId(item.id)}
                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            onDeleteResult(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
      />

    </div>
  );
};
