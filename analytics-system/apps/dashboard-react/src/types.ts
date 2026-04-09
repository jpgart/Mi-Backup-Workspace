export interface InvoiceData {
  invoiceNum: string;
  date: Date;
  netMonto: number;
  totalMonto: number;
  energyKwh: number;
  reactiveKvarh: number;
  fp: number;
  clasif: string;
  penaltyMonto: number;
  sourceFile: string;
  raw: any;
}

export interface DashboardStats {
  totalMonto: string;
  totalVar: string;
  totalEnergy: string;
  energyAvg: string;
  avgFp: string;
  fpStatus: string;
  fpColor: 'success' | 'warning' | 'danger';
  penalty: string;
  penaltyPct: string;
  invoicesCount: number;
  yearsSpan: string;
}

export interface FilterState {
  start: string;
  end: string;
}

export interface CapacitorProposal {
  targetFp: number;
  requiredKvar: number;
  estimatedSavingMonthly: number;
  status: 'Eficiente' | 'Recomendado' | 'Crítico';
}
