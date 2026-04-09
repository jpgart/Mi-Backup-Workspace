import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { AnalyticsEngine } from '../lib/analytics-engine';
import { InvoiceData } from '../types';

export function useAnalyticsData() {
  const [allData, setAllData] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/data/resumen.csv');
        if (!res.ok) throw new Error('No se pudo cargar el archivo de datos');
        const csvText = await res.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: ({ data }: { data: any[] }) => {
            const normalized = data
              .map(r => AnalyticsEngine.normalize(r))
              .filter((item): item is InvoiceData => item !== null)
              .sort((a, b) => a.date.getTime() - b.date.getTime());
            
            setAllData(normalized);
            setLoading(false);
          },
          error: (err: any) => {
            setError(err.message);
            setLoading(false);
          }
        });
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const dateRange = useMemo(() => {
    if (!allData.length) return { start: '', end: '' };
    const toMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      start: toMonth(allData[0].date),
      end:   toMonth(allData[allData.length - 1].date)
    };
  }, [allData]);

  return { allData, loading, error, dateRange };
}
