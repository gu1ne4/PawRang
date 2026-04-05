import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../doctor_pages/DoctorStyles.css'
import userImg from '../assets/userAvatar.jpg';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

// Icons
import { 
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoNotificationsOutline,
  IoPersonAddOutline,
  IoLayersOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoDocumentTextOutline as IoDocumentText,
  IoPeopleOutline as IoPeople,
  IoPawOutline,
  IoTrendingUpOutline,
  IoTimeOutline,
  IoWarningOutline,
  IoArrowUp,
  IoArrowDown,
  IoVideocamOutline,
  IoMedkitOutline,
  IoCalendarNumberOutline
} from 'react-icons/io5';

import Navbar from '../reusable_components/NavBar';
import NotificationsAllModal from '../reusable_components/NotificationsAllModal';
import type { NotificationsModalRef } from '../reusable_components/NotificationsAllModal';

// ========== INTERFACES ==========

interface Admin {
  id: number;
  name: string;
  username: string;
  role: string;
  image?: string;
}

interface InventoryMovement {
  id: number;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  user: string;
  timestamp: string;
  category: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'appointment' | 'meeting' | 'reminder' | 'holiday' | 'surgery' | 'training';
  description?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  time: string;
  icon: string;
  color: string;
}

// Chart data interfaces
interface WeeklyData {
  day: string;
  appointments: number;
  patients: number;
}

interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  visits: number;
}

// ========== END OF INTERFACES ==========

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [date, setDate] = useState<Date>(new Date());
  const [showAllEvents, setShowAllEvents] = useState<boolean>(false);
  
  // Refs
  const notificationsModalRef = useRef<NotificationsModalRef>(null);
  
  // Mock data - replace with actual data from API
  const currentUser: Admin = {
    id: 1,
    name: 'Dr. Margaret Hilario',
    username: 'margaret.hilario',
    role: 'Veterinarian',
    image: userImg
  };

  // Inventory Movement Logs - IN and OUT of items
  const inventoryMovements: InventoryMovement[] = [
    { id: 1, itemName: 'Vaccine - Rabies', type: 'OUT', quantity: 5, user: 'Dr. Margaret', timestamp: '10 min ago', category: 'Medicines' },
    { id: 2, itemName: 'Syringes (Box)', type: 'IN', quantity: 2, user: 'Admin', timestamp: '1 hour ago', category: 'Supplies' },
    { id: 3, itemName: 'Dog Food - Premium', type: 'OUT', quantity: 10, user: 'Staff', timestamp: '2 hours ago', category: 'Food' },
    { id: 4, itemName: 'Antibiotics', type: 'OUT', quantity: 3, user: 'Dr. Margaret', timestamp: '3 hours ago', category: 'Medicines' },
    { id: 5, itemName: 'Surgical Gloves', type: 'IN', quantity: 4, user: 'Admin', timestamp: '5 hours ago', category: 'Supplies' },
    { id: 6, itemName: 'Cat Litter', type: 'OUT', quantity: 8, user: 'Staff', timestamp: '1 day ago', category: 'Supplies' },
    { id: 7, itemName: 'Vitamin Supplements', type: 'IN', quantity: 15, user: 'Admin', timestamp: '1 day ago', category: 'Medicines' },
  ];

  // Upcoming Calendar Events - Expanded mock data
  const allCalendarEvents: CalendarEvent[] = [
    { id: 1, title: 'Vaccination Drive', date: '2026-03-20', time: '09:00 AM', type: 'appointment', description: 'Annual rabies vaccination event' },
    { id: 2, title: 'Staff Meeting', date: '2026-03-18', time: '02:00 PM', type: 'meeting', description: 'Monthly clinic staff meeting' },
    { id: 3, title: 'Inventory Restock', date: '2026-03-19', time: '10:00 AM', type: 'reminder', description: 'Order new supplies' },
    { id: 4, title: 'Training Session', date: '2026-03-22', time: '01:00 PM', type: 'training', description: 'New equipment training' },
    { id: 5, title: 'Holiday - Araw ng Kagitingan', date: '2026-04-09', time: 'All day', type: 'holiday', description: 'Clinic closed' },
    { id: 6, title: 'Dental Check-up Event', date: '2026-03-25', time: '08:00 AM', type: 'appointment', description: 'Special dental services' },
    { id: 7, title: 'Emergency Surgery', date: '2026-03-17', time: '03:00 PM', type: 'surgery', description: 'Canine emergency procedure' },
    { id: 8, title: 'Vet Webinar', date: '2026-03-27', time: '07:00 PM', type: 'training', description: 'Online veterinary seminar' },
    { id: 9, title: 'Equipment Maintenance', date: '2026-03-21', time: '11:00 AM', type: 'reminder', description: 'X-ray machine servicing' },
    { id: 10, title: 'Client Appreciation Day', date: '2026-04-02', time: '10:00 AM', type: 'meeting', description: 'Free check-ups for loyal clients' },
    { id: 11, title: 'Pet Adoption Event', date: '2026-04-05', time: '09:00 AM', type: 'appointment', description: 'Community pet adoption drive' },
    { id: 12, title: 'Holy Week Break', date: '2026-03-28', time: 'All day', type: 'holiday', description: 'Clinic closed for Holy Week' },
  ];

  const notificationItems: NotificationItem[] = [
    { 
      id: 1, 
      title: 'Low stock alert', 
      description: 'Rabies vaccine running low (5 units left)', 
      time: '5 min ago',
      icon: 'warning',
      color: '#ef4444'
    },
    { 
      id: 2, 
      title: 'New appointment scheduled', 
      description: 'John Smith - Tomorrow at 9:00 AM', 
      time: '2 hours ago',
      icon: 'calendar',
      color: '#3d67ee'
    },
    { 
      id: 3, 
      title: 'Lab results ready', 
      description: 'Maria Garcia - Blood work completed', 
      time: '3 hours ago',
      icon: 'document',
      color: '#10b981'
    },
    { 
      id: 4, 
      title: 'Inventory delivered', 
      description: 'New shipment of supplies arrived', 
      time: '5 hours ago',
      icon: 'package',
      color: '#8b5cf6'
    },
  ];

  // Chart Data
  const weeklyData: WeeklyData[] = [
    { day: 'Mon', appointments: 12, patients: 8 },
    { day: 'Tue', appointments: 15, patients: 11 },
    { day: 'Wed', appointments: 18, patients: 14 },
    { day: 'Thu', appointments: 14, patients: 10 },
    { day: 'Fri', appointments: 20, patients: 16 },
    { day: 'Sat', appointments: 8, patients: 6 },
    { day: 'Sun', appointments: 4, patients: 3 },
  ];

  const serviceDistribution: ServiceDistribution[] = [
    { name: 'Check-up', value: 45, color: '#3d67ee' },
    { name: 'Vaccination', value: 25, color: '#10b981' },
    { name: 'Grooming', value: 15, color: '#f59e0b' },
    { name: 'Dental', value: 10, color: '#8b5cf6' },
    { name: 'Surgery', value: 5, color: '#ef4444' },
  ];

  const monthlyTrends: MonthlyTrend[] = [
    { month: 'Jan', revenue: 12500, visits: 145 },
    { month: 'Feb', revenue: 13800, visits: 162 },
    { month: 'Mar', revenue: 14200, visits: 178 },
    { month: 'Apr', revenue: 15800, visits: 195 },
    { month: 'May', revenue: 16200, visits: 210 },
    { month: 'Jun', revenue: 17500, visits: 228 },
  ];

  // Helper functions
  const getEventIcon = (type: string) => {
    switch(type) {
      case 'appointment': return <IoCalendarOutline size={14} />;
      case 'meeting': return <IoPeople size={14} />;
      case 'reminder': return <IoTimeOutline size={14} />;
      case 'holiday': return <IoWarningOutline size={14} />;
      case 'surgery': return <IoMedkitOutline size={14} />;
      case 'training': return <IoVideocamOutline size={14} />;
      default: return <IoCalendarOutline size={14} />;
    }
  };

  const getEventColor = (type: string): string => {
    switch(type) {
      case 'appointment': return '#3d67ee';
      case 'meeting': return '#8b5cf6';
      case 'reminder': return '#f59e0b';
      case 'holiday': return '#ef4444';
      case 'surgery': return '#dc2626';
      case 'training': return '#06b6d4';
      default: return '#3d67ee';
    }
  };

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
  
  const handleDateChange = (value: any) => {
    setDate(value);
  };

  const handleViewAllEvents = () => {
    setShowAllEvents(!showAllEvents);
  };

  const handleQuickAction = (action: () => void) => {
    action();
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '12px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ margin: '4px 0 0 0', color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const quickActions = [
    { icon: IoCalendarOutline, label: 'Appointments', iconColor: '#3566ee', bgColor: '#3566ee13', borderColor: '#3566ee', action: () => navigate('/schedule') },
    { icon: IoCalendarNumberOutline, label: 'Calendar', iconColor: '#06b6d4', bgColor: '#06b6d413', borderColor: '#06b6d4', action: () => console.log('Calendar feature coming soon') },
    { 
      icon: IoNotificationsOutline, 
      label: 'Notifications', 
      iconColor: '#eb8716', 
      bgColor: '#eb871613', 
      borderColor: '#eb8716', 
      action: () => notificationsModalRef.current?.openModal()
    },
    { 
      icon: IoPersonAddOutline, 
      label: 'Add Patient', 
      iconColor: '#c201c2', 
      bgColor: '#c201c213', 
      borderColor: '#c201c2', 
      action: () => navigate('/patient-records', { state: { autoOpenAddMode: true } })
    },
    { icon: IoDocumentText, label: 'Records', iconColor: '#f12ba5', bgColor: '#f12ba513', borderColor: '#f12ba5', action: () => navigate('/patient-records') },
    { icon: IoLayersOutline, label: 'Inventory', iconColor: '#ff2222', bgColor: '#ff222213', borderColor: '#ff2222', action: () => navigate('/inventory') },
  ];

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = allCalendarEvents
    .filter(event => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const displayedEvents = showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 5);

  return (
    <div className="biContainer" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="bodyContainer" style={{paddingRight: '10px'}}>
        <div className="doctorTableContainer">
          {/* Left Column */}
          <div className="leftContainer" style={{ paddingRight: '15px' }}>
            {/* Doctor Profile Card - COMPACT */}
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

            {/* Monthly Reports - 4 CARDS IN A ROW with Right Icons */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 className="sectionTitle" style={{ fontSize: '15px', marginTop: '15px', marginBottom: '2px' }}>Monthly Reports</h3>
                  <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '0' }}>Overview of this month's clinic activity</p>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '12px'
              }}>
                {/* Total Patients Card - Purple */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', 
                  borderRadius: '14px', 
                  padding: '14px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '12px', top: '12px', opacity: 0.3 }}>
                    <IoPeople size={32} />
                  </div>
                  <div style={{ opacity: 0.8, fontSize: '11px', marginBottom: '4px' }}>Total Patients</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>75</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', opacity: 0.9 }}>
                    <IoArrowUpOutline size={10} />
                    <span>2% from last month</span>
                  </div>
                </div>
                
                {/* Appointments Card - Teal */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', 
                  borderRadius: '14px', 
                  padding: '14px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '12px', top: '12px', opacity: 0.3 }}>
                    <IoCalendarClearOutline size={32} />
                  </div>
                  <div style={{ opacity: 0.8, fontSize: '11px', marginBottom: '4px' }}>Appointments</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>50</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', opacity: 0.9 }}>
                    <IoArrowDownOutline size={10} />
                    <span>5% from last month</span>
                  </div>
                </div>
                
                {/* Inventory Stock Card - Orange */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f97316, #fb923c)', 
                  borderRadius: '14px', 
                  padding: '14px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '12px', top: '12px', opacity: 0.3 }}>
                    <IoLayersOutline size={32} />
                  </div>
                  <div style={{ opacity: 0.8, fontSize: '11px', marginBottom: '4px' }}>Inventory Items</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>142</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', opacity: 0.9 }}>
                    <IoArrowDownOutline size={10} />
                    <span>8 items low stock</span>
                  </div>
                </div>
                
                {/* Revenue Card - Pink */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #ec4899, #f472b6)', 
                  borderRadius: '14px', 
                  padding: '14px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', right: '12px', top: '12px', opacity: 0.3 }}>
                    <IoPawOutline size={32} />
                  </div>
                  <div style={{ opacity: 0.8, fontSize: '11px', marginBottom: '4px' }}>Revenue</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>₱158K</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', opacity: 0.9 }}>
                    <IoArrowUpOutline size={10} />
                    <span>12% from last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - with colored backgrounds and functional buttons */}
            <h3 className="sectionTitle" style={{ fontSize: '15px', marginBottom: '2px' }}>Quick Actions</h3>
            <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '12px' }}>Frequently used tasks</p>
            
            <div className="quickActions" style={{ gap: '10px', marginBottom: '30px' }}>
              {quickActions.map((action, index) => (
                <button 
                  key={index}
                  className="quickActionBtn" 
                  onClick={() => handleQuickAction(action.action)}
                  style={{ 
                    padding: '8px', 
                    gap: '5px',
                    borderColor: action.borderColor,
                    backgroundColor: action.bgColor,
                    cursor: 'pointer'
                  }}
                >
                  <action.icon size={20} color={action.iconColor} />
                  <span style={{ fontSize: '9px', color: action.iconColor }}>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Weekly Appointments Chart */}
            <div className="appointmentsCard" style={{ padding: '15px', marginTop: '0', marginBottom: '15px' }}>
              <div className="cardHeader" style={{ marginBottom: '5px' }}>
                <h3 className="cardTitle" style={{ fontSize: '14px', margin: 0 }}>Weekly Activity</h3>
                <button className="viewAllBtn" style={{ fontSize: '11px' }}>Details</button>
              </div>
              <p style={{ fontSize: '10px', color: '#666', marginBottom: '12px' }}>Appointments & New Patients</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="appointments" name="Appointments" fill="#3d67ee" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="patients" name="New Patients" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Service Distribution + Monthly Trend */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              {/* Pie Chart - Service Distribution */}
              <div className="patientsCard" style={{ padding: '15px', flex: 1, marginTop: '0' }}>
                <div className="cardHeader" style={{ marginBottom: '5px' }}>
                  <h3 className="cardTitle" style={{ fontSize: '13px', margin: 0 }}>Services</h3>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Line Chart - Monthly Trend */}
              <div className="patientsCard" style={{ padding: '15px', flex: 1.5, marginTop: '0' }}>
                <div className="cardHeader" style={{ marginBottom: '5px' }}>
                  <h3 className="cardTitle" style={{ fontSize: '13px', margin: 0 }}>Monthly Trend</h3>
                  <IoTrendingUpOutline size={14} color="#10b981" />
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={monthlyTrends} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="visits" 
                      name="Visits" 
                      stroke="#3d67ee" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue (₱)" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Movement Logs - IN and OUT */}
            <div className="appointmentsCard" style={{ padding: '15px', marginBottom: '15px' }}>
              <div className="cardHeader" style={{ marginBottom: '8px' }}>
                <h3 className="cardTitle" style={{ fontSize: '14px', margin: 0 }}>Inventory Movement Logs</h3>
                <button className="viewAllBtn" style={{ fontSize: '11px' }}>View All</button>
              </div>
              <div className="inventoryLogsList">
                <div className="inventoryLogsHeader" style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  backgroundColor: '#ebf4ff', 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  marginBottom: '5px', 
                  fontWeight: 600, 
                  fontSize: '11px', 
                  color: '#1773e4' 
                }}>
                  <span style={{ flex: 0.5 }}>Type</span>
                  <span style={{ flex: 2 }}>Item</span>
                  <span style={{ flex: 1 }}>Qty</span>
                  <span style={{ flex: 1.5 }}>User</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>Time</span>
                </div>
                {inventoryMovements.slice(0, 5).map(movement => (
                  <div key={movement.id} className="inventoryLogRow" style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    padding: '8px 0', 
                    borderBottom: '1px solid #f0f0f0', 
                    alignItems: 'center', 
                    fontSize: '11px' 
                  }}>
                    <span style={{ flex: 0.5 }}>
                      <div style={{ 
                        backgroundColor: movement.type === 'IN' ? '#10b98120' : '#ef444420', 
                        padding: '4px', 
                        borderRadius: '6px', 
                        display: 'inline-flex',
                        color: movement.type === 'IN' ? '#10b981' : '#ef4444'
                      }}>
                        {movement.type === 'IN' ? <IoArrowDown size={12} /> : <IoArrowUp size={12} />}
                      </div>
                    </span>
                    <span style={{ flex: 2, fontWeight: 500, color: '#333' }}>{movement.itemName}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: movement.type === 'IN' ? '#10b981' : '#ef4444' }}>
                      {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                    </span>
                    <span style={{ flex: 1.5, color: '#666', fontSize: '10px' }}>{movement.user}</span>
                    <span style={{ flex: 1, textAlign: 'right', fontSize: '10px', color: '#999' }}>{movement.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - WIDER with overflow-y auto */}
          <div className="rightContainer" style={{ gap: '12px', flex: '0.7', overflowY: 'auto', paddingLeft: '2px' }}>
            {/* Notifications Section */}
            <div className="notificationsCard" style={{ padding: '12px', height: 'auto', maxHeight: '320px' }}>
              <div className="notificationsHeader" style={{ marginBottom: '10px', gap: '40px' }}>
                <div className="notificationsTitle" style={{ minWidth: 'auto', gap: '6px' }}>
                  <IoNotificationsOutline size={14} />
                  <h3 style={{ fontSize: '13px' }}>Notifications</h3>
                </div>
                <button 
                  className="viewAllBtn" 
                  style={{ fontSize: '10px' }}
                  onClick={() => notificationsModalRef.current?.openModal()}
                >
                  View All
                </button>
              </div>
              <div className="notificationsList" style={{ gap: '6px' }}>
                {notificationItems.map(notif => (
                  <div key={notif.id} className="notificationItem" style={{ padding: '8px', gap: '8px' }}>
                    <div className="notificationIcon" style={{ padding: '5px', backgroundColor: `${notif.color}20`, borderRadius: '8px' }}>
                      {notif.icon === 'calendar' && <IoCalendarOutline size={12} color={notif.color} />}
                      {notif.icon === 'document' && <IoDocumentText size={12} color={notif.color} />}
                      {notif.icon === 'warning' && <IoWarningOutline size={12} color={notif.color} />}
                      {notif.icon === 'package' && <IoLayersOutline size={12} color={notif.color} />}
                    </div>
                    <div className="notificationContent">
                      <p className="notificationTitle" style={{ fontSize: '11px' }}>{notif.title}</p>
                      <p className="notificationDesc" style={{ fontSize: '9px' }}>{notif.description}</p>
                    </div>
                    <span className="notificationTime" style={{ fontSize: '9px' }}>{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Component - SMALLER */}
            <div className="calendarCard" style={{ marginTop: '0' }}>
              <div className="calendarGradient" style={{ padding: '8px' }}>
                <Calendar
                  onChange={handleDateChange}
                  value={date}
                  tileClassName={({ date, view }) => 
                    view === 'month' && date.toDateString() === new Date().toDateString() 
                      ? 'today' 
                      : ''
                  }
                  formatShortWeekday={(_locale, date) => 
                    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()]
                  }
                />
              </div>
            </div>

            {/* Upcoming Events - NO GRADIENT BG, White card */}
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '15px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ 
                  fontSize: '10px', 
                  margin: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: '#1e293b'
                }}>
                  <IoCalendarNumberOutline size={18} color="#3d67ee" />
                  <span>Upcoming Events</span>
                  <span style={{ 
                    fontSize: '9px', 
                    backgroundColor: '#ebf4ff', 
                    padding: '0px 8px', 
                    borderRadius: '12px', 
                    color: '#3d67ee',
                    flexShrink: 0
                  }}>
                    {upcomingEvents.length}
                  </span>
                </h3>
                <button 
                  onClick={handleViewAllEvents}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#3d67ee', 
                    fontSize: '10px', 
                    padding: '4px 12px',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ebf4ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {showAllEvents ? 'Show Less' : 'View All'}
                </button>
              </div>
              <div className="upcomingEventsList" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {displayedEvents.length > 0 ? (
                  displayedEvents.map(event => {
                    const eventDate = new Date(event.date);
                    const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const isPast = event.date < today;
                    return (
                      <div key={event.id} className="upcomingEventItem" style={{ 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '10px', 
                        padding: '10px', 
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isPast ? 0.6 : 1,
                        border: '1px solid #e2e8f0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ 
                            backgroundColor: `${getEventColor(event.type)}20`, 
                            padding: '6px', 
                            borderRadius: '8px', 
                            display: 'inline-flex',
                            color: getEventColor(event.type)
                          }}>
                            {getEventIcon(event.type)}
                          </div>
                          <span style={{ color: '#1e293b', fontSize: '11px', fontWeight: 600, lineHeight: '14px' }}>{event.title}</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10px', marginLeft: '34px', lineHeight: '14px' }}>
                          {formattedDate} - {event.time}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '30px' }}>
                    No upcoming events
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Modal - Hidden component, just for modal access */}
      <NotificationsAllModal 
        ref={notificationsModalRef}
        onNotificationClick={(notification) => {
          if (notification.link) navigate(notification.link);
        }}
      />
    </div>
  );
};

export default AdminDashboard;