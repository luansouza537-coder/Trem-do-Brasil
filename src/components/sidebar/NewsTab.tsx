import React, { useState } from 'react';
import { NewsItem } from '../../types';

interface NewsTabProps {
  newsItems: NewsItem[];
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'crisis', label: '🔴 Crises' },
  { key: 'grant', label: '🟢 Subsídios' },
  { key: 'infra', label: '🔵 Obras' },
  { key: 'mission', label: '🟡 Missões' },
  { key: 'event', label: '⚡ Eventos' },
] as const;

type FilterKey = typeof CATEGORY_FILTERS[number]['key'];

export default function NewsTab({ newsItems }: NewsTabProps) {
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = filter === 'all' ? newsItems : newsItems.filter(n => n.category === filter);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/10">
      {/* Filter chips */}
      <div className="px-3 pt-3 pb-2 flex gap-1 flex-wrap shrink-0 border-b border-slate-800/60">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold border transition cursor-pointer ${
              filter === f.key
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[8px] text-slate-500 self-center">{filtered.length} item(s)</span>
      </div>

      {/* News list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
        {filtered.length === 0 ? (
          <p className="text-[9.5px] text-slate-500 italic text-center mt-8">
            {newsItems.length === 0
              ? 'Nenhuma notícia ainda. Continue construindo a malha!'
              : 'Nenhuma notícia nesta categoria.'}
          </p>
        ) : (
          filtered.map(item => {
            const isExpanded = expandedNewsId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  item.category === 'infra'   ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60' :
                  item.category === 'crisis'  ? 'bg-rose-950/20 border-rose-800/30 text-rose-300 hover:bg-rose-950/40' :
                  item.category === 'grant'   ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300 hover:bg-emerald-950/40' :
                  item.category === 'mission' ? 'bg-amber-950/20 border-amber-700/30 text-amber-200 hover:bg-amber-950/40' :
                  'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-900/60'
                }`}
              >
                <span className={`block text-[10px] leading-snug break-words font-semibold ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {item.headline}
                </span>
                <span className="text-[8px] text-slate-500 mt-0.5 block">{item.yearMonth}</span>
                {!isExpanded && item.headline.length > 60 && (
                  <span className="text-[8px] text-slate-600 mt-0.5 block">▼ toque para expandir</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
