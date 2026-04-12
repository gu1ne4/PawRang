import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';
import './AnalyticsStyles.css';
import Navbar from '../reusable_components/NavBar';
import userImg from '../assets/userAvatar.jpg';
import Notifications from '../reusable_components/Notifications';

// Icons
import { 
  IoArrowUpOutline, IoArrowDownOutline,
  IoWarningOutline, IoBulbOutline, IoTrendingUpOutline,
  IoSparkles, IoAlertCircle,
  
  IoWalletOutline, IoReceiptOutline, IoCalculatorOutline, IoCheckmarkDoneCircleOutline,
  IoDiamondOutline,
  IoDownloadOutline, IoDocumentTextOutline, IoTabletPortraitOutline,
  IoChevronDownOutline, IoStatsChart} from 'react-icons/io5';

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

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
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
  const isPositive = change && change > 0;

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
const ExportButton: React.FC<{ buttonClassName?: string }> = ({ buttonClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = () => {
    console.log('Exporting as PDF...');
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    console.log('Exporting as Excel...');
    setIsOpen(false);
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

  return (
    <div className="export-dropdown-wrapper" ref={dropdownRef}>
      <button className={`export-btn ${buttonClassName}`} onClick={() => setIsOpen(!isOpen)}>
        <IoDownloadOutline size={16} />
        <span>Export</span>
        <IoChevronDownOutline size={12} className={isOpen ? 'rotated' : ''} />
      </button>

      {isOpen && (
        <div className="export-dropdown-menu">
          <button onClick={handleExportPDF}>
            <IoDocumentTextOutline size={16} />
            <span>Export as PDF</span>
          </button>
          <button onClick={handleExportExcel}>
            <IoTabletPortraitOutline size={16} />
            <span>Export as Excel</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== PAGE HEADER (INVENTORY STYLE) ====================
const PageHeader: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState('All');

  return (
    <div className="analytics-top-container">
      <div className="analytics-sub-top-container" style={{ paddingLeft: '30px' }}>
        <div className="analytics-sub-top-left">
          <IoStatsChart size={23} className="analytics-blue-icon" />
          <span className="analytics-blue-text">Analytics Dashboard</span>
        </div>
        
        <div className="analytics-branch-selector">
          <span className="analytics-branch-label">Branch:</span>
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="analytics-branch-select"
          >
            <option value="All">All Branches</option>
            <option value="Taguig">Taguig</option>
            <option value="Las Pinas">Las Piñas</option>
          </select>
        </div>

        <ExportButton buttonClassName="analytics-export-btn" />
      </div>
      <div className="analytics-sub-top-container analytics-notification-container" style={{ padding: 9 }}>
        <Notifications 
          buttonClassName="analytics-icon-button"
          iconClassName="analytics-blue-icon"
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
  );
};

// ==================== SALES TREND CHART ====================
const SalesTrendWithForecast: React.FC = () => {
  const chartData = mockSalesTrend.map(item => ({
    day: item.day,
    actual: item.actual,
    predicted: item.predicted,
  }));

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <div>
          <h3>Sales Trend & Forecast</h3>
          <span className="chart-subtitle">AI-predicted revenue for next 3 days</span>
        </div>
        <div className="ai-badge">
          <IoSparkles size={12} /> AI Forecast Active
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
            formatter={(rawValue, name) => {
              const numericValue = toNumberOrNull(rawValue);
              const label = String(name);
              const value = numericValue ?? 0;
              if (numericValue === null) return ['No data', label];
              if (name === 'actual') return [`₱${value.toLocaleString()}`, 'Actual Revenue'];
              return [`₱${value.toLocaleString()}`, 'Predicted Revenue'];
            }}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Legend />
          <Area type="monotone" dataKey="actual" stroke="#3d67ee" fill="url(#actualGradient)" />
          <Line type="monotone" dataKey="actual" stroke="#3d67ee" strokeWidth={2} dot={{ r: 4, fill: '#3d67ee' }} name="Actual Revenue" />
          <Line type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} name="Predicted Revenue" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== TOP SERVICES CHART ====================
const TopServicesChart: React.FC = () => {
  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Top Services by Revenue</h3>
        <span className="chart-subtitle">Most profitable services with trend indicators</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockTopServices} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
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
    </div>
  );
};

// ==================== TOP PRODUCTS CHART ====================
const TopProductsChart: React.FC = () => {
  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Top Products by Quantity Sold</h3>
        <span className="chart-subtitle">Best-selling inventory items with AI predictions</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockTopProducts} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="product" tick={{ fontSize: 10 }} width={100} />
          <Tooltip
            formatter={(value, name, props: any) => {
              const daysOut = props.payload.daysUntilOut;
              return [
                `${value} units sold (Est. ${daysOut} days until out of stock)`,
                'Quantity'
              ];
            }}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Bar dataKey="quantitySold" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={30} name="Quantity Sold" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== SALES DISTRIBUTION PIE CHART ====================
const SalesDistributionChart: React.FC = () => {
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
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={mockSalesDistribution}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
          >
            {mockSalesDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="ai-insight-chip">
        <IoSparkles size={12} />
        <span>Services generate 68.5% of total revenue</span>
      </div>
    </div>
  );
};

// ==================== PEAK TIME ANALYTICS ====================
const PeakTimeAnalytics: React.FC = () => {
  const highestPredicted = mockPeakHours.reduce((max, item) => 
    (item.predicted && item.predicted > (max.predicted || 0)) ? item : max, mockPeakHours[0]);

  return (
    <div className="chart-card-ai">
      <div className="chart-header">
        <h3>Peak Hour Analytics</h3>
        <span className="chart-subtitle">Busiest hours for appointments with AI prediction</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={mockPeakHours} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
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
      <div className="ai-insight-chip highlight">
        <IoSparkles size={12} />
        <span>AI predicts {highestPredicted.hour} will be the busiest hour</span>
      </div>
    </div>
  );
};

// ==================== INVENTORY INTELLIGENCE ====================
const InventoryIntelligence: React.FC = () => {
  const lowStockItems = mockInventory.filter(item => item.stock <= item.reorderPoint);
  const criticalItems = lowStockItems.filter(item => item.daysUntilOut <= 2);
  
  const movementData = [
    { name: 'Fast Moving', count: mockInventory.filter(i => i.movementRate === 'fast').length, color: '#10b981' },
    { name: 'Medium Moving', count: mockInventory.filter(i => i.movementRate === 'medium').length, color: '#f59e0b' },
    { name: 'Slow Moving', count: mockInventory.filter(i => i.movementRate === 'slow').length, color: '#ef4444' },
  ];

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
                  <td className="stock-critical">{item.daysUntilOut} days</td>
                  <td className="ai-suggestion">Reorder {item.recommendedReorder} units immediately</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="movement-section-ai">
        <h4>Item Movement Classification</h4>
        <ResponsiveContainer width="100%" height={180}>
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
        <div className="ai-insight-chip">
          <IoSparkles size={12} />
          <span>Fast-moving items: Prioritize auto-reordering</span>
        </div>
      </div>
    </div>
  );
};

// ==================== AI INSIGHTS PANEL ====================
const AiInsightsPanel: React.FC = () => {
  const growthInsights = mockInsights.filter(i => i.type === 'growth');
  const warningInsights = mockInsights.filter(i => i.type === 'warning');
  const opportunityInsights = mockInsights.filter(i => i.type === 'opportunity');

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
          {growthInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white growth">
              <div className="insight-icon-white">{insight.icon || '📈'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white">→ {insight.action}</div>}
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
          {warningInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white warning">
              <div className="insight-icon-white">{insight.icon || '⚠️'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white">→ {insight.action}</div>}
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
          {opportunityInsights.map(insight => (
            <div key={insight.id} className="insight-item-ai-white opportunity">
              <div className="insight-icon-white">{insight.icon || '💡'}</div>
              <div className="insight-content-white">
                <div className="insight-text-white">{insight.text}</div>
                {insight.action && <div className="insight-action-white">→ {insight.action}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  
  const totalRevenue = 248500;
  const totalTransactions = 342;
  const avgTransactionValue = totalRevenue / totalTransactions;
  const totalAppointments = 98;
  const predictedRevenue = 287500;

  const handleLogout = (): void => {
    navigate('/login');
  };

  return (
    <div className="biContainer" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <div className="bodyContainer" style={{ paddingRight: '10px' }}>
        <div className="analytics-wrapper">
          {/* Page Header - Inventory Style */}
          <PageHeader />

          {/* KPI Cards Row */}
          <div className="kpi-grid-ai">
            <KpiCard 
              title="Total Revenue" 
              value={totalRevenue} 
              prefix="₱" 
              change={12} 
              icon={<IoWalletOutline size={20} color="#10b981" />}
              iconBgColor="#10b98113"
              aiPrediction="+15% expected next month"
            />
            <KpiCard 
              title="Total Transactions" 
              value={totalTransactions} 
              change={8} 
              icon={<IoReceiptOutline size={20} color="#3d67ee" />}
              iconBgColor="#3d67ee13"
              aiPrediction="+10% expected next month"
            />
            <KpiCard 
              title="Average Transaction" 
              value={Math.round(avgTransactionValue)} 
              prefix="₱" 
              change={5} 
              icon={<IoCalculatorOutline size={20} color="#8b5cf6" />}
              iconBgColor="#8b5cf613"
              aiPrediction="Stable growth expected"
            />
            <KpiCard 
              title="Completed Appointments" 
              value={totalAppointments} 
              change={15} 
              icon={<IoCheckmarkDoneCircleOutline size={20} color="#f59e0b" />}
              iconBgColor="#f59e0b13"
              aiPrediction="Peak season approaching"
            />
            <KpiCard 
              title="Predicted Revenue" 
              value={predictedRevenue} 
              prefix="₱" 
              icon={<IoDiamondOutline size={20} color="#06b6d4" />}
              iconBgColor="#06b6d413"
              aiPrediction="Based on AI forecasting"
            />
          </div>

          {/* Main Charts Grid */}
          <div className="charts-grid-ai">
            <SalesTrendWithForecast />
            <TopServicesChart />
          </div>

          <div className="charts-grid-ai">
            <TopProductsChart />
            <SalesDistributionChart />
          </div>

          <div className="charts-grid-ai">
            <PeakTimeAnalytics />
            <InventoryIntelligence />
          </div>

          {/* AI Insights Panel */}
          <AiInsightsPanel />
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
