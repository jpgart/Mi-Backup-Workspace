import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CustomChartProps {
  type: 'line' | 'bar';
  data: ChartData<'line' | 'bar'>;
  options?: ChartOptions<'line' | 'bar'>;
}

const Chart: React.FC<CustomChartProps> = ({ type, data, options }) => {
  const defaultOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12, weight: 600 }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Outfit', size: 14 },
        bodyFont: { family: 'Inter', size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#64748b', font: { size: 11 } }
      }
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  if (type === 'line') {
    return <Line data={data as ChartData<'line'>} options={finalOptions as ChartOptions<'line'>} />;
  }
  
  return <Bar data={data as ChartData<'bar'>} options={finalOptions as ChartOptions<'bar'>} />;
};

export default React.memo(Chart);
