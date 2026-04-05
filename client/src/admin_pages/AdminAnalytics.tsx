// AdminAnalytics.tsx (Updated with Navbar)
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area
} from 'recharts';
import './AnalyticsStyles.css';
import Navbar from '../reusable_components/NavBar';
import userImg from '../assets/userAvatar.jpg';

// Icons
import { 
  IoCalendarClearOutline,
  IoNotificationsOutline,
  IoPeopleOutline,
  IoPawOutline,
  IoTrendingUpOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoDocumentTextOutline,
  IoLayersOutline,
  IoCreateOutline
} from 'react-icons/io5';

import NotificationsAllModal from '../reusable_components/NotificationsAllModal';
import type { NotificationsModalRef } from '../reusable_components/NotificationsAllModal';

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
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

interface SalesTrendData {
  day: string;
  revenue: number;
  appointments: number;
}

interface TopServiceData {
  service: string;
  revenue: number;
  count: number;
}

interface TopProductData {
  product: string;
  quantitySold: number;
  revenue: number;
}

interface SalesDistributionData {
  name: string;
  value: number;
  color: string;
}

interface PeakHourData {
  hour: string;
  appointments: number;
  sales: number;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  reorderPoint: number;
  movementRate: 'fast' | 'medium' | 'slow';
}

interface Insight {
  id: string;
  text: string;
  type: 'positive' | 'warning' | 'neutral';
}

// ==================== MOCK DATA ====================
const currentUser: Admin = {
  id: 1,
  name: 'Dr. Margaret Hilario',
  username: 'margaret.hilario',
  role: 'Administrator',
  image: userImg
};

const mockSalesTrend: SalesTrendData[] = [
  { day: 'Mon', revenue: 12500, appointments: 12 },
  { day: 'Tue', revenue: 14800, appointments: 15 },
  { day: 'Wed', revenue: 18200, appointments: 18 },
  { day: 'Thu', revenue: 15900, appointments: 16 },
  { day: 'Fri', revenue: 22500, appointments: 22 },
  { day: 'Sat', revenue: 9800, appointments: 10 },
  { day: 'Sun', revenue: 4500, appointments: 5 },
];

const mockTopServices: TopServiceData[] = [
  { service: 'Grooming', revenue: 28450, count: 142 },
  { service: 'Vaccination', revenue: 18750, count: 125 },
  { service: 'Dental Care', revenue: 12300, count: 41 },
  { service: 'Check-up', revenue: 11200, count: 56 },
  { service: 'Surgery', revenue: 8750, count: 12 },
  { service: 'Boarding', revenue: 5600, count: 28 },
].sort((a, b) => b.revenue - a.revenue);

const mockTopProducts: TopProductData[] = [
  { product: 'Premium Dog Food', quantitySold: 245, revenue: 36750 },
  { product: 'Rabies Vaccine', quantitySold: 180, revenue: 27000 },
  { product: 'Flea Treatment', quantitySold: 156, revenue: 15600 },
  { product: 'Pet Shampoo', quantitySold: 98, revenue: 5880 },
  { product: 'Dental Chews', quantitySold: 87, revenue: 4350 },
  { product: 'Cat Litter', quantitySold: 72, revenue: 5040 },
].sort((a, b) => b.quantitySold - a.quantitySold);

const mockSalesDistribution: SalesDistributionData[] = [
  { name: 'Services', value: 68.5, color: '#3d67ee' },
  { name: 'Products', value: 31.5, color: '#10b981' },
];

const mockPeakHours: PeakHourData[] = [
  { hour: '9 AM', appointments: 8, sales: 4200 },
  { hour: '10 AM', appointments: 12, sales: 6800 },
  { hour: '11 AM', appointments: 10, sales: 5500 },
  { hour: '12 PM', appointments: 6, sales: 3200 },
  { hour: '1 PM', appointments: 5, sales: 2800 },
  { hour: '2 PM', appointments: 9, sales: 4900 },
  { hour: '3 PM', appointments: 11, sales: 6200 },
  { hour: '4 PM', appointments: 7, sales: 3800 },
  { hour: '5 PM', appointments: 4, sales: 2100 },
];

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Rabies Vaccine', stock: 5, reorderPoint: 20, movementRate: 'fast' },
  { id: '2', name: 'Flea Treatment', stock: 12, reorderPoint: 15, movementRate: 'fast' },
  { id: '3', name: 'Surgical Gloves', stock: 8, reorderPoint: 25, movementRate: 'medium' },
  { id: '4', name: 'Antibiotics', stock: 3, reorderPoint: 10, movementRate: 'fast' },
  { id: '5', name: 'Pet Shampoo', stock: 25, reorderPoint: 20, movementRate: 'medium' },
  { id: '6', name: 'Dental Chews', stock: 42, reorderPoint: 15, movementRate: 'fast' },
  { id: '7', name: 'Cat Litter', stock: 18, reorderPoint: 20, movementRate: 'slow' },
  { id: '8', name: 'Syringes', stock: 6, reorderPoint: 30, movementRate: 'medium' },
];

const mockInsights: Insight[] = [
  { id: '1', text: 'Sales increased by 15% this week compared to last week', type: 'positive' },
  { id: '2', text: 'Grooming services are trending +32% this month', type: 'positive' },
  { id: '3', text: 'Rabies Vaccine stock is critically low (5 units left)', type: 'warning' },
  { id: '4', text: 'Peak hours: 10 AM - 11 AM generates 40% of daily revenue', type: 'neutral' },
  { id: '5', text: 'Antibiotics sales increased by 25% last 7 days', type: 'positive' },
];

// ==================== KPI CARD COMPONENT ====================
const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, prefix, suffix, icon, iconBgColor, iconColor }) => {
  const isPositive = change && change > 0;
  const changeColor = isPositive ? '#10b981' : change && change < 0 ? '#ef4444' : '#64748b';

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {icon && (
          <div className="kpi-icon-wrapper" style={{ backgroundColor: iconBgColor || '#3d67ee13' }}>
            <span style={{ color: iconColor || '#3d67ee' }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="kpi-value">
        {prefix && <span className="kpi-prefix">{prefix}</span>}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="kpi-suffix">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className="kpi-change" style={{ color: changeColor }}>
          {isPositive ? <IoArrowUpOutline size={12} /> : <IoArrowDownOutline size={12} />}
          {Math.abs(change)}% from last period
        </div>
      )}
    </div>
  );
};

// ==================== SALES TREND CHART ====================
const SalesTrendChart: React.FC = () => {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Sales Trend</h3>
        <span className="chart-subtitle">Daily Revenue (Last 7 Days)</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={mockSalesTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3d67ee" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3d67ee" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `₱${value / 1000}k`} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          <Area type="monotone" dataKey="revenue" stroke="#3d67ee" fill="url(#revenueGradient)" name="Revenue" />
          <Line type="monotone" dataKey="revenue" stroke="#3d67ee" strokeWidth={2} dot={{ r: 4, fill: '#3d67ee' }} name="Revenue" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== TOP SERVICES CHART ====================
const TopServicesChart: React.FC = () => {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Top Services by Revenue</h3>
        <span className="chart-subtitle">Most profitable services</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockTopServices} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => `₱${value / 1000}k`} />
          <YAxis type="category" dataKey="service" tick={{ fontSize: 12 }} width={70} />
          <Tooltip
            formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
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
    <div className="chart-card">
      <div className="chart-header">
        <h3>Top Products by Quantity Sold</h3>
        <span className="chart-subtitle">Best-selling inventory items</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={mockTopProducts} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="product" tick={{ fontSize: 11 }} width={90} />
          <Tooltip
            formatter={(value: number) => [`${value} units`, 'Quantity Sold']}
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
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Sales Distribution</h3>
        <span className="chart-subtitle">Revenue split by category</span>
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
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
              const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
              return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
            labelLine={false}
          >
            {mockSalesDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value}%`, 'Share']} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ fontSize: '13px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== PEAK HOURS CHART ====================
const PeakHoursChart: React.FC = () => {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Peak Hours Analysis</h3>
        <span className="chart-subtitle">Busiest hours for appointments</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={mockPeakHours} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === 'appointments' ? `${value} appointments` : `₱${value.toLocaleString()}`,
              name === 'appointments' ? 'Appointments' : 'Sales'
            ]}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: 'none' }}
          />
          <Legend />
          <Bar dataKey="appointments" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={30} name="Appointments" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== INVENTORY ANALYTICS ====================
const InventoryAnalytics: React.FC = () => {
  const lowStockItems = mockInventory.filter(item => item.stock <= item.reorderPoint);
  
  const movementData = [
    { name: 'Fast Moving', count: mockInventory.filter(i => i.movementRate === 'fast').length, color: '#10b981' },
    { name: 'Medium Moving', count: mockInventory.filter(i => i.movementRate === 'medium').length, color: '#f59e0b' },
    { name: 'Slow Moving', count: mockInventory.filter(i => i.movementRate === 'slow').length, color: '#ef4444' },
  ];

  return (
    <div className="inventory-analytics">
      <div className="low-stock-section">
        <h4>⚠️ Low Stock Alert</h4>
        {lowStockItems.length === 0 ? (
          <p className="no-alert">All inventory levels are healthy</p>
        ) : (
          <table className="low-stock-table">
            <thead>
              <tr><th>Item Name</th><th>Current Stock</th><th>Reorder Point</th></tr>
            </thead>
            <tbody>
              {lowStockItems.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="stock-critical">{item.stock}</td>
                  <td>{item.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="movement-section">
        <h4>Item Movement Classification</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={movementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip formatter={(value: number) => [`${value} items`, 'Count']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
              {movementData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==================== AI INSIGHTS PANEL ====================
const AiInsightsPanel: React.FC = () => {
  const getIcon = (type: string) => {
    switch(type) {
      case 'positive': return '📈';
      case 'warning': return '⚠️';
      default: return '💡';
    }
  };

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <h3>🤖 AI Sales Insights</h3>
        <span className="insights-badge">Live Analysis</span>
      </div>
      <div className="insights-list">
        {mockInsights.map(insight => (
          <div key={insight.id} className={`insight-item ${insight.type}`}>
            <span className="insight-icon">{getIcon(insight.type)}</span>
            <span className="insight-text">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD WITH NAVBAR ====================
const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const notificationsModalRef = useRef<NotificationsModalRef>(null);
  
  const totalRevenue = 248500;
  const totalTransactions = 342;
  const avgTransactionValue = totalRevenue / totalTransactions;
  const totalAppointments = 98;

  const formatDate = (): string => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (): string => {
    const date = new Date();
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleLogout = (): void => {
    navigate('/login');
  };

  return (
    <div className="biContainer" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <div className="bodyContainer" style={{ paddingRight: '10px' }}>
        <div className="analytics-wrapper">
          {/* Profile Header Section - Matching AdminDashboard style */}
          <div className="profileCard" style={{ marginBottom: '20px', minHeight: '140px' }}>
            <div className="profileHeader" style={{ minHeight: '100px', padding: '15px' }}>
              <div className="profileInfo">
                <div className="profileNameSection" style={{ marginLeft: '140px' }}>
                  <h2 className="doctorName" style={{ fontSize: '18px' }}>{currentUser.name}</h2>
                  <p className="doctorUsername" style={{ fontSize: '11px' }}>@{currentUser.username}</p>
                  <p className="doctorRole" style={{ fontSize: '12px', marginTop: '12px' }}>{currentUser.role}</p>
                </div>
                <div className="profileDateTime">
                  <div className="profileGlassContainer" style={{ padding: '4px 12px' }}>
                    <span className="dateTimeText" style={{ fontSize: '11px' }}>
                      {formatDate()} - {formatTime()}
                    </span>
                  </div>
                  <button className="editProfileBtn" style={{ marginTop: '15px' }}>
                    <IoCreateOutline size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="profileAvatar" style={{ bottom: '-15px' }}>
              <img 
                src={currentUser.image || '../assets/AgsikapLogo-Temp.png'}
                alt={currentUser.name}
                className="doctorAvatar"
                style={{width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "4px solid white"}}
              />
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="kpi-grid">
            <KpiCard 
              title="Total Revenue" 
              value={totalRevenue} 
              prefix="₱" 
              change={12} 
              icon="💰"
              iconBgColor="#10b98113"
              iconColor="#10b981"
            />
            <KpiCard 
              title="Total Transactions" 
              value={totalTransactions} 
              change={8} 
              icon="📊"
              iconBgColor="#3d67ee13"
              iconColor="#3d67ee"
            />
            <KpiCard 
              title="Average Transaction" 
              value={Math.round(avgTransactionValue)} 
              prefix="₱" 
              change={5} 
              icon="📈"
              iconBgColor="#8b5cf613"
              iconColor="#8b5cf6"
            />
            <KpiCard 
              title="Completed Appointments" 
              value={totalAppointments} 
              change={15} 
              icon="📅"
              iconBgColor="#f59e0b13"
              iconColor="#f59e0b"
            />
          </div>

          {/* Main Charts Grid */}
          <div className="charts-grid-2col">
            <SalesTrendChart />
            <TopServicesChart />
          </div>

          <div className="charts-grid-2col">
            <TopProductsChart />
            <SalesDistributionChart />
          </div>

          <div className="charts-grid-2col">
            <PeakHoursChart />
            <InventoryAnalytics />
          </div>

          {/* AI Insights Panel */}
          <AiInsightsPanel />
        </div>
      </div>

      {/* Notifications Modal */}
      <NotificationsAllModal 
        ref={notificationsModalRef}
        onNotificationClick={(notification) => {
          if (notification.link) navigate(notification.link);
        }}
      />
    </div>
  );
};

export default AdminAnalytics;