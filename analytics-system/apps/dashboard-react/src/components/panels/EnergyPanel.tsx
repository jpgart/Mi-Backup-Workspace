import React from 'react';
import Chart from '../Chart';
import { InvoiceData } from '../../types';

interface EnergyPanelProps {
  data: InvoiceData[];
}

const EnergyPanel: React.FC<EnergyPanelProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Consumo Activa (kWh)',
        data: data.map(d => d.energyKwh),
        backgroundColor: 'rgba(0, 229, 255, 0.6)',
        borderRadius: 4,
      }
    ]
  };

  const fpData = {
    labels: data.map(d => d.date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Factor de Potencia',
        data: data.map(d => d.fp),
        borderColor: '#fbbf24',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.1,
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card">
        <h3 className="font-bold mb-4">Consumo Energía Activa</h3>
        <div className="h-[300px]">
          <Chart type="bar" data={chartData} />
        </div>
      </div>
      <div className="glass-card">
        <h3 className="font-bold mb-4">Factor de Potencia Histórico</h3>
        <div className="h-[300px]">
          <Chart type="line" data={fpData} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(EnergyPanel);
