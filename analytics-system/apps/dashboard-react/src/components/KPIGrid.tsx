import React from 'react';
import { DollarSign, Zap, Activity, AlertTriangle } from 'lucide-react';
import { DashboardStats } from '../types';

interface KPIGridProps {
  stats: DashboardStats | null;
}

const KPIGrid: React.FC<KPIGridProps> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Monto Acumulado',
      value: stats.totalMonto,
      detail: stats.totalVar,
      icon: <DollarSign size={22} className="text-[var(--accent-primary)]" />,
      color: 'accent',
      delay: '0.1s'
    },
    {
      title: 'Energía Total',
      value: `${stats.totalEnergy} kWh`,
      detail: stats.energyAvg,
      icon: <Zap size={22} className="text-[#fbbf24]" />,
      color: 'warning',
      delay: '0.2s'
    },
    {
      title: 'Factor de Potencia',
      value: stats.avgFp,
      detail: `${stats.fpStatus} (${stats.yearsSpan})`,
      icon: <Activity size={22} className={stats.fpColor === 'success' ? 'text-[var(--success)]' : 'text-[var(--warning)]'} />,
      color: stats.fpColor,
      delay: '0.3s'
    },
    {
      title: 'Multas Reactiva',
      value: stats.penalty,
      detail: stats.penaltyPct,
      icon: <AlertTriangle size={22} className="text-[var(--danger)]" />,
      color: 'danger',
      delay: '0.4s'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className="glass-card animate-fade-in group hover:translate-y-[-4px] transition-all duration-300"
          style={{ animationDelay: card.delay }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 bg-[var(--bg-hover)] rounded-xl border border-[var(--border)] group-hover:border-[var(--accent-primary)] transition-colors`}>
              {card.icon}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-widest">{card.title}</h4>
            <div className="text-2xl font-['Outfit'] font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {card.value}
            </div>
            <div className={`text-[0.7rem] font-medium ${card.color === 'success' ? 'text-[var(--success)]' : card.color === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>
              {card.detail}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(KPIGrid);
