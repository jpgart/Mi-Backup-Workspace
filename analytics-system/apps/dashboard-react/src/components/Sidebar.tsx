import React, { memo, useState, useEffect } from 'react';
import { Zap, Filter, RefreshCcw, Info, Activity, Calendar } from 'lucide-react';
import { FilterState } from '../types';

interface SidebarProps {
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  insights?: string[];
  dataCount: number;
  availableRange?: { start: string; end: string };
}

const Sidebar: React.FC<SidebarProps> = memo(({ 
  currentFilters,
  onApply, 
  onReset,
  insights = [],
  dataCount = 0,
  availableRange = { start: '', end: '' }
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  // Sync with current filters when they change externally (e.g. reset)
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleLocalChange = (key: keyof FilterState, val: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: val }));
  };

  const hasChanges = localFilters.start !== currentFilters.start || localFilters.end !== currentFilters.end;

  return (
    <aside className="w-[300px] min-w-[300px] bg-[var(--bg-card)] border-r border-[var(--border)] p-7 flex flex-col gap-7 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[var(--accent-gradient)] rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.3)]">
          <Zap size={20} className="text-black" />
        </div>
        <div>
          <div className="font-['Outfit'] text-[1.2rem] font-bold text-[var(--text-primary)] leading-none">Analytics</div>
          <div className="text-[0.65rem] text-[var(--text-muted)] uppercase tracking-wider">Energía · Eficiencia</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[0.7rem] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Proyecto / Cliente</div>
        <select className="bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] p-2.5 rounded-[var(--radius-sm)] text-sm cursor-pointer outline-none hover:border-[var(--border-hover)] transition-colors appearance-none">
          <option>VOGT — Actual</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[0.7rem] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
          <Filter size={12} /> Filtrar período
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] text-[var(--text-muted)] flex items-center gap-2">
            <Calendar size={12} /> Desde
          </label>
          <input 
            type="month" 
            value={localFilters.start}
            min={availableRange.start}
            max={availableRange.end}
            onChange={(e) => handleLocalChange('start', e.target.value)}
            onClick={(e) => (e.target as any).showPicker?.()}
            className="bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] p-3 rounded-[var(--radius-md)] text-sm outline-none hover:border-[var(--border-hover)] focus:border-[var(--accent-primary)] transition-all cursor-pointer w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          <label className="text-[0.75rem] text-[var(--text-muted)] flex items-center gap-2">
            <Calendar size={12} /> Hasta
          </label>
          <input 
            type="month" 
            value={localFilters.end}
            min={availableRange.start}
            max={availableRange.end}
            onChange={(e) => handleLocalChange('end', e.target.value)}
            onClick={(e) => (e.target as any).showPicker?.()}
            className="bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] p-3 rounded-[var(--radius-md)] text-sm outline-none hover:border-[var(--border-hover)] focus:border-[var(--accent-primary)] transition-all cursor-pointer w-full"
          />
        </div>
        
        <div className="text-[0.65rem] text-[var(--text-muted)] italic px-1">
           Rango disponible: {availableRange.start} a {availableRange.end}
        </div>

        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => onApply(localFilters)}
            disabled={!hasChanges}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-[0.8rem] font-bold transition-all shadow-lg ${
              hasChanges 
              ? 'bg-[var(--accent-gradient)] text-black hover:scale-[1.02] active:scale-[0.98]' 
              : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
            }`}
          >
            Aplicar Filtro
          </button>
          <button 
            onClick={onReset}
            className="p-2.5 bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] rounded-[var(--radius-md)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-all"
            title="Restablecer período completo"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[0.7rem] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Info size={12} /> Insights Rápidos
        </div>
        <div className="flex flex-col">
          {insights.length > 0 ? insights.map((insight, idx) => (
            <div 
              key={idx}
              className="bg-[rgba(0,229,255,0.05)] border-l-4 border-[var(--accent-primary)] p-4 pr-5 rounded-r-[var(--radius-md)] text-[0.88rem] text-[var(--text-primary)] font-medium leading-[1.5] hover:bg-[rgba(0,229,255,0.1)] transition-all shadow-sm animate-fade-in group"
              style={{ animationDelay: `${idx * 0.1}s`, marginBottom: '0.85rem' }}
            >
              <div className="flex gap-3">
                <span className="opacity-40 group-hover:opacity-100 transition-opacity mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            </div>
          )) : (
            <div className="text-[0.75rem] text-[var(--text-muted)] italic">No hay insights disponibles para este filtro.</div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 text-[0.72rem] text-[var(--text-muted)] mb-1">
          <Activity size={14} className="text-[var(--success)]" />
          <span>Datos sincronizados</span>
        </div>
        <div className="text-[0.72rem] text-[var(--text-muted)]">
          {dataCount} registros analizados
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
