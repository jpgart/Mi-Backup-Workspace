import React, { useMemo } from 'react';
import { AnalyticsEngine } from '../../lib/analytics-engine';
import { Battery, TrendingUp, ShieldCheck } from 'lucide-react';
import { InvoiceData } from '../../types';

interface CompensationPanelProps {
  data: InvoiceData[];
}

const CompensationPanel: React.FC<CompensationPanelProps> = ({ data }) => {
  const proposal = useMemo(() => {
    if (!data.length) return null;
    const lastWithLowFp = [...data].sort((a,b) => b.date.getTime() - a.date.getTime()).find(d => d.fp < 0.93);
    return lastWithLowFp ? AnalyticsEngine.calculateCapacitor(lastWithLowFp) : null;
  }, [data]);

  if (!proposal || proposal.requiredKvar === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-[var(--success)] bg-opacity-10 rounded-full flex items-center justify-center text-[var(--success)] mb-6">
          <ShieldCheck size={40} />
        </div>
        <h3 className="text-2xl font-bold mb-2">Sistema Compensado</h3>
        <p className="text-[var(--text-secondary)] max-w-md">No se detectaron desviaciones significativas en el factor de potencia que requieran corrección adicional en el periodo seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-card border-l-4 border-[var(--warning)]">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-[var(--warning)] bg-opacity-10 rounded-2xl text-[var(--warning)]">
            <Battery size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Propuesta de Banco de Condensadores</h3>
            <p className="text-[var(--text-muted)] text-sm">Dimensionamiento basado en el último mes ineficiente detectable</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Capacidad Requerida</span>
            <div className="text-4xl font-extrabold text-[var(--accent-primary)]">{proposal.requiredKvar} <span className="text-xl font-normal text-[var(--text-secondary)]">kVAR</span></div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Para alcanzar un FP objetivo de {proposal.targetFp}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Ahorro Estimado</span>
            <div className="text-4xl font-extrabold text-[var(--success)]">${proposal.estimatedSavingMonthly.toLocaleString('es-CL')} <span className="text-xl font-normal text-[var(--text-secondary)]">/mes</span></div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Equivalente a la eliminación de multas por reactiva</p>
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> Impacto en la Operación
          </h4>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2">
            <li>• Eliminación inmediata del recargo por energía reactiva en la factura.</li>
            <li>• Mejora en la regulación de tensión de la planta.</li>
            <li>• Liberación de capacidad en transformadores y conductores existentes.</li>
          </ul>
        </div>
      </div>

      <div className="glass-card flex flex-col justify-between">
        <div>
          <h3 className="font-bold mb-4">Estado de Recomendación</h3>
          <div className={`p-4 rounded-xl font-bold text-center mb-6 ${
            proposal.status === 'Crítico' ? 'bg-[var(--danger)] bg-opacity-20 text-[var(--danger)] border border-[var(--danger)] border-opacity-30' : 
            'bg-[var(--warning)] bg-opacity-20 text-[var(--warning)] border border-[var(--warning)] border-opacity-30'
          }`}>
            {proposal.status === 'Crítico' ? 'ACCIÓN INMEDIATA' : 'RECOMENDADO'}
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Se sugiere la instalación de un banco automático de condensadores de <strong>{proposal.requiredKvar} kVAR</strong>. El retorno de inversión estimado por ahorro de multas es inferior a 12 meses.
          </p>
        </div>
        <button className="w-full mt-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg">
          Solicitar Cotización Técnica
        </button>
      </div>
    </div>
  );
};

export default React.memo(CompensationPanel);
