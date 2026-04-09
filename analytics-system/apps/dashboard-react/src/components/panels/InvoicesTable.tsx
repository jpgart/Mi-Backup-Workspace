import React, { useMemo, useState } from 'react';
import { FileText, Download, Search, Info } from 'lucide-react';
import { InvoiceData } from '../../types';

interface InvoicesTableProps {
  data: InvoiceData[];
}

const InvoicesTable: React.FC<InvoicesTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const filteredAndSorted = useMemo(() => {
    return [...data]
      .filter(d => 
        d.invoiceNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.date.toLocaleDateString('es-CL').includes(searchTerm)
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data, searchTerm]);

  const handleExportCSV = () => {
    const headers = ['Factura', 'Fecha', 'kWh', 'kVARh', 'FP', 'Monto Total', 'Multa'];
    const rows = filteredAndSorted.map(d => [
      d.invoiceNum,
      d.date.toLocaleDateString('es-CL'),
      d.energyKwh,
      d.reactiveKvarh,
      d.fp.toFixed(4),
      d.totalMonto,
      d.penaltyMonto
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_facturas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full animate-fade-in relative">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-4 right-4 text-[var(--test-muted)] hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[var(--accent-primary)] bg-opacity-10 rounded-xl text-[var(--accent-primary)]">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-xl">Factura {selectedInvoice.invoiceNum}</h3>
                <p className="text-[var(--text-muted)] text-sm">{selectedInvoice.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[0.65rem] text-[var(--text-muted)] uppercase font-bold mb-1">Consumo Activa</div>
                <div className="text-lg font-bold">{Math.round(selectedInvoice.energyKwh).toLocaleString('es-CL')} kWh</div>
              </div>
              <div className="bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[0.65rem] text-[var(--text-muted)] uppercase font-bold mb-1">Consumo Reactiva</div>
                <div className="text-lg font-bold">{Math.round(selectedInvoice.reactiveKvarh).toLocaleString('es-CL')} kVARh</div>
              </div>
              <div className="bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[0.65rem] text-[var(--text-muted)] uppercase font-bold mb-1">Monto Neto</div>
                <div className="text-lg font-bold">${selectedInvoice.netMonto.toLocaleString('es-CL')}</div>
              </div>
              <div className="bg-[var(--bg-hover)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[0.65rem] text-[var(--text-muted)] uppercase font-bold mb-1">Multa Cobrada</div>
                <div className={`text-lg font-bold ${selectedInvoice.penaltyMonto > 0 ? 'text-[var(--danger)]' : ''}`}>
                  ${selectedInvoice.penaltyMonto.toLocaleString('es-CL')}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] border-t border-[var(--border)] pt-4">
              <div className="flex justify-between">
                <span>Archivo fuente:</span>
                <span className="font-mono text-xs text-right whitespace-nowrap overflow-hidden text-ellipsis ml-4">{selectedInvoice.sourceFile}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className={selectedInvoice.penaltyMonto === 0 && selectedInvoice.fp >= 0.93 ? 'text-[var(--success)] font-bold' : 'text-[var(--warning)] font-bold'}>
                  {selectedInvoice.penaltyMonto === 0 && selectedInvoice.fp >= 0.93 ? 'Eficiente' : 'Ineficiente'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="w-full mt-6 bg-[var(--accent-gradient)] text-black font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por N° factura o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[var(--accent-primary)] outline-none transition-all"
          />
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-5 py-2.5 rounded-xl text-sm font-bold hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] transition-all"
        >
          <Download size={16} /> Exportar Selección
        </button>
      </div>

      <div className="glass-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Fecha</th>
                <th>kWh</th>
                <th>kVARh</th>
                <th>FP</th>
                <th>Estado</th>
                <th>Monto Total</th>
                <th>Multa</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length > 0 ? filteredAndSorted.map((d, i) => (
                <tr key={i}>
                  <td className="font-mono text-[var(--accent-primary)] font-bold">{d.invoiceNum}</td>
                  <td>{d.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>{Math.round(d.energyKwh).toLocaleString('es-CL')}</td>
                  <td>{Math.round(d.reactiveKvarh).toLocaleString('es-CL')}</td>
                  <td className="font-bold">{d.fp.toFixed(3)}</td>
                  <td>
                    <span className={`badge ${d.penaltyMonto === 0 && d.fp >= 0.93 ? 'badge-success' : 'badge-warning'}`}>
                      {d.penaltyMonto === 0 && d.fp >= 0.93 ? 'Eficiente' : 'Ineficiente'}
                    </span>
                  </td>
                  <td className="font-bold">${d.totalMonto.toLocaleString('es-CL')}</td>
                  <td className={d.penaltyMonto > 0 ? 'text-[var(--danger)] font-bold' : 'text-[var(--text-muted)]'}>
                    ${d.penaltyMonto.toLocaleString('es-CL')}
                  </td>
                  <td className="text-center">
                    <button 
                      onClick={() => setSelectedInvoice(d)}
                      title="Ver detalle"
                      className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--accent-primary)]"
                    >
                      <Info size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-[var(--text-muted)] italic">
                    No se encontraron facturas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvoicesTable);
