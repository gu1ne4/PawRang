import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../doctor_pages/DoctorStyles.css'
import userImg from '../assets/userAvatar.jpg';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, Legend, ComposedChart
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
  IoTimeOutline,
  IoWarningOutline,
  IoArrowUp,
  IoArrowDown,
  IoVideocamOutline,
  IoMedkitOutline,
  IoCalendarNumberOutline,
  IoSparkles} from 'react-icons/io5';

import Navbar from '../reusable_components/NavBar';
import NotificationsAllModal from '../reusable_components/NotificationsAllModal';
import type { Notification, NotificationsModalRef } from '../reusable_components/NotificationsAllModal';

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


interface VisitData {
  day: string;
  appointments: number;
  walkIns: number;
  total: number;
}

// ========== KPI CARD COMPONENT ==========
interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trendLabel?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  change, 
  prefix, 
  suffix, 
  icon, 
  iconBgColor, 
  trendLabel
}) => {
  const isPositive = change && change > 0;

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '16px', 
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid #f0f2f5',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>{title}</span>
        <div style={{ 
          backgroundColor: iconBgColor || '#3d67ee13', 
          width: '36px', 
          height: '36px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
        {prefix && <span style={{ fontSize: '20px', marginRight: '2px' }}>{prefix}</span>}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span style={{ fontSize: '16px', marginLeft: '2px' }}>{suffix}</span>}
      </div>
      {change !== undefined && (
        <div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '20px',
            backgroundColor: isPositive ? '#10b98113' : '#ef444413',
            color: isPositive ? '#10b981' : '#ef4444'
          }}>
            {isPositive ? <IoArrowUpOutline size={10} /> : <IoArrowDownOutline size={10} />}
            {Math.abs(change)}% {trendLabel || 'from last month'}
          </div>
        </div>
      )}
    </div>
  );
};



// ========== END OF COMPONENTS ==========

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

  // Upcoming Calendar Events
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

  const getNotificationType = (icon: NotificationItem['icon']): Notification['type'] => {
    switch (icon) {
      case 'warning':
        return 'warning';
      case 'document':
        return 'success';
      default:
        return 'info';
    }
  };

  const getNotificationTimestamp = (timeLabel: string): Date => {
    const now = new Date();
    const normalized = timeLabel.toLowerCase().trim();
    const match = normalized.match(/(\d+)\s*(min|mins|minute|minutes|hour|hours|day|days)/);

    if (!match) {
      return now;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const timestamp = new Date(now);

    if (unit.startsWith('min')) {
      timestamp.setMinutes(now.getMinutes() - amount);
      return timestamp;
    }

    if (unit.startsWith('hour')) {
      timestamp.setHours(now.getHours() - amount);
      return timestamp;
    }

    timestamp.setDate(now.getDate() - amount);
    return timestamp;
  };

  const dashboardNotifications: Notification[] = notificationItems.map((item) => ({
    id: String(item.id),
    title: item.title,
    message: item.description,
    type: getNotificationType(item.icon),
    timestamp: getNotificationTimestamp(item.time),
    read: false,
  }));

  // Recent Clinic Visits Data
  const recentVisitsData: VisitData[] = [
    { day: 'Mon', appointments: 12, walkIns: 5, total: 17 },
    { day: 'Tue', appointments: 15, walkIns: 7, total: 22 },
    { day: 'Wed', appointments: 18, walkIns: 6, total: 24 },
    { day: 'Thu', appointments: 14, walkIns: 8, total: 22 },
    { day: 'Fri', appointments: 20, walkIns: 10, total: 30 },
    { day: 'Sat', appointments: 8, walkIns: 4, total: 12 },
    { day: 'Sun', appointments: 4, walkIns: 2, total: 6 },
  ];

  // Weekly Data for chart

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
    { icon: IoCalendarOutline, label: 'Appointments', iconColor: '#3566ee', bgColor: '#3566ee13', borderColor: '#3566ee', hoverBg: '#3566ee25', action: () => navigate('/schedule') },
    { icon: IoCalendarNumberOutline, label: 'Calendar', iconColor: '#06b6d4', bgColor: '#06b6d413', borderColor: '#06b6d4', hoverBg: '#06b6d425', action: () => console.log('Calendar feature coming soon') },
    { 
      icon: IoNotificationsOutline, 
      label: 'Notifications', 
      iconColor: '#eb8716', 
      bgColor: '#eb871613', 
      borderColor: '#eb8716',
      hoverBg: '#eb871625',
      action: () => notificationsModalRef.current?.openModal()
    },
    { 
      icon: IoPersonAddOutline, 
      label: 'Add Patient', 
      iconColor: '#c201c2', 
      bgColor: '#c201c213', 
      borderColor: '#c201c2',
      hoverBg: '#c201c225',
      action: () => navigate('/patient-records', { state: { autoOpenAddMode: true } })
    },
    { icon: IoDocumentText, label: 'Records', iconColor: '#f12ba5', bgColor: '#f12ba513', borderColor: '#f12ba5', hoverBg: '#f12ba525', action: () => navigate('/patient-records') },
    { icon: IoLayersOutline, label: 'Inventory', iconColor: '#ff2222', bgColor: '#ff222213', borderColor: '#ff2222', hoverBg: '#ff222225', action: () => navigate('/inventory') },
  ];

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = allCalendarEvents
    .filter(event => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const displayedEvents = showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 5);

  // Calculate totals from recent visits

  return (
    <div className="biContainer" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="bodyContainer" style={{paddingRight: '10px'}}>
        <div className="doctorTableContainer">
          {/* Left Column */}
          <div className="leftContainer" style={{ paddingRight: '15px' }}>
            {/* Doctor Profile Card */}
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

            {/* Monthly Reports - KPI Cards */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="sectionTitle" style={{ fontSize: '15px', marginTop: '0', marginBottom: '2px' }}>Monthly Reports</h3>
                  <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '0' }}>Overview of this month's clinic activity</p>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  backgroundColor: '#3d67ee10', 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  fontSize: '10px',
                  color: '#3d67ee'
                }}>
                  <IoSparkles size={12} />
                  <span>Live Analytics</span>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '12px'
              }}>
                <KpiCard 
                  title="Total Patients"
                  value={75}
                  change={2}
                  icon={<IoPeople size={18} color="#8b5cf6" />}
                  iconBgColor="#8b5cf613"
                  iconColor="#8b5cf6"
                  trendLabel="from last month"
                />
                <KpiCard 
                  title="Appointments"
                  value={50}
                  change={-5}
                  icon={<IoCalendarClearOutline size={18} color="#14b8a6" />}
                  iconBgColor="#14b8a613"
                  iconColor="#14b8a6"
                  trendLabel="from last month"
                />
                <KpiCard 
                  title="Inventory Items"
                  value={142}
                  change={-8}
                  icon={<IoLayersOutline size={18} color="#f97316" />}
                  iconBgColor="#f9731613"
                  iconColor="#f97316"
                  trendLabel="items low stock"
                />
                <KpiCard 
                  title="Revenue"
                  value={158000}
                  prefix="₱"
                  change={12}
                  icon={<IoPawOutline size={18} color="#ec4899" />}
                  iconBgColor="#ec489913"
                  iconColor="#ec4899"
                  trendLabel="from last month"
                />
              </div>
            </div>

                        {/* Quick Actions - PRETTIER & RESPONSIVE */}
            <h3 className="sectionTitle" style={{ fontSize: '15px', marginBottom: '2px' }}>Quick Actions</h3>
            <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '12px' }}>Frequently used tasks</p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
              gap: '10px', 
              marginBottom: '30px'
            }}>
              {quickActions.map((action, index) => (
                <button 
                  key={index}
                  onClick={() => handleQuickAction(action.action)}
                  style={{ 
                    padding: '12px 8px', 
                    gap: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '14px',
                    border: `1px solid ${action.borderColor}`,
                    backgroundColor: action.bgColor,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '85px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = action.hoverBg;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${action.borderColor}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = action.bgColor;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <action.icon size={22} color={action.iconColor} />
                  <span style={{ fontSize: '10px', fontWeight: 500, color: action.iconColor, textAlign: 'center' }}>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Weekly Activity Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="sectionTitle" style={{ fontSize: '15px', marginTop: '0', marginBottom: '2px' }}>Weekly Activity</h3>
                  <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '0' }}>Appointments vs Walk-ins this week</p>
                </div>
                <button className="viewAllBtn" style={{ fontSize: '11px' }}>View Details</button>
              </div>
            

              {/* Chart */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #f0f2f5'
              }}>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={recentVisitsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="appointments" name="Appointments" fill="#3d67ee" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="walkIns" name="Walk-ins" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25} />
                    <Line type="monotone" dataKey="total" name="Total Visits" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Movement Logs */}
            <div className="appointmentsCard" style={{ padding: '15px', marginBottom: '15px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' }}>
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

          {/* Right Column */}
          <div className="rightContainer" style={{ gap: '12px', flex: '0.7', overflowY: 'auto', paddingLeft: '2px' }}>
            {/* Notifications Section */}
            <div className="notificationsCard" style={{ padding: '12px', height: 'auto', maxHeight: '320px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' }}>
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
                  <div key={notif.id} className="notificationItem" style={{ padding: '8px', gap: '8px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div className="notificationIcon" style={{ padding: '5px', backgroundColor: `${notif.color}20`, borderRadius: '8px' }}>
                      {notif.icon === 'calendar' && <IoCalendarOutline size={12} color={notif.color} />}
                      {notif.icon === 'document' && <IoDocumentText size={12} color={notif.color} />}
                      {notif.icon === 'warning' && <IoWarningOutline size={12} color={notif.color} />}
                      {notif.icon === 'package' && <IoLayersOutline size={12} color={notif.color} />}
                    </div>
                    <div className="notificationContent">
                      <p className="notificationTitle" style={{ fontSize: '11px', fontWeight: 600 }}>{notif.title}</p>
                      <p className="notificationDesc" style={{ fontSize: '9px', color: '#666' }}>{notif.description}</p>
                    </div>
                    <span className="notificationTime" style={{ fontSize: '9px', color: '#999' }}>{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Component */}
            <div className="calendarCard" style={{ marginTop: '0' }}>
              <div className="calendarGradient" style={{ padding: '8px', borderRadius: '16px' }}>
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

            {/* Upcoming Events */}
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '15px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #f0f2f5'
            }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ 
                  fontSize: '13px', 
                  margin: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: '#1e293b',
                  fontWeight: 600
                }}>
                  <IoCalendarNumberOutline size={16} color="#3d67ee" />
                  <span>Upcoming Events</span>
                  <span style={{ 
                    fontSize: '10px', 
                    backgroundColor: '#ebf4ff', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    color: '#3d67ee'
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
                      <div key={event.id} style={{ 
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

      {/* Notifications Modal */}
      <NotificationsAllModal 
        ref={notificationsModalRef}
        notifications={dashboardNotifications}
        onNotificationClick={(notification) => {
          if (notification.link) navigate(notification.link);
        }}
      />
    </div>
  );
};

export default AdminDashboard;
