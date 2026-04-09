import React, { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import Sidebar from './components/Sidebar';
import KPIGrid from './components/KPIGrid';
import FinancePanel from './components/panels/FinancePanel';
import EnergyPanel from './components/panels/EnergyPanel';
import CompensationPanel from './components/panels/CompensationPanel';
import InvoicesTable from './components/panels/InvoicesTable';
import { AnalyticsEngine } from './lib/analytics-engine';
import { Download, LayoutDashboard, Loader2 } from 'lucide-react';
import { InvoiceData, DashboardStats, FilterState } from './types';

function App() {
  const { allData, loading, error, dateRange } = useAnalyticsData();
  const [filters, setFilters] = useState<FilterState>({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<string>('finance');
  const [isPending, startTransition] = useTransition();

  // Initialize filters when range is loaded
  useEffect(() => {
    if (dateRange.start && (!filters.start || !filters.end)) {
      setFilters(dateRange);
    }
  }, [dateRange, filters.start, filters.end]);

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    startTransition(() => {
      setFilters(newFilters);
    });
  }, []);

  const handleReset = useCallback(() => {
    startTransition(() => {
      setFilters(dateRange);
    });
  }, [dateRange]);

  const handleTabChange = (tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  // Filter data - memoized
  const filteredData = useMemo(() => {
    return allData.filter(d => {
      const m = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      return (!filters.start || m >= filters.start) && (!filters.end || m <= filters.end);
    });
  }, [allData, filters]);

  // Insights - memoized
  const insights = useMemo(() => AnalyticsEngine.getInsights(filteredData), [filteredData]);

  // Stats for KPI Grid - memoized
  const stats = useMemo<DashboardStats | null>(() => {
    if (!filteredData.length) return null;

    const totalMonto = filteredData.reduce((s, d) => s + d.totalMonto, 0);
    const totalEnergy = filteredData.reduce((s, d) => s + d.energyKwh, 0);
    const totalPenalty = filteredData.reduce((s, d) => s + d.penaltyMonto, 0);
    const avgFp = filteredData.reduce((s, d) => s + d.fp, 0) / filteredData.length;

    const years = [...new Set(filteredData.map(d => d.date.getFullYear()))];

    return {
      totalMonto: `$${totalMonto.toLocaleString('es-CL')}`,
      totalVar: 'Costo total acumulado',
      totalEnergy: totalEnergy.toLocaleString('es-CL'),
      energyAvg: `${Math.round(totalEnergy / filteredData.length).toLocaleString('es-CL')} kWh/mes prom.`,
      avgFp: avgFp.toFixed(3),
      fpStatus: avgFp >= 0.93 ? 'Eficiente' : 'Bajo norma',
      fpColor: avgFp >= 0.93 ? 'success' : 'warning',
      penalty: `$${totalPenalty.toLocaleString('es-CL')}`,
      penaltyPct: `${((totalPenalty / totalMonto) * 100).toFixed(1)}% del gasto total`,
      invoicesCount: filteredData.length,
      yearsSpan: years.length > 1 ? `${years[0]} – ${years[years.length-1]}` : `${years[0]}`
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-main)] flex flex-col items-center justify-center gap-4 z-50">
        <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin" />
        <div className="text-[var(--text-secondary)] text-sm font-medium">Iniciando Motor Analítico Industrial…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-main)] flex flex-col items-center justify-center gap-4 z-50 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <div className="text-[var(--danger)] font-bold text-xl">Error de Datos Cronológico</div>
        <div className="text-[var(--text-muted)] text-sm max-w-md">{error}</div>
        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
          Reintentar conexión
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <Sidebar 
        currentFilters={filters}
        onApply={handleApplyFilters}
        onReset={handleReset}
        insights={insights}
        dataCount={filteredData.length}
        availableRange={dateRange}
      />

      <main className={`flex-1 p-10 overflow-x-auto min-w-0 transition-opacity duration-300 ${isPending ? 'opacity-60 cursor-wait' : 'opacity-100'}`}>
        <header className="flex justify-between items-start mb-10 flex-wrap gap-4">
          <div className="animate-fade-in">
            <h1 className="font-['Outfit'] text-4xl font-extrabold mb-1 bg-gradient-to-br from-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              Industria Mecánica VOGT
            </h1>
            <p className="text-[var(--text-secondary)] text-sm font-medium">Dashboard de Eficiencia Energética · v2.0 TypeScript</p>
          </div>
          <div className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'} animate-[pulseGlow_2s_infinite]`}></div>
              <span className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                {isPending ? 'Procesando...' : 'Sistema Listo'}
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--border)]"></div>
            <button className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
              <Download size={14} /> Reporte PDF
            </button>
          </div>
        </header>

        <KPIGrid stats={stats} />

        <nav className="flex gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] p-1.5 rounded-2xl w-fit mb-8 shadow-sm">
          {[
            { id: 'finance', label: '📊 Finanzas' },
            { id: 'energy', label: '⚡ Energía' },
            { id: 'compensation', label: '🔋 Compensación' },
            { id: 'invoices', label: '📋 Facturas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={isPending}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                activeTab === tab.id 
                  ? 'bg-[var(--accent-gradient)] text-black shadow-lg shadow-[rgba(0,229,255,0.2)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="animate-fade-in relative">
          {isPending && (
            <div className="absolute top-0 right-0 p-2 text-xs text-[var(--accent-primary)] font-bold flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Actualizando vista...
            </div>
          )}
          {activeTab === 'finance' && <FinancePanel data={filteredData} />}
          {activeTab === 'energy' && <EnergyPanel data={filteredData} />}
          {activeTab === 'compensation' && <CompensationPanel data={filteredData} />}
          {activeTab === 'invoices' && <InvoicesTable data={filteredData} />}
        </div>
      </main>
    </div>
  );
}

export default App;
