import React from 'react';
import Chart from '../Chart';
import { InvoiceData } from '../../types';

interface FinancePanelProps {
  data: InvoiceData[];
}

const FinancePanel: React.FC<FinancePanelProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Monto Total ($)',
        data: data.map(d => d.totalMonto),
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Multa Reactiva ($)',
        data: data.map(d => d.penaltyMonto),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card">
        <h3 className="font-bold mb-4">Evolución de Costos Mensuales</h3>
        <div className="h-[400px]">
          <Chart type="line" data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(FinancePanel);
