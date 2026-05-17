import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';
import './AnalyticsStyles.css';
import Navbar from '../reusable_components/NavBar';
import userImg from '../assets/userAvatar.jpg';
import PetShieldLogo from '../assets/PetShieldLogo.jpg';
import Notifications from '../reusable_components/Notifications';
import { apiService } from '../apiService';

// Icons
import { 
  IoArrowUpOutline, IoArrowDownOutline,
  IoWarningOutline, IoBulbOutline, IoTrendingUpOutline,
  IoSparkles, IoAlertCircle,
  
  IoWalletOutline, IoReceiptOutline, IoCalculatorOutline, IoCheckmarkDoneCircleOutline,
  IoDiamondOutline,
  IoDownloadOutline, IoDocumentTextOutline, IoTabletPortraitOutline,
  IoChevronDownOutline, IoStatsChart, IoCloseOutline} from 'react-icons/io5';

// ==================== TYPES ====================
interface Admin {
  id: number;
  name: string;
  username: string;
  role: string;
  image?: string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  predictedChange?: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  aiPrediction?: string;
}

interface SalesTrendData {
  day: string;
  actual: number | null;
  predicted: number;
  appointments: number | null;
}

interface TopServiceData {
  service: string;
  revenue: number;
  count: number;
  trend?: number;
}

interface TopProductData {
  product: string;
  quantitySold: number;
  revenue: number;
  daysUntilOut?: number;
  predictedDemand?: number;
  demandForecastMode?: string;
}

interface SalesDistributionData {
  name: string;
  value: number;
  color: string;
}

interface PeakTimeData {
  hour: string;
  appointments: number;
  sales: number;
  predicted?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  reorderPoint: number;
  movementRate: 'fast' | 'medium' | 'slow';
  dailyUsage: number;
  daysUntilOut: number;
  recommendedReorder: number;
}

interface Insight {
  id: string;
  text: string;
  type: 'growth' | 'warning' | 'opportunity';
  icon?: string;
  action?: string;
}

interface BranchOption {
  id: number | string;
  name: string;
}

interface ForecastValidationRow {
  date: string;
  day: string;
  actual: number;
  predicted: number;
  error: number;
  errorPercent?: number | null;
}

interface ForecastValidation {
  mode?: string;
  reason?: string | null;
  accuracy?: number | null;
  meanAbsoluteError?: number | null;
  meanAbsolutePercentageError?: number | null;
  featureSet?: string;
  rows: ForecastValidationRow[];
  trainingSamples?: number;
  positiveSamples?: number;
  validationStartDate?: string | null;
  validationEndDate?: string | null;
}

interface ForecastComponentStatus {
  mode?: string;
  reason?: string | null;
  trainingSamples?: number;
  positiveSamples?: number;
  featureSet?: string;
}

interface ForecastDataRange {
  trainingStartDate?: string | null;
  trainingEndDate?: string | null;
  forecastStartDate?: string | null;
  forecastEndDate?: string | null;
}

interface AnalyticsFilters {
  branchId?: number | string | null;
  startDate?: string;
  endDate?: string;
  previousStartDate?: string;
  previousEndDate?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
}

interface AnalyticsOverview {
  branches: BranchOption[];
  filters?: AnalyticsFilters;
  kpis: {
    totalRevenue: number;
    totalRevenueChange: number;
    totalTransactions: number;
    totalTransactionsChange: number;
    averageTransaction: number;
    averageTransactionChange: number;
    completedAppointments: number;
    completedAppointmentsChange: number;
    predictedRevenue: number;
    predictedRevenueChange: number;
  };
  salesTrend: SalesTrendData[];
  topServices: TopServiceData[];
  topProducts: TopProductData[];
  salesDistribution: SalesDistributionData[];
  peakHours: PeakTimeData[];
  inventory: InventoryItem[];
  insights: Insight[];
  forecast?: {
    mode?: string;
    label?: string;
    description?: string;
    algorithm?: string;
    mlComponentsActive?: number;
    revenue?: ForecastComponentStatus;
    appointments?: ForecastComponentStatus;
    validation?: ForecastValidation;
    dataRange?: ForecastDataRange;
  };
}

const emptyAnalyticsOverview: AnalyticsOverview = {
  branches: [],
  filters: {},
  kpis: {
    totalRevenue: 0,
    totalRevenueChange: 0,
    totalTransactions: 0,
    totalTransactionsChange: 0,
    averageTransaction: 0,
    averageTransactionChange: 0,
    completedAppointments: 0,
    completedAppointmentsChange: 0,
    predictedRevenue: 0,
    predictedRevenueChange: 0,
  },
  salesTrend: [],
  topServices: [],
  topProducts: [],
  salesDistribution: [
    { name: 'Services', value: 0, color: '#3d67ee' },
    { name: 'Products', value: 0, color: '#10b981' },
  ],
  peakHours: [],
  inventory: [],
  insights: [],
  forecast: {
    mode: 'trend',
    label: 'Trend Forecast Active',
    description: 'Based on recent real sales trends',
    algorithm: 'RandomForestRegressor',
    mlComponentsActive: 0,
    validation: {
      rows: [],
    },
  },
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const mergeAnalyticsOverview = (raw?: Partial<AnalyticsOverview> | null): AnalyticsOverview => ({
  ...emptyAnalyticsOverview,
  ...(raw || {}),
  branches: raw?.branches || emptyAnalyticsOverview.branches,
  filters: raw?.filters || emptyAnalyticsOverview.filters,
  kpis: {
    ...emptyAnalyticsOverview.kpis,
    ...(raw?.kpis || {}),
  },
  salesTrend: raw?.salesTrend || emptyAnalyticsOverview.salesTrend,
  topServices: raw?.topServices || emptyAnalyticsOverview.topServices,
  topProducts: raw?.topProducts || emptyAnalyticsOverview.topProducts,
  salesDistribution: raw?.salesDistribution || emptyAnalyticsOverview.salesDistribution,
  peakHours: raw?.peakHours || emptyAnalyticsOverview.peakHours,
  inventory: raw?.inventory || emptyAnalyticsOverview.inventory,
  insights: raw?.insights || emptyAnalyticsOverview.insights,
  forecast: {
    ...emptyAnalyticsOverview.forecast,
    ...(raw?.forecast || {}),
  },
});

const formatExpectedChange = (change?: number, label = 'expected next period'): string => {
  if (change === undefined || Number.isNaN(change) || change === 0) {
    return 'Based on current trend';
  }
  return `${change > 0 ? '+' : '-'}${Math.abs(change)}% ${label}`;
};

const getShortBranchName = (name?: string | null): string => {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('taguig')) return 'Taguig';
  if (normalized.includes('las') || normalized.includes('piñas') || normalized.includes('pinas') || normalized.includes('bf resort')) {
    return 'Las Pinas';
  }
  return name || 'Branch';
};

const formatInsightPercent = (value: number): string =>
  `${Math.abs(Math.round(value * 10) / 10)}%`;

const buildDerivedSalesInsights = (analytics: AnalyticsOverview): Insight[] => {
  const insights: Insight[] = [];
  const addInsight = (insight: Insight) => {
    if (!insights.some(item => item.id === insight.id)) insights.push(insight);
  };

  const lowPerformanceChecks = [
    {
      id: 'derived-low-revenue',
      label: 'Revenue',
      value: analytics.kpis.totalRevenueChange,
      action: 'Review last month promotions, pricing, and high-value invoice sources.',
    },
    {
      id: 'derived-low-transactions',
      label: 'Transactions',
      value: analytics.kpis.totalTransactionsChange,
      action: 'Run appointment reminders and reactivation messages for inactive clients.',
    },
    {
      id: 'derived-low-average-transaction',
      label: 'Average transaction value',
      value: analytics.kpis.averageTransactionChange,
      action: 'Bundle services with relevant products to increase basket size.',
    },
    {
      id: 'derived-low-appointments',
      label: 'Completed appointments',
      value: analytics.kpis.completedAppointmentsChange,
      action: 'Check schedule availability, cancellations, and follow-up conversion.',
    },
  ];

  lowPerformanceChecks.forEach(check => {
    if (Number.isFinite(check.value) && check.value <= -10) {
      addInsight({
        id: check.id,
        text: `${check.label} is ${formatInsightPercent(check.value)} lower than the previous period.`,
        type: 'warning',
        icon: '⚠️',
        action: check.action,
      });
    }
  });

  analytics.inventory
    .filter(item => item.movementRate === 'slow')
    .slice(0, 4)
    .forEach(item => {
      addInsight({
        id: `derived-slow-product-${item.id}`,
        text: `${item.name} is slow moving and may tie up inventory cash.`,
        type: 'opportunity',
        icon: '🏷️',
        action: 'Try a limited-time bundle, add-on discount, shelf highlight, or social post featuring use cases.',
      });
    });

  analytics.topServices
    .filter(service => Number(service.trend || 0) <= -10 || service.count <= 2)
    .slice(0, 4)
    .forEach(service => {
      addInsight({
        id: `derived-slow-service-${normalizeInsightId(service.service)}`,
        text: `${service.service} shows weak service momentum${service.trend !== undefined ? ` (${formatReportPercent(service.trend)})` : ''}.`,
        type: 'opportunity',
        icon: '📣',
        action: 'Promote with client education posts, follow-up reminders, package pricing, or staff recommendation scripts.',
      });
    });

  analytics.topServices
    .filter(service => Number(service.trend || 0) >= 10)
    .slice(0, 3)
    .forEach(service => {
      addInsight({
        id: `derived-growth-service-${normalizeInsightId(service.service)}`,
        text: `${service.service} is gaining traction${service.trend !== undefined ? ` (${formatReportPercent(service.trend)})` : ''}.`,
        type: 'growth',
        icon: '📈',
        action: 'Feature it in homepage banners, appointment prompts, and service bundles.',
      });
    });

  analytics.topProducts
    .filter(product => Number(product.predictedDemand || 0) > Number(product.quantitySold || 0))
    .slice(0, 3)
    .forEach(product => {
      addInsight({
        id: `derived-growth-product-${normalizeInsightId(product.product)}`,
        text: `${product.product} has demand upside based on forecasted product movement.`,
        type: 'growth',
        icon: '🛒',
        action: 'Keep stock visible at checkout and pair it with related services.',
      });
    });

  const topService = analytics.topServices[0];
  if (topService) {
    addInsight({
      id: `derived-service-upsell-${normalizeInsightId(topService.service)}`,
      text: `${topService.service} is a strong service anchor for add-on sales.`,
      type: 'growth',
      icon: '🧩',
      action: 'Create a bundle with related products, follow-up checkups, or preventive care reminders.',
    });
  }

  const topProduct = analytics.topProducts[0];
  if (topProduct) {
    addInsight({
      id: `derived-product-merchandising-${normalizeInsightId(topProduct.product)}`,
      text: `${topProduct.product} can be used as a merchandising hook for repeat purchases.`,
      type: 'growth',
      icon: '🛍️',
      action: 'Place it near checkout, mention it after related services, and test a multi-buy offer.',
    });
  }

  const busiestHour = analytics.peakHours.reduce<PeakTimeData | null>(
    (best, item) => (!best || (item.appointments || 0) > (best.appointments || 0) ? item : best),
    null,
  );
  if (busiestHour && (busiestHour.appointments || 0) > 0) {
    addInsight({
      id: `derived-peak-hour-${normalizeInsightId(busiestHour.hour)}`,
      text: `${busiestHour.hour} is currently the busiest appointment window.`,
      type: 'growth',
      icon: '⏰',
      action: 'Offer off-peak promos while keeping staff and inventory ready for this high-demand hour.',
    });
  }

  if (analytics.kpis.predictedRevenueChange >= 10) {
    addInsight({
      id: 'derived-predicted-revenue-growth',
      text: `Forecasted revenue is ${formatInsightPercent(analytics.kpis.predictedRevenueChange)} higher for the next period.`,
      type: 'growth',
      icon: '🚀',
      action: 'Prepare staffing, stock, and marketing around the expected demand lift.',
    });
  }

  if (analytics.salesDistribution.some(item => item.value > 0)) {
    const productsShare = analytics.salesDistribution.find(item => item.name.toLowerCase() === 'products')?.value || 0;
    const servicesShare = analytics.salesDistribution.find(item => item.name.toLowerCase() === 'services')?.value || 0;
    if (productsShare < 25) {
      addInsight({
        id: 'derived-product-attach-opportunity',
        text: `Products are only ${productsShare}% of item revenue.`,
        type: 'opportunity',
        icon: '💡',
        action: 'Train checkout prompts for after-care kits, preventives, and grooming add-ons.',
      });
    }
    if (servicesShare < 45) {
      addInsight({
        id: 'derived-service-mix-opportunity',
        text: `Services are only ${servicesShare}% of item revenue.`,
        type: 'opportunity',
        icon: '💡',
        action: 'Launch service reminders for vaccines, dental care, grooming, and wellness check-ups.',
      });
    }
  }

  return insights;
};

const normalizeInsightId = (value: string): string =>
  String(value || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

const mergeInsights = (baseInsights: Insight[], derivedInsights: Insight[]): Insight[] => {
  const seen = new Set<string>();
  return [...baseInsights, ...derivedInsights].filter(insight => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });
};

const formatDateShort = (value?: string | null): string => {
  if (!value) return 'N/A';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
  <div className="analytics-empty-chart">{message}</div>
);

type AnalyticsExportFormat = 'pdf' | 'excel';
type AnalyticsExportPreset = 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days' | 'custom';

const EXPORT_PRESETS: Array<{ key: AnalyticsExportPreset; label: string }> = [
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom Range' },
];

const EXPORT_SECTIONS = [
  { key: 'summary', label: 'KPI Summary' },
  { key: 'salesTrend', label: 'Sales Trend & Forecast' },
  { key: 'topServices', label: 'Top Services' },
  { key: 'topProducts', label: 'Top Products' },
  { key: 'distribution', label: 'Sales Distribution' },
  { key: 'peakHours', label: 'Peak Hours' },
  { key: 'inventory', label: 'Inventory Risks' },
  { key: 'insights', label: 'AI Sales Intelligence' },
  { key: 'validation', label: 'Forecast Validation' },
] as const;

type ExportSectionKey = typeof EXPORT_SECTIONS[number]['key'];

interface AnalyticsExportTable {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

interface AnalyticsExportPayload {
  report: AnalyticsOverview;
  branchLabel: string;
  startDate: string;
  endDate: string;
  selectedSections: Record<ExportSectionKey, boolean>;
}

const createDefaultExportSections = (): Record<ExportSectionKey, boolean> =>
  EXPORT_SECTIONS.reduce((selected, section) => {
    selected[section.key] = true;
    return selected;
  }, {} as Record<ExportSectionKey, boolean>);

const formatInputDate = (date: Date): string => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timezoneOffset = normalized.getTimezoneOffset() * 60000;
  return new Date(normalized.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getExportPresetRange = (preset: AnalyticsExportPreset): { startDate: string; endDate: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'this_week') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return {
      startDate: formatInputDate(addDays(today, mondayOffset)),
      endDate: formatInputDate(today),
    };
  }

  if (preset === 'this_month') {
    return {
      startDate: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatInputDate(today),
    };
  }

  if (preset === 'last_7_days') {
    return {
      startDate: formatInputDate(addDays(today, -6)),
      endDate: formatInputDate(today),
    };
  }

  if (preset === 'last_30_days') {
    return {
      startDate: formatInputDate(addDays(today, -29)),
      endDate: formatInputDate(today),
    };
  }

  return {
    startDate: formatInputDate(today),
    endDate: formatInputDate(today),
  };
};

const getBranchLabel = (branches: BranchOption[], branchId: string): string => {
  if (!branchId || branchId === 'all') return 'All Branches';
  const branch = branches.find((item) => String(item.id) === String(branchId));
  return branch ? getShortBranchName(branch.name) : `Branch ${branchId}`;
};

const formatReportCurrency = (value?: number | null): string =>
  `PHP ${Math.round(Number(value || 0)).toLocaleString('en-US')}`;

const formatReportPercent = (value?: number | null): string => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return '0%';
  if (numericValue === 0) return '0%';
  const roundedValue = Math.round(Math.abs(numericValue) * 10) / 10;
  return `${numericValue > 0 ? '+' : '-'}${roundedValue}%`;
};

const formatReportNumber = (value?: number | null): string =>
  Math.round(Number(value || 0)).toLocaleString('en-US');

const formatReportDateRange = (startDate: string, endDate: string): string =>
  `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;

const buildEmptyReportRow = (headers: string[]): string[] =>
  headers.map((_, index) => (index === 0 ? 'No data available' : ''));

const buildAnalyticsExportFilename = (
  startDate: string,
  endDate: string,
  extension: 'pdf' | 'xlsx'
): string => `PawRang-Analytics-${startDate}-to-${endDate}.${extension}`;

const buildAnalyticsExportTables = (report: AnalyticsOverview): Record<ExportSectionKey, AnalyticsExportTable> => {
  const kpis = report.kpis;
  const validationRows = report.forecast?.validation?.rows || [];

  return {
    summary: {
      title: 'KPI Summary',
      headers: ['Metric', 'Value', 'Current Change', 'Forecast'],
      rows: [
        ['Total Revenue', formatReportCurrency(kpis.totalRevenue), formatReportPercent(kpis.totalRevenueChange), formatReportPercent(kpis.predictedRevenueChange)],
        ['Total Transactions', formatReportNumber(kpis.totalTransactions), formatReportPercent(kpis.totalTransactionsChange), ''],
        ['Average Transaction', formatReportCurrency(kpis.averageTransaction), formatReportPercent(kpis.averageTransactionChange), ''],
        ['Completed Appointments', formatReportNumber(kpis.completedAppointments), formatReportPercent(kpis.completedAppointmentsChange), ''],
        ['Predicted Revenue', formatReportCurrency(kpis.predictedRevenue), '', report.forecast?.label || 'Forecast active'],
      ],
    },
    salesTrend: {
      title: 'Sales Trend & Forecast',
      headers: ['Day', 'Actual Revenue', 'Predicted Revenue', 'Appointments'],
      rows: report.salesTrend.map((item) => [
        item.day,
        item.actual === null ? 'Forecast only' : formatReportCurrency(item.actual),
        formatReportCurrency(item.predicted),
        item.appointments === null ? 'Forecast' : formatReportNumber(item.appointments),
      ]),
    },
    topServices: {
      title: 'Top Services by Revenue',
      headers: ['Service', 'Revenue', 'Transactions', 'Trend'],
      rows: report.topServices.map((item) => [
        item.service,
        formatReportCurrency(item.revenue),
        formatReportNumber(item.count),
        item.trend === undefined ? 'N/A' : formatReportPercent(item.trend),
      ]),
    },
    topProducts: {
      title: 'Top Products by Quantity Sold',
      headers: ['Product', 'Quantity Sold', 'Revenue', 'Predicted Demand', 'Days Until Out'],
      rows: report.topProducts.map((item) => [
        item.product,
        formatReportNumber(item.quantitySold),
        formatReportCurrency(item.revenue),
        item.predictedDemand === undefined ? 'N/A' : formatReportNumber(item.predictedDemand),
        item.daysUntilOut === undefined ? 'N/A' : String(item.daysUntilOut),
      ]),
    },
    distribution: {
      title: 'Sales Distribution',
      headers: ['Source', 'Share'],
      rows: report.salesDistribution.map((item) => [
        item.name,
        `${Number(item.value || 0).toFixed(1)}%`,
      ]),
    },
    peakHours: {
      title: 'Peak Hour Analytics',
      headers: ['Hour', 'Appointments', 'Sales', 'Predicted Appointments'],
      rows: report.peakHours.map((item) => [
        item.hour,
        formatReportNumber(item.appointments),
        formatReportCurrency(item.sales),
        item.predicted === undefined ? 'N/A' : formatReportNumber(item.predicted),
      ]),
    },
    inventory: {
      title: 'Inventory Risks',
      headers: ['Item', 'Stock', 'Reorder Point', 'Movement', 'Daily Usage', 'Days Until Out', 'Recommended Reorder'],
      rows: report.inventory.map((item) => [
        item.name,
        formatReportNumber(item.stock),
        formatReportNumber(item.reorderPoint),
        item.movementRate,
        formatReportNumber(item.dailyUsage),
        String(item.daysUntilOut),
        formatReportNumber(item.recommendedReorder),
      ]),
    },
    insights: {
      title: 'AI Sales Intelligence',
      headers: ['Type', 'Insight', 'Recommended Action'],
      rows: report.insights.map((item) => [
        item.type,
        item.text,
        item.action || 'Review',
      ]),
    },
    validation: {
      title: 'Forecast Validation',
      headers: ['Date', 'Actual Revenue', 'Predicted Revenue', 'Error', 'Error Percent'],
      rows: validationRows.map((item) => [
        formatDateShort(item.date),
        formatReportCurrency(item.actual),
        formatReportCurrency(item.predicted),
        formatReportCurrency(item.error),
        item.errorPercent === null || item.errorPercent === undefined ? 'N/A' : `${item.errorPercent}%`,
      ]),
    },
  };
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const imageUrlToArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return response.arrayBuffer();
};

const getExcelColumnName = (columnNumber: number): string => {
  let dividend = columnNumber;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

const exportAnalyticsAsPdf = async ({
  report,
  branchLabel,
  startDate,
  endDate,
  selectedSections,
}: AnalyticsExportPayload): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = ((autoTableModule as any).default || (autoTableModule as any).autoTable) as (doc: any, options: any) => void;
  if (!autoTable) {
    throw new Error('PDF export library is unavailable.');
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tables = buildAnalyticsExportTables(report);
  let currentY = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PawRang Analytics Report', 40, currentY);

  currentY += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Branch: ${branchLabel}`, 40, currentY);
  doc.text(`Range: ${formatReportDateRange(startDate, endDate)}`, 260, currentY);
  doc.text(`Forecast: ${report.forecast?.label || 'Forecast active'}`, 520, currentY);
  currentY += 26;

  EXPORT_SECTIONS.filter((section) => selectedSections[section.key]).forEach((section) => {
    const table = tables[section.key];
    if (currentY > pageHeight - 96) {
      doc.addPage();
      currentY = 48;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(table.title, 40, currentY);

    autoTable(doc, {
      startY: currentY + 8,
      head: [table.headers],
      body: table.rows.length ? table.rows : [buildEmptyReportRow(table.headers)],
      theme: 'grid',
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: [61, 103, 238], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 50) + 26;
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, pageHeight - 24);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 95, pageHeight - 24);
  }

  doc.save(buildAnalyticsExportFilename(startDate, endDate, 'pdf'));
};

const sanitizeSheetName = (name: string): string =>
  name.replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Report';

const exportAnalyticsAsExcel = async ({
  report,
  branchLabel,
  startDate,
  endDate,
  selectedSections,
}: AnalyticsExportPayload): Promise<void> => {
  const ExcelJSModule = await import('exceljs');
  const Workbook = (ExcelJSModule as any).Workbook || (ExcelJSModule as any).default?.Workbook;
  if (!Workbook) {
    throw new Error('Excel export library is unavailable.');
  }
  const workbook = new Workbook();
  const tables = buildAnalyticsExportTables(report);

  workbook.creator = 'PawRang';
  workbook.created = new Date();

  let logoImageId: number | null = null;
  try {
    const arrayBuffer = await imageUrlToArrayBuffer(PetShieldLogo);
    logoImageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'jpeg',
    });
  } catch (error) {
    console.log('Logo not found, continuing without logo', error);
  }

  EXPORT_SECTIONS.filter((section) => selectedSections[section.key]).forEach((section) => {
    const table = tables[section.key];
    const worksheet = workbook.addWorksheet(sanitizeSheetName(section.label));
    const columnCount = Math.max(table.headers.length, 6);
    const lastColumn = getExcelColumnName(columnCount);

    worksheet.pageSetup.paperSize = 9;
    worksheet.pageSetup.orientation = 'landscape';
    worksheet.pageSetup.margins = {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    };

    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      const header = table.headers[columnIndex - 1] || '';
      worksheet.getColumn(columnIndex).width = Math.max(16, Math.min(38, header.length + 12));
    }

    if (logoImageId !== null) {
      worksheet.addImage(logoImageId, {
        tl: { col: 0.9, row: 0.5 },
        ext: { width: 100, height: 100 },
        editAs: 'absolute',
      });
    }

    worksheet.mergeCells(`A1:${lastColumn}1`);
    const clinicNameCell = worksheet.getCell('A1');
    clinicNameCell.value = '     PETSHIELD VETERINARY CLINIC AND GROOMING CENTER';
    clinicNameCell.font = {
      bold: true,
      size: 16,
      color: { argb: 'FF1E3A5F' },
      name: 'Segoe UI',
    };
    clinicNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 45;

    worksheet.mergeCells(`A2:${lastColumn}2`);
    const addressCell = worksheet.getCell('A2');
    addressCell.value = '     99 General Espino St, cor. Bravo St, Central Signal, Taguig, 1630 Metro Manila';
    addressCell.font = {
      size: 10,
      color: { argb: 'FF2C5F8A' },
      name: 'Segoe UI',
    };
    addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;

    worksheet.mergeCells(`A3:${lastColumn}3`);
    const mobileCell = worksheet.getCell('A3');
    mobileCell.value = '     Mobile No.: +63 905 457 0190';
    mobileCell.font = {
      size: 10,
      color: { argb: 'FF2C5F8A' },
      name: 'Segoe UI',
      bold: true,
    };
    mobileCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 25;

    worksheet.getRow(4).height = 10;

    worksheet.mergeCells(`A5:${lastColumn}5`);
    const reportTitleCell = worksheet.getCell('A5');
    reportTitleCell.value = `ANALYTICS REPORT - ${table.title.toUpperCase()}`;
    reportTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: 'FF1E3A5F' },
      name: 'Segoe UI',
    };
    reportTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    reportTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' },
    };
    worksheet.getRow(5).height = 30;

    worksheet.mergeCells(`A6:${lastColumn}6`);
    const exportDateCell = worksheet.getCell('A6');
    exportDateCell.value = `Export Date: ${new Date().toLocaleDateString()} | Export Time: ${new Date().toLocaleTimeString()}`;
    exportDateCell.font = {
      italic: true,
      size: 10,
      color: { argb: 'FF888888' },
      name: 'Segoe UI',
    };
    exportDateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(6).height = 20;

    worksheet.mergeCells(`A7:${lastColumn}7`);
    const reportMetaCell = worksheet.getCell('A7');
    reportMetaCell.value = `Branch: ${branchLabel} | Range: ${formatReportDateRange(startDate, endDate)} | Forecast: ${report.forecast?.label || 'Forecast active'}`;
    reportMetaCell.font = {
      size: 10,
      color: { argb: 'FF2C5F8A' },
      name: 'Segoe UI',
      bold: true,
    };
    reportMetaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    reportMetaCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFAFAFA' },
    };
    worksheet.getRow(7).height = 24;

    worksheet.getRow(8).height = 5;

    const headerRow = worksheet.getRow(9);
    headerRow.height = 32;
    table.headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header.toUpperCase();
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    const rows = table.rows.length ? table.rows : [buildEmptyReportRow(table.headers)];
    rows.forEach((row, rowIndex) => {
      const rowNumber = 10 + rowIndex;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = row;
      dataRow.height = 24;
      dataRow.alignment = { vertical: 'middle' };

      dataRow.eachCell((cell: any) => {
        const cellValue = String(cell.value || '');
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };

        if (cellValue.startsWith('PHP ') || cellValue.endsWith('%') || /^\d[\d,]*(\.\d+)?$/.test(cellValue)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        }
      });

      if (rowIndex % 2 === 1) {
        dataRow.eachCell((cell: any) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAFAFA' },
          };
        });
      }
    });

    const footerRow = 10 + rows.length + 1;
    worksheet.mergeCells(`A${footerRow}:${lastColumn}${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = `Generated by PetShield Veterinary Clinic Analytics System | Last updated: ${new Date().toLocaleDateString()}`;
    footerCell.font = {
      size: 9,
      italic: true,
      color: { argb: 'FF888888' },
      name: 'Segoe UI',
    };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    footerCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    footerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFAFAFA' },
    };
    worksheet.getRow(footerRow).height = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, buildAnalyticsExportFilename(startDate, endDate, 'xlsx'));
};

// ==================== MOCK DATA ====================
const currentUser: Admin = {
  id: 1,
  name: 'Dr. Margaret Hilario',
  username: 'margaret.hilario',
  role: 'Administrator',
  image: userImg
};

// Sales Trend with Forecast (Actual + Predicted)
const mockSalesTrend: SalesTrendData[] = [
  { day: 'Mon', actual: 12500, predicted: 12500, appointments: 12 },
  { day: 'Tue', actual: 14800, predicted: 14800, appointments: 15 },
  { day: 'Wed', actual: 18200, predicted: 18200, appointments: 18 },
  { day: 'Thu', actual: 15900, predicted: 15900, appointments: 16 },
  { day: 'Fri', actual: 22500, predicted: 22500, appointments: 22 },
  { day: 'Sat', actual: 9800, predicted: 11200, appointments: 10 },
  { day: 'Sun', actual: 4500, predicted: 6800, appointments: 5 },
  { day: 'Mon (Fcst)', actual: null, predicted: 13500, appointments: null },
  { day: 'Tue (Fcst)', actual: null, predicted: 15200, appointments: null },
  { day: 'Wed (Fcst)', actual: null, predicted: 17800, appointments: null },
];

const mockTopServices: TopServiceData[] = [
  { service: 'Grooming', revenue: 28450, count: 142, trend: 32 },
  { service: 'Vaccination', revenue: 18750, count: 125, trend: 8 },
  { service: 'Dental Care', revenue: 12300, count: 41, trend: -5 },
  { service: 'Check-up', revenue: 11200, count: 56, trend: 12 },
  { service: 'Surgery', revenue: 8750, count: 12, trend: -2 },
  { service: 'Boarding', revenue: 5600, count: 28, trend: 18 },
].sort((a, b) => b.revenue - a.revenue);

const mockTopProducts: TopProductData[] = [
  { product: 'Premium Dog Food', quantitySold: 245, revenue: 36750, daysUntilOut: 12 },
  { product: 'Rabies Vaccine', quantitySold: 180, revenue: 27000, daysUntilOut: 3 },
  { product: 'Flea Treatment', quantitySold: 156, revenue: 15600, daysUntilOut: 8 },
  { product: 'Pet Shampoo', quantitySold: 98, revenue: 5880, daysUntilOut: 15 },
  { product: 'Dental Chews', quantitySold: 87, revenue: 4350, daysUntilOut: 20 },
  { product: 'Cat Litter', quantitySold: 72, revenue: 5040, daysUntilOut: 25 },
].sort((a, b) => b.quantitySold - a.quantitySold);

const mockSalesDistribution: SalesDistributionData[] = [
  { name: 'Services', value: 68.5, color: '#3d67ee' },
  { name: 'Products', value: 31.5, color: '#10b981' },
];

const mockPeakHours: PeakTimeData[] = [
  { hour: '9 AM', appointments: 8, sales: 4200, predicted: 9 },
  { hour: '10 AM', appointments: 12, sales: 6800, predicted: 14 },
  { hour: '11 AM', appointments: 10, sales: 5500, predicted: 11 },
  { hour: '12 PM', appointments: 6, sales: 3200, predicted: 7 },
  { hour: '1 PM', appointments: 5, sales: 2800, predicted: 6 },
  { hour: '2 PM', appointments: 9, sales: 4900, predicted: 10 },
  { hour: '3 PM', appointments: 11, sales: 6200, predicted: 12 },
  { hour: '4 PM', appointments: 7, sales: 3800, predicted: 8 },
  { hour: '5 PM', appointments: 4, sales: 2100, predicted: 5 },
];

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Rabies Vaccine', stock: 5, reorderPoint: 20, movementRate: 'fast', dailyUsage: 5, daysUntilOut: 1, recommendedReorder: 50 },
  { id: '2', name: 'Flea Treatment', stock: 12, reorderPoint: 15, movementRate: 'fast', dailyUsage: 3, daysUntilOut: 4, recommendedReorder: 30 },
  { id: '3', name: 'Surgical Gloves', stock: 8, reorderPoint: 25, movementRate: 'medium', dailyUsage: 2, daysUntilOut: 4, recommendedReorder: 40 },
  { id: '4', name: 'Antibiotics', stock: 3, reorderPoint: 10, movementRate: 'fast', dailyUsage: 2, daysUntilOut: 1.5, recommendedReorder: 25 },
  { id: '5', name: 'Pet Shampoo', stock: 25, reorderPoint: 20, movementRate: 'medium', dailyUsage: 4, daysUntilOut: 6, recommendedReorder: 35 },
  { id: '6', name: 'Dental Chews', stock: 42, reorderPoint: 15, movementRate: 'fast', dailyUsage: 6, daysUntilOut: 7, recommendedReorder: 40 },
  { id: '7', name: 'Cat Litter', stock: 18, reorderPoint: 20, movementRate: 'slow', dailyUsage: 1, daysUntilOut: 18, recommendedReorder: 15 },
  { id: '8', name: 'Syringes', stock: 6, reorderPoint: 30, movementRate: 'medium', dailyUsage: 3, daysUntilOut: 2, recommendedReorder: 45 },
];

const mockInsights: Insight[] = [
  { id: '1', text: 'Revenue increased by 18% this week compared to last week', type: 'growth', icon: '📈', action: 'Check growth drivers' },
  { id: '2', text: 'Grooming services are trending +32% this month', type: 'growth', icon: '✂️', action: 'Consider adding more grooming slots' },
  { id: '3', text: 'Sales dropped significantly on Sunday (-41% vs Saturday)', type: 'warning', icon: '⚠️', action: 'Review Sunday operations' },
  { id: '4', text: 'Bundle grooming + shampoo for higher sales (+25% potential)', type: 'opportunity', icon: '🎯', action: 'Create bundle package' },
  { id: '5', text: 'Rabies Vaccine will run out in 1 days - Immediate reorder needed', type: 'warning', icon: '💊', action: 'Place urgent order' },
  { id: '6', text: 'Peak hour prediction: Saturday 10 AM will be busiest this week', type: 'opportunity', icon: '⏰', action: 'Schedule extra staff' },
  { id: '7', text: 'Antibiotics sales increased by 25% last 7 days', type: 'growth', icon: '💊', action: 'Increase stock level' },
];

// ==================== KPI CARD COMPONENT ====================
const KpiCard: React.FC<KpiCardProps> = ({ 
  title, value, change, prefix, suffix, 
  icon, iconBgColor, aiPrediction 
}) => {
  const isPositive = change === undefined || change >= 0;

  return (
    <div className="kpi-card-ai">
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        <div className="kpi-icon-wrapper" style={{ backgroundColor: iconBgColor || '#3d67ee13' }}>
          {icon}
        </div>
      </div>
      <div className="kpi-value">
        {prefix && <span className="kpi-prefix">{prefix}</span>}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="kpi-suffix">{suffix}</span>}
      </div>
      <div className="kpi-trends">
        {change !== undefined && (
          <div className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <IoArrowUpOutline size={12} /> : <IoArrowDownOutline size={12} />}
            {Math.abs(change)}% from last period
          </div>
        )}
      </div>
      {aiPrediction && (
        <div className="kpi-ai-insight">
          <IoSparkles size={10} />
          <span>{aiPrediction}</span>
        </div>
      )}
    </div>
  );
};

// ==================== EXPORT BUTTON COMPONENT ====================
const ExportButton: React.FC<{
  buttonClassName?: string;
  branches: BranchOption[];
  selectedBranch: string;
}> = ({ buttonClassName = '', branches, selectedBranch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<AnalyticsExportFormat>('pdf');
  const [datePreset, setDatePreset] = useState<AnalyticsExportPreset>('this_month');
  const defaultRange = getExportPresetRange('this_month');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const branchId = 'all';
  const [selectedSections, setSelectedSections] = useState<Record<ExportSectionKey, boolean>>(createDefaultExportSections);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectAllSectionsRef = useRef<HTMLInputElement>(null);
  const selectedSectionValues = Object.values(selectedSections);
  const allSectionsSelected = selectedSectionValues.every(Boolean);
  const partiallySelected = selectedSectionValues.some(Boolean) && !allSectionsSelected;

  const openExportModal = (format: AnalyticsExportFormat) => {
    setExportFormat(format);
    setExportError('');
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handlePresetChange = (preset: AnalyticsExportPreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getExportPresetRange(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDatePreset('custom');
    if (field === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const toggleSection = (sectionKey: ExportSectionKey) => {
    setSelectedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const toggleAllSections = () => {
    const shouldSelectAll = !allSectionsSelected;
    setSelectedSections(
      EXPORT_SECTIONS.reduce((nextSelection, section) => {
        nextSelection[section.key] = shouldSelectAll;
        return nextSelection;
      }, {} as Record<ExportSectionKey, boolean>)
    );
  };

  const handleGenerateExport = async () => {
    const selectedSectionCount = Object.values(selectedSections).filter(Boolean).length;

    if (!startDate || !endDate) {
      setExportError('Please select a valid report date range.');
      return;
    }

    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      setExportError('Start date must be before the end date.');
      return;
    }

    if (selectedSectionCount === 0) {
      setExportError('Please choose at least one report section.');
      return;
    }

    try {
      setIsExporting(true);
      setExportError('');

      const response = await apiService.getAdminAnalyticsOverview({
        branchId,
        startDate,
        endDate,
      });
      const report = mergeAnalyticsOverview(response as Partial<AnalyticsOverview>);
      const payload: AnalyticsExportPayload = {
        report,
        branchLabel: getBranchLabel(branches.length ? branches : report.branches, branchId),
        startDate,
        endDate,
        selectedSections,
      };

      if (exportFormat === 'pdf') {
        await exportAnalyticsAsPdf(payload);
      } else {
        await exportAnalyticsAsExcel(payload);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      setExportError(error?.message || 'Unable to generate analytics report.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectAllSectionsRef.current) {
      selectAllSectionsRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  return (
    <>
      <div className="export-dropdown-wrapper" ref={dropdownRef}>
        <button className={`export-btn ${buttonClassName}`} onClick={() => setIsOpen(!isOpen)}>
          <IoDownloadOutline size={16} />
          <span>Export</span>
          <IoChevronDownOutline size={12} className={isOpen ? 'rotated' : ''} />
        </button>

        {isOpen && (
          <div className="export-dropdown-menu">
            <button onClick={() => openExportModal('pdf')}>
              <IoDocumentTextOutline size={16} />
              <span>Export as PDF</span>
            </button>
            <button onClick={() => openExportModal('excel')}>
              <IoTabletPortraitOutline size={16} />
              <span>Export as Excel</span>
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="analytics-export-modal-overlay" onClick={() => !isExporting && setIsModalOpen(false)}>
          <div className="analytics-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="analytics-export-modal-header">
              <div>
                <h2>Export Analytics Report</h2>
                <span>{formatReportDateRange(startDate, endDate)}</span>
              </div>
              <button
                type="button"
                className="analytics-export-modal-close"
                onClick={() => setIsModalOpen(false)}
                disabled={isExporting}
                aria-label="Close export modal"
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            <div className="analytics-export-modal-body">
              <div className="analytics-export-field-group">
                <label>File Type</label>
                <div className="analytics-export-format-toggle">
                  <button
                    type="button"
                    className={exportFormat === 'pdf' ? 'active' : ''}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <IoDocumentTextOutline size={16} />
                    PDF Report
                  </button>
                  <button
                    type="button"
                    className={exportFormat === 'excel' ? 'active' : ''}
                    onClick={() => setExportFormat('excel')}
                  >
                    <IoTabletPortraitOutline size={16} />
                    Excel Workbook
                  </button>
                </div>
              </div>

              <div className="analytics-export-field-group">
                <label>Date Range</label>
                <div className="analytics-export-preset-grid">
                  {EXPORT_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={datePreset === preset.key ? 'active' : ''}
                      onClick={() => handlePresetChange(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-export-date-grid">
                <div className="analytics-export-field-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => handleDateChange('start', event.target.value)}
                  />
                </div>
                <div className="analytics-export-field-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => handleDateChange('end', event.target.value)}
                  />
                </div>
              </div>

              <div className="analytics-export-field-group">
                <div className="analytics-export-sections-header">
                  <label>Report Sections</label>
                  <label className="analytics-export-select-all">
                    <input
                      ref={selectAllSectionsRef}
                      type="checkbox"
                      checked={allSectionsSelected}
                      onChange={toggleAllSections}
                    />
                    <span>Select All</span>
                  </label>
                </div>
                <div className="analytics-export-section-grid">
                  {EXPORT_SECTIONS.map((section) => (
                    <label key={section.key} className="analytics-export-section-option">
                      <input
                        type="checkbox"
                        checked={selectedSections[section.key]}
                        onChange={() => toggleSection(section.key)}
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {exportError && (
                <div className="analytics-export-error">
                  <IoAlertCircle size={14} />
                  <span>{exportError}</span>
                </div>
              )}
            </div>

            <div className="analytics-export-modal-footer">
              <button
                type="button"
                className="analytics-export-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="analytics-export-primary"
                onClick={handleGenerateExport}
                disabled={isExporting}
              >
                <IoDownloadOutline size={16} />
                {isExporting ? 'Preparing Report...' : `Generate ${exportFormat === 'pdf' ? 'PDF' : 'Excel'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==================== PAGE HEADER (INVENTORY STYLE) ====================
const PageHeader: React.FC<{
  branches: BranchOption[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
}> = ({
  branches,
  selectedBranch,
  onBranchChange,
}) => {
  return (
      <header className="analytics-hero-panel">
        <div className="analytics-hero-brand">
          <div className="analytics-hero-icon-tile">
            <IoStatsChart size={28} />
          </div>
          <div>
            <span className="analytics-hero-kicker">Petshield Intelligence</span>
            <h1>Analytics Dashboard</h1>
            <p>Track revenue, demand, sales mix, peak hours, and forecast confidence.</p>
          </div>
        </div>
        
        <div className="analytics-hero-actions">
          <label className="analytics-branch-selector">
            <select 
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="analytics-branch-select"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {getShortBranchName(branch.name)}
                </option>
              ))}
            </select>
          </label>
              
          <ExportButton
            buttonClassName="analytics-export-btn"
            branches={branches}
            selectedBranch={selectedBranch}
          />
          <div className="analytics-notification-container">
            <Notifications
              buttonClassName="analytics-icon-button"
              iconClassName="analytics-blue-icon"
              closeOnScroll
              onViewAll={() => {
                console.log('View all notifications');
              }}
              onNotificationClick={(notification) => {
                if (notification.link) {
                  // navigate(notification.link);
                }
              }}
            />
          </div>
        </div>
      </header>
  );
};

// ==================== SALES TREND CHART ====================
const SalesTrendWithForecast: React.FC<{ data: SalesTrendData[]; forecastLabel?: string }> = ({ data, forecastLabel }) => {
  const chartData = data.map(item => ({
    day: item.day,
    actual: item.actual,
    predicted: item.predicted,
  }));

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <div>
          <h3>Sales Trend & Forecast</h3>
          <span className="chart-subtitle">Real revenue trend with next 3 days forecast</span>
        </div>
        <div className="ai-badge">
          <IoSparkles size={12} /> {forecastLabel || 'Trend Forecast Active'}
        </div>
      </div>
      {chartData.length === 0 ? (
        <EmptyChart message="No revenue trend data yet" />
      ) : (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3d67ee" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3d67ee" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
          <YAxis tickFormatter={(value) => `₱${value / 1000}k`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(rawValue, name, entry: any) => {
              const numericValue = toNumberOrNull(rawValue);
              const dataKey = String(entry?.dataKey ?? name);
              const label = dataKey === 'actual' || name === 'Actual Revenue' ? 'Actual Revenue' : 'Predicted Revenue';
              const value = numericValue ?? 0;
              if (numericValue === null) return ['No data', label];
              return [`₱${value.toLocaleString()}`, label];
            }}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Legend />
          <Area type="monotone" dataKey="actual" stroke="#3d67ee" fill="url(#actualGradient)" />
          <Line type="monotone" dataKey="actual" stroke="#3d67ee" strokeWidth={2} dot={{ r: 4, fill: '#3d67ee' }} name="Actual Revenue" />
          <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} name="Predicted Revenue" />
        </LineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

// ==================== TOP SERVICES CHART ====================
const TopServicesChart: React.FC<{ data: TopServiceData[] }> = ({ data }) => {
  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Top Services by Revenue</h3>
        <span className="chart-subtitle">Most profitable services from billing invoices</span>
      </div>
      {data.length === 0 ? (
        <EmptyChart message="No service sales yet" />
      ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => `₱${value / 1000}k`} />
          <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} width={80} />
          <Tooltip
            formatter={(rawValue, name, props: any) => {
              const value = toNumberOrNull(rawValue) ?? 0;
              const trend = props.payload.trend;
              return [
                `₱${value.toLocaleString()} (${trend && trend > 0 ? `+${trend}%` : `${trend}%`})`,
                'Revenue'
              ];
            }}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={30} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

// ==================== TOP PRODUCTS CHART ====================
const TopProductsChart: React.FC<{ data: TopProductData[] }> = ({ data }) => {
  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Top Products by Quantity Sold</h3>
        <span className="chart-subtitle">Best-selling inventory items from invoices</span>
      </div>
      {data.length === 0 ? (
        <EmptyChart message="No product sales yet" />
      ) : (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="product" tick={{ fontSize: 10 }} width={100} />
          <Tooltip
            formatter={(value, name, props: any) => {
              const daysOut = props.payload.daysUntilOut;
              const predictedDemand = props.payload.predictedDemand;
              return [
                `${value} units sold${predictedDemand !== undefined ? `, ${predictedDemand} predicted next 7 days` : ''} (Est. ${daysOut} days until out of stock)`,
                'Quantity'
              ];
            }}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Bar dataKey="quantitySold" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={30} name="Quantity Sold" />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

// ==================== SALES DISTRIBUTION PIE CHART ====================
const SalesDistributionChart: React.FC<{ data: SalesDistributionData[] }> = ({ data }) => {
  const hasDistribution = data.some(item => item.value > 0);
  const serviceShare = data.find(item => item.name.toLowerCase() === 'services')?.value || 0;

  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Sales Distribution</h3>
        <span className="chart-subtitle">Revenue split between services and products</span>
      </div>
      {hasDistribution ? (
        <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={78}
            paddingAngle={5}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart message="No service/product split yet" />
      )}
      <div className="ai-insight-chip">
        <IoSparkles size={12} />
        <span>{hasDistribution ? `Services generate ${serviceShare}% of item revenue` : 'Service and product split will appear after invoices are paid'}</span>
      </div>
    </div>
  );
};

// ==================== PEAK TIME ANALYTICS ====================
const PeakTimeAnalytics: React.FC<{ data: PeakTimeData[]; forecastMode?: string }> = ({ data, forecastMode }) => {
  const highestPredicted = data.reduce<PeakTimeData | null>((max, item) => 
    (!max || (item.predicted && item.predicted > (max.predicted || 0))) ? item : max, null);
  const forecastVerb = forecastMode === 'ml' ? 'AI predicts' : 'Trend predicts';

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Peak Hour Analytics</h3>
        <span className="chart-subtitle">Busiest hours for completed appointments</span>
      </div>
      {data.length === 0 ? (
        <EmptyChart message="No completed appointment hours yet" />
      ) : (
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={50} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }} />
          <Legend />
          <Bar yAxisId="left" dataKey="appointments" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={25} name="Current Appointments" />
          <Line yAxisId="right" type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="AI Prediction" dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
      )}
      <div className="ai-insight-chip highlight">
        <IoSparkles size={12} />
        <span>{highestPredicted ? `${forecastVerb} ${highestPredicted.hour} will be the busiest hour` : 'Peak hour prediction appears after completed appointments'}</span>
      </div>
    </div>
  );
};

// ==================== INVENTORY INTELLIGENCE ====================
const InventoryIntelligence: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
  const criticalItems = items.filter(item => item.stock <= item.reorderPoint || item.daysUntilOut <= 3);
  const formatDaysUntilOut = (daysUntilOut: number) => (
    daysUntilOut >= 999 ? 'No recent usage' : `${daysUntilOut} days`
  );
  
  const movementData = [
    { name: 'Fast Moving', count: items.filter(i => i.movementRate === 'fast').length, color: '#10b981' },
    { name: 'Medium Moving', count: items.filter(i => i.movementRate === 'medium').length, color: '#f59e0b' },
    { name: 'Slow Moving', count: items.filter(i => i.movementRate === 'slow').length, color: '#ef4444' },
  ];
  const hasInventoryData = items.length > 0;

  return (
    <div className="inventory-intelligence">
      <div className="low-stock-section-ai">
        <h4><IoWarningOutline size={14} /> Critical Stock Alert</h4>
        {criticalItems.length === 0 ? (
          <p className="no-alert">No critical stock issues</p>
        ) : (
          <table className="low-stock-table-ai">
            <thead>
              <tr><th>Item Name</th><th>Stock</th><th>Days Until Out</th><th>AI Suggestion</th></tr>
            </thead>
            <tbody>
              {criticalItems.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td className="stock-critical">{item.stock} units</td>
                  <td className="stock-critical">{formatDaysUntilOut(item.daysUntilOut)}</td>
                  <td className="ai-suggestion">Reorder {item.recommendedReorder} units immediately</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="movement-section-ai">
        <h4>Item Movement Classification</h4>
        {hasInventoryData ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={movementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                {movementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No inventory items yet" />
        )}
        <div className="ai-insight-chip">
          <IoSparkles size={12} />
          <span>{hasInventoryData ? 'Fast-moving items: Prioritize auto-reordering' : 'Inventory movement appears after product sales'}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== AI INSIGHTS PANEL ====================
const AiInsightsPanel: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  const growthInsights = insights.filter(i => i.type === 'growth');
  const warningInsights = insights.filter(i => i.type === 'warning');
  const opportunityInsights = insights.filter(i => i.type === 'opportunity');

  return (
    <div className="insights-panel-ai-white">
      <div className="insights-header-ai-white">
        <h3><IoSparkles size={18} /> AI Sales Intelligence</h3>
        <span className="insights-badge-ai-white">Real-time Analysis</span>
      </div>
      
      <div className="insights-categories-white">
        {/* Growth Section */}
        <div className="insight-category-white growth">
          <div className="category-header-white">
            <IoTrendingUpOutline size={14} />
            <span>Growth Opportunities</span>
          </div>
          {growthInsights.length === 0 && <div className="insight-empty-white">No growth insight yet</div>}
          {growthInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white growth">
              <div className="insight-icon-white">{insight.icon || '📈'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white"><span>Suggested action</span>{insight.action}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Warning Section */}
        <div className="insight-category-white warning">
          <div className="category-header-white">
            <IoAlertCircle size={14} />
            <span>Warnings & Risks</span>
          </div>
          {warningInsights.length === 0 && <div className="insight-empty-white">No current warning</div>}
          {warningInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white warning">
              <div className="insight-icon-white">{insight.icon || '⚠️'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white"><span>Suggested action</span>{insight.action}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Opportunity Section */}
        <div className="insight-category-white opportunity">
          <div className="category-header-white">
            <IoBulbOutline size={14} />
            <span>Recommendations</span>
          </div>
          {opportunityInsights.length === 0 && <div className="insight-empty-white">No recommendation yet</div>}
          {opportunityInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white opportunity">
              <div className="insight-icon-white">{insight.icon || '💡'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white"><span>Suggested action</span>{insight.action}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AiInsightsSidePanel: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  const [openSection, setOpenSection] = useState<Insight['type'] | null>('growth');
  const sections: Array<{
    key: Insight['type'];
    title: string;
    icon: React.ReactNode;
    emptyText: string;
    items: Insight[];
  }> = [
    {
      key: 'growth',
      title: 'Growth Opportunities',
      icon: <IoTrendingUpOutline size={14} />,
      emptyText: 'No growth insight yet',
      items: insights.filter((insight) => insight.type === 'growth'),
    },
    {
      key: 'warning',
      title: 'Warnings & Risks',
      icon: <IoAlertCircle size={14} />,
      emptyText: 'No current warning',
      items: insights.filter((insight) => insight.type === 'warning'),
    },
    {
      key: 'opportunity',
      title: 'Recommendations',
      icon: <IoBulbOutline size={14} />,
      emptyText: 'No recommendation yet',
      items: insights.filter((insight) => insight.type === 'opportunity'),
    },
  ];

  const toggleSection = (key: Insight['type']) => {
    setOpenSection((current) => (current === key ? null : key));
  };

  return (
    <aside className="insights-panel-ai-white analytics-side-insights">
      <div className="insights-header-ai-white">
        <h3><IoSparkles size={16} /> AI Sales Intelligence</h3>
        <span className="insights-badge-ai-white">Live</span>
      </div>

      <div className="insights-categories-white">
        {sections.map((section) => {
          const isOpen = openSection === section.key;
          return (
            <div key={section.key} className={`insight-category-white ${section.key}`}>
              <button
                type="button"
                className="category-header-white"
                onClick={() => toggleSection(section.key)}
                aria-expanded={isOpen}
              >
                <span className="insight-category-title">
                  {section.items.length > 0 && <span className="insight-available-dot" />}
                  {section.icon}
                  <span>{section.title}</span>
                </span>
                <span className="insight-category-meta">
                  <span className="insight-count-badge">{section.items.length}</span>
                  <IoChevronDownOutline className={isOpen ? 'open' : ''} size={14} />
                </span>
              </button>

              {isOpen && (
                <div className="insight-category-body">
                  {section.items.length === 0 && <div className="insight-empty-white">{section.emptyText}</div>}
                  {section.items.map((insight) => (
                    <div key={insight.id} className={`insight-item-ai-white ${section.key}`}>
                      <div className="insight-icon-white">{insight.icon || '•'}</div>
                      <div className="insight-content-white">
                        <div className="insight-text-white">{insight.text}</div>
                        {insight.action && <div className="insight-action-white"><span>Suggested action</span>{insight.action}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

// ==================== FORECAST VALIDATION ====================
const ForecastValidationPanel: React.FC<{ validation?: ForecastValidation }> = ({ validation }) => {
  const rows = validation?.rows || [];
  const hasRows = rows.length > 0;

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <div>
          <h3>Actual vs Predicted Revenue</h3>
          <span className="chart-subtitle">Recent validation split for forecast defense</span>
        </div>
        <div className="forecast-accuracy-pill">
          {validation?.accuracy !== null && validation?.accuracy !== undefined ? `${validation.accuracy}% accuracy` : 'Pending validation'}
        </div>
      </div>

      {hasRows ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => `₱${value / 1000}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(rawValue, name, entry: any) => {
                  const value = toNumberOrNull(rawValue) ?? 0;
                  const dataKey = String(entry?.dataKey ?? name);
                  const label = dataKey === 'actual' || name === 'Actual Revenue' ? 'Actual Revenue' : 'Predicted Revenue';
                  return [`₱${value.toLocaleString()}`, label];
                }}
                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
              />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3d67ee" strokeWidth={2} dot={{ r: 4, fill: '#3d67ee' }} name="Actual Revenue" />
              <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} name="Predicted Revenue" />
            </LineChart>
          </ResponsiveContainer>

          <div className="validation-summary-grid">
            <div>
              <span>Validation Range</span>
              <strong>{formatDateShort(validation?.validationStartDate)} - {formatDateShort(validation?.validationEndDate)}</strong>
            </div>
            <div>
              <span>Mean Error</span>
              <strong>₱{Math.round(validation?.meanAbsoluteError || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>MAPE</span>
              <strong>{validation?.meanAbsolutePercentageError ?? 0}%</strong>
            </div>
          </div>
        </>
      ) : (
        <EmptyChart message={validation?.reason || 'No validation data available yet'} />
      )}
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(emptyAnalyticsOverview);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const { kpis } = analytics;
  const salesIntelligenceInsights = useMemo(
    () => mergeInsights(analytics.insights, buildDerivedSalesInsights(analytics)),
    [analytics],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        setAnalyticsError('');
        const response = await apiService.getAdminAnalyticsOverview({
          branchId: selectedBranch,
        });
        if (!cancelled) {
          setAnalytics(mergeAnalyticsOverview(response as Partial<AnalyticsOverview>));
        }
      } catch (error: any) {
        if (!cancelled) {
          setAnalyticsError(error?.message || 'Unable to load analytics data right now.');
        }
      } finally {
        if (!cancelled) {
          setLoadingAnalytics(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [selectedBranch]);

  const handleLogout = (): void => {
    navigate('/login');
  };

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <div className="bodyContainer">
        <div className="analytics-wrapper">
          {/* Page Header - Inventory Style */}
          <PageHeader
            branches={analytics.branches}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
          />

          {loadingAnalytics && (
            <div className="analytics-status-banner loading">
              <IoSparkles size={14} />
              <span>Loading real-time analytics...</span>
            </div>
          )}

          {analyticsError && (
            <div className="analytics-status-banner error">
              <IoAlertCircle size={14} />
              <span>{analyticsError}</span>
            </div>
          )}

          {/* KPI Cards Row */}
          <div className="kpi-grid-ai">
            <KpiCard 
              title="Total Revenue" 
              value={Math.round(kpis.totalRevenue)} 
              prefix="₱" 
              change={kpis.totalRevenueChange} 
              icon={<IoWalletOutline size={20} color="#10b981" />}
              iconBgColor="#10b98113"
              aiPrediction={formatExpectedChange(kpis.predictedRevenueChange, 'expected next period')}
            />
            <KpiCard 
              title="Total Transactions" 
              value={kpis.totalTransactions} 
              change={kpis.totalTransactionsChange} 
              icon={<IoReceiptOutline size={20} color="#3d67ee" />}
              iconBgColor="#3d67ee13"
              aiPrediction={formatExpectedChange(kpis.totalTransactionsChange, 'transaction trend')}
            />
            <KpiCard 
              title="Average Transaction" 
              value={Math.round(kpis.averageTransaction)} 
              prefix="₱" 
              change={kpis.averageTransactionChange} 
              icon={<IoCalculatorOutline size={20} color="#8b5cf6" />}
              iconBgColor="#8b5cf613"
              aiPrediction={kpis.averageTransactionChange === 0 ? 'Stable transaction value' : formatExpectedChange(kpis.averageTransactionChange, 'average value trend')}
            />
            <KpiCard 
              title="Completed Appointments" 
              value={kpis.completedAppointments} 
              change={kpis.completedAppointmentsChange} 
              icon={<IoCheckmarkDoneCircleOutline size={20} color="#f59e0b" />}
              iconBgColor="#f59e0b13"
              aiPrediction={formatExpectedChange(kpis.completedAppointmentsChange, 'appointment trend')}
            />
            <KpiCard 
              title="Predicted Revenue" 
              value={Math.round(kpis.predictedRevenue)} 
              prefix="₱" 
              icon={<IoDiamondOutline size={20} color="#06b6d4" />}
              iconBgColor="#06b6d413"
              aiPrediction={analytics.forecast?.description || 'Based on trend forecasting'}
            />
          </div>

          <div className="analytics-content-layout">
            <div className="analytics-main-column">
              <div className="charts-grid-ai">
                <SalesTrendWithForecast data={analytics.salesTrend} forecastLabel={analytics.forecast?.label} />
                <TopServicesChart data={analytics.topServices} />
              </div>

              <div className="charts-grid-ai">
                <TopProductsChart data={analytics.topProducts} />
                <SalesDistributionChart data={analytics.salesDistribution} />
              </div>

              <div className="charts-grid-ai analytics-single-chart analytics-inventory-row">
                <InventoryIntelligence items={analytics.inventory} />
              </div>

              <div className="charts-grid-ai analytics-single-chart analytics-peak-row">
                <PeakTimeAnalytics data={analytics.peakHours} forecastMode={analytics.forecast?.mode} />
              </div>

              <div className="charts-grid-ai analytics-single-chart">
                <ForecastValidationPanel validation={analytics.forecast?.validation} />
              </div>
            </div>

            <AiInsightsSidePanel insights={salesIntelligenceInsights} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
