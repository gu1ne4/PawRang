import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './AdminDashboardLayout.css'; 
import userImg from '../assets/userAvatar.jpg';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
import type { Notification as AppNotification, NotificationsModalRef } from '../reusable_components/NotificationsAllModal';
import API_URL from '../API';
import { apiService } from '../apiService';

// ========== INTERFACES ==========

interface Admin {
  id: number | string;
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

interface DashboardKpis {
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
}

interface SalesTrendPoint {
  day: string;
  actual: number | null;
  predicted: number | null;
  appointments: number | null;
}

interface AnalyticsOverview {
  kpis: DashboardKpis;
  salesTrend: SalesTrendPoint[];
}

interface DashboardTrendPoint {
  date: string;
  dateKey: string;
  walkIns: number;
  appointments: number;
  patients: number;
}

type DashboardMetricKey = 'walkIns' | 'appointments' | 'patients';

const fallbackUser: Admin = {
  id: 1,
  name: 'Admin',
  username: 'admin',
  role: 'Admin',
  image: userImg
};

const emptyAnalytics: AnalyticsOverview = {
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
};

const getSessionUser = (): any | null => {
  try {
    const rawSession = localStorage.getItem('userSession');
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    console.error('Dashboard session parse error:', error);
    return null;
  }
};

const normalizeCurrentUser = (session: any): Admin => {
  if (!session) return fallbackUser;

  const firstName = session.firstName || session.first_name || '';
  const lastName = session.lastName || session.last_name || '';
  const name = session.fullName || session.name || `${firstName} ${lastName}`.trim() || session.username || 'Admin';

  return {
    id: session.id || session.pk || session.employee_id || session.employeeId || session.account_id || fallbackUser.id,
    name,
    username: session.username || session.email || 'admin',
    role: session.role || 'Admin',
    image: session.userImage || session.employee_image || session.profileImage || userImg,
  };
};

const getAdminUserId = (session: any, currentUser?: Admin): string => {
  const id = session?.id || session?.pk || session?.employee_id || session?.employeeId || currentUser?.id || '';
  return String(id || '');
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mergeAnalyticsOverview = (payload: any): AnalyticsOverview => ({
  kpis: {
    totalRevenue: toNumber(payload?.kpis?.totalRevenue),
    totalRevenueChange: toNumber(payload?.kpis?.totalRevenueChange),
    totalTransactions: toNumber(payload?.kpis?.totalTransactions),
    totalTransactionsChange: toNumber(payload?.kpis?.totalTransactionsChange),
    averageTransaction: toNumber(payload?.kpis?.averageTransaction),
    averageTransactionChange: toNumber(payload?.kpis?.averageTransactionChange),
    completedAppointments: toNumber(payload?.kpis?.completedAppointments),
    completedAppointmentsChange: toNumber(payload?.kpis?.completedAppointmentsChange),
    predictedRevenue: toNumber(payload?.kpis?.predictedRevenue),
    predictedRevenueChange: toNumber(payload?.kpis?.predictedRevenueChange),
  },
  salesTrend: Array.isArray(payload?.salesTrend)
    ? payload.salesTrend.map((point: any) => ({
        day: String(point?.day || ''),
        actual: point?.actual === null || point?.actual === undefined ? null : toNumber(point.actual),
        predicted: point?.predicted === null || point?.predicted === undefined ? null : toNumber(point.predicted),
        appointments: point?.appointments === null || point?.appointments === undefined ? null : toNumber(point.appointments),
      }))
    : [],
});

const normalizeInventoryMovement = (log: any, index: number): InventoryMovement => {
  const rawType = String(log?.type || log?.transactionType || log?.transaction_type || 'OUT').toUpperCase();
  const timestamp = log?.createdAt || log?.created_at || log?.timestamp || [log?.date, log?.time].filter(Boolean).join(' ');

  return {
    id: Number(log?.id || log?.logId || log?.log_id || index + 1),
    itemName: String(log?.productName || log?.product_name || log?.itemName || log?.item_name || 'Inventory Item'),
    type: rawType === 'IN' ? 'IN' : 'OUT',
    quantity: toNumber(log?.quantity),
    user: String(log?.user || log?.processedBy || log?.processed_by || 'System'),
    timestamp: formatRelativeTimestamp(timestamp),
    category: String(log?.category || ''),
  };
};

const normalizeFetchedNotification = (record: any): AppNotification => {
  const type = String(record?.type || 'info');
  const safeType = ['info', 'success', 'warning', 'error'].includes(type) ? type as AppNotification['type'] : 'info';

  return {
    id: String(record?.notificationId || record?.notification_id || record?.id || ''),
    title: String(record?.title || 'Notification'),
    message: String(record?.message || record?.description || ''),
    type: safeType,
    timestamp: new Date(record?.timestamp || record?.created_at || Date.now()),
    read: Boolean(record?.read),
    link: record?.link || undefined,
  };
};

const formatRelativeTimestamp = (rawTimestamp: string): string => {
  const parsedDate = rawTimestamp ? new Date(rawTimestamp) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return 'Just now';

  const diffMs = Date.now() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

const parseDashboardDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const parsed = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDashboardDateKey = (value: unknown): string => {
  const parsed = parseDashboardDate(value);
  if (!parsed) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastSevenDayPoints = (): DashboardTrendPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      date: formatter.format(date),
      dateKey: getDashboardDateKey(date),
      walkIns: 0,
      appointments: 0,
      patients: 0,
    };
  });
};

const incrementDailyMetric = (
  points: DashboardTrendPoint[],
  dateLookup: Map<string, number>,
  rawDate: unknown,
  metric: DashboardMetricKey
) => {
  const dateKey = getDashboardDateKey(rawDate);
  const pointIndex = dateLookup.get(dateKey);
  if (pointIndex === undefined) return;
  points[pointIndex][metric] += 1;
};

const isWithinLastSevenDays = (value: unknown): boolean => {
  const parsed = parseDashboardDate(value);
  if (!parsed) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return parsed >= start && parsed <= today;
};

const getAppointmentDateValue = (record: any): string => (
  record?.date_only ||
  record?.appointment_date ||
  record?.dateDisplay ||
  record?.date_display ||
  record?.date ||
  record?.sort_date ||
  ''
);

const isValidBillingInvoice = (invoice: any): boolean => {
  const status = String(invoice?.status || '').toLowerCase();
  return status !== 'cancelled' && status !== 'refunded';
};

const isWalkInBillingInvoice = (invoice: any): boolean => {
  const invoiceType = String(invoice?.invoiceType || invoice?.invoice_type || '').toLowerCase();
  const sourceRecordType = String(invoice?.sourceRecordType || invoice?.source_record_type || '').toLowerCase();
  const sourceLabel = String(invoice?.sourceRecord || invoice?.source_record || invoice?.typeLabel || invoice?.type_label || '').toLowerCase();

  return (
    invoiceType.includes('walkin') ||
    invoiceType.includes('walk-in') ||
    sourceRecordType.includes('walkin') ||
    sourceRecordType.includes('walk-in') ||
    sourceLabel.includes('walk-in') ||
    sourceLabel.includes('walkin')
  );
};

const getNotificationMeta = (type: AppNotification['type']) => {
  switch (type) {
    case 'success':
      return { color: '#10b981', icon: <IoDocumentText size={12} color="#10b981" /> };
    case 'warning':
      return { color: '#f59e0b', icon: <IoWarningOutline size={12} color="#f59e0b" /> };
    case 'error':
      return { color: '#ef4444', icon: <IoWarningOutline size={12} color="#ef4444" /> };
    default:
      return { color: '#3d67ee', icon: <IoNotificationsOutline size={12} color="#3d67ee" /> };
  }
};

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
  const [viewportWidth, setViewportWidth] = useState<number>(() => window.innerWidth);
  const [currentUser, setCurrentUser] = useState<Admin>(fallbackUser);
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(emptyAnalytics);
  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [inventoryItemsCount, setInventoryItemsCount] = useState<number>(0);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [weeklyActivityData, setWeeklyActivityData] = useState<DashboardTrendPoint[]>([]);
  
  // Refs
  const notificationsModalRef = useRef<NotificationsModalRef>(null);

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
    return new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (): string => {
    return new Date().toLocaleTimeString('en-US', { 
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

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const session = getSessionUser();
    const normalizedUser = normalizeCurrentUser(session);
    const adminUserId = getAdminUserId(session, normalizedUser);
    setCurrentUser(normalizedUser);

    const fetchDashboardData = async () => {
      const withDashboardUser = (path: string, extraParams: Record<string, string | number> = {}) => {
        const params = new URLSearchParams();
        if (adminUserId) params.set('userId', String(adminUserId));
        Object.entries(extraParams).forEach(([key, value]) => params.set(key, String(value)));
        const query = params.toString();
        return `${API_URL}${path}${query ? `?${query}` : ''}`;
      };
      const [
        analyticsResult,
        patientsResult,
        inventoryItemsResult,
        inventoryLogsResult,
        billingInvoicesResult,
        appointmentsResult,
        appointmentHistoryResult,
        notificationsResult,
      ] = await Promise.allSettled([
        apiService.getAdminAnalyticsOverview(),
        fetch(`${API_URL}/patients`),
        fetch(withDashboardUser('/api/inventory/items')),
        fetch(withDashboardUser('/api/inventory/logs', { limit: 5 })),
        apiService.getBillingInvoices(adminUserId),
        apiService.getAppointmentsForTable(adminUserId),
        fetch(withDashboardUser('/api/appointments/history')),
        adminUserId
          ? fetch(`${API_URL}/api/admin-notifications?admin_user_id=${encodeURIComponent(adminUserId)}&module=inventory&limit=50`)
          : Promise.resolve(null),
      ]);
      let nextPatientsCount = 0;
      const nextWeeklyActivityData = getLastSevenDayPoints();
      const dateLookup = new Map(
        nextWeeklyActivityData.map((point, index) => [point.dateKey, index])
      );

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(mergeAnalyticsOverview(analyticsResult.value));
      } else {
        console.error('Dashboard analytics fetch error:', analyticsResult.reason);
      }

      if (patientsResult.status === 'fulfilled' && patientsResult.value.ok) {
        const patientsPayload = await patientsResult.value.json().catch(() => []);
        const patients = Array.isArray(patientsPayload)
          ? patientsPayload
          : Array.isArray(patientsPayload?.patients)
            ? patientsPayload.patients
            : [];
        nextPatientsCount = patients.length;
        setPatientsCount(nextPatientsCount);
      }

      if (inventoryItemsResult.status === 'fulfilled' && inventoryItemsResult.value.ok) {
        const inventoryPayload = await inventoryItemsResult.value.json().catch(() => ({}));
        const items = Array.isArray(inventoryPayload?.items)
          ? inventoryPayload.items
          : Array.isArray(inventoryPayload)
            ? inventoryPayload
            : [];
        setInventoryItemsCount(items.filter((item: any) => !item?.isArchived && !item?.is_archived).length);
      } else {
        console.error(
          'Dashboard inventory items fetch error:',
          inventoryItemsResult.status === 'rejected' ? inventoryItemsResult.reason : inventoryItemsResult.value.status
        );
      }

      if (inventoryLogsResult.status === 'fulfilled' && inventoryLogsResult.value.ok) {
        const logsPayload = await inventoryLogsResult.value.json().catch(() => ({}));
        const logs = Array.isArray(logsPayload?.logs)
          ? logsPayload.logs
          : Array.isArray(logsPayload)
            ? logsPayload
            : [];
        setInventoryMovements(logs.slice(0, 5).map(normalizeInventoryMovement));
      } else {
        console.error(
          'Dashboard inventory logs fetch error:',
          inventoryLogsResult.status === 'rejected' ? inventoryLogsResult.reason : inventoryLogsResult.value.status
        );
      }

      if (billingInvoicesResult.status === 'fulfilled') {
        const invoices = Array.isArray(billingInvoicesResult.value) ? billingInvoicesResult.value : [];
        invoices.forEach((invoice: any) => {
          if (
            isWalkInBillingInvoice(invoice) &&
            isValidBillingInvoice(invoice)
          ) {
            incrementDailyMetric(
              nextWeeklyActivityData,
              dateLookup,
              invoice?.date || invoice?.invoiceDate || invoice?.invoice_date,
              'walkIns'
            );
          }
        });
      } else {
        console.error('Dashboard billing invoices fetch error:', billingInvoicesResult.reason);
      }

      const activeAppointments = appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value?.appointments)
        ? appointmentsResult.value.appointments
        : [];
      const appointmentHistoryPayload = appointmentHistoryResult.status === 'fulfilled' && appointmentHistoryResult.value.ok
        ? await appointmentHistoryResult.value.json().catch(() => ({}))
        : {};
      const historyAppointments = Array.isArray(appointmentHistoryPayload?.appointments)
        ? appointmentHistoryPayload.appointments
        : [];
      const allAppointments = [...activeAppointments, ...historyAppointments];
      allAppointments.forEach((record: any) => {
        if (String(record?.recordType || record?.record_type || 'appointment').toLowerCase() === 'appointment') {
          incrementDailyMetric(
            nextWeeklyActivityData,
            dateLookup,
            getAppointmentDateValue(record),
            'appointments'
          );
        }
      });

      nextWeeklyActivityData.forEach((point) => {
        point.patients = point.walkIns + point.appointments;
      });
      setWeeklyActivityData(nextWeeklyActivityData);

      if (notificationsResult.status === 'fulfilled' && notificationsResult.value) {
        const notificationResponse = notificationsResult.value;
        if (notificationResponse.ok) {
          const notificationPayload = await notificationResponse.json().catch(() => ({}));
          const fetchedNotifications = Array.isArray(notificationPayload?.notifications)
            ? notificationPayload.notifications
            : [];
          setNotifications(fetchedNotifications.map(normalizeFetchedNotification));
        }
      }
    };

    fetchDashboardData();
  }, []);

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(notification => (
      notification.id === id ? { ...notification, read: true } : notification
    )));

    const adminUserId = getAdminUserId(getSessionUser(), currentUser);
    if (!adminUserId) return;

    try {
      await fetch(`${API_URL}/api/admin-notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId }),
      });
    } catch (error) {
      console.error('Dashboard mark notification read error:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));

    const adminUserId = getAdminUserId(getSessionUser(), currentUser);
    if (!adminUserId) return;

    try {
      await fetch(`${API_URL}/api/admin-notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, module: 'inventory' }),
      });
    } catch (error) {
      console.error('Dashboard mark all notifications read error:', error);
    }
  };

  const isMobile = viewportWidth <= 900;
  const isCompact = viewportWidth <= 640;
  const displayedNotifications = notifications.slice(0, 4);

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

  return (
    <div className="biContainer" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Navbar currentUser={currentUser} onLogout={handleLogout} confirmLogout />

      {/* Main Content */}
      <div className="bodyContainer" style={{ paddingRight: isMobile ? '0' : '10px' }}>
        <div className="doctorTableContainer" style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '20px', overflow: 'visible' }}>
          {/* Left Column */}
          <div className="leftContainer" style={{ paddingRight: isMobile ? '0' : '15px', paddingLeft: isMobile ? '0' : '10px', overflow: 'visible' }}>
            {/* Doctor Profile Card */}
            <div className="profileCard dashboardProfileCard" style={{ marginBottom: '20px', minHeight: '140px', backgroundColor: '#f4f4f4'}}>
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
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white' }}
                />
              </div>
            </div>

            {/* Monthly Reports - KPI Cards */}
            <div className="dashboardSectionShell" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', marginBottom: '16px' }}>
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
                gridTemplateColumns: isCompact ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                gap: '12px'
              }}>
                <KpiCard 
                  title="Total Patients"
                  value={patientsCount}
                  icon={<IoPeople size={18} color="#8b5cf6" />}
                  iconBgColor="#8b5cf613"
                  iconColor="#8b5cf6"
                  trendLabel="from last month"
                />
                <KpiCard 
                  title="Appointments"
                  value={analytics.kpis.completedAppointments}
                  change={analytics.kpis.completedAppointmentsChange}
                  icon={<IoCalendarClearOutline size={18} color="#14b8a6" />}
                  iconBgColor="#14b8a613"
                  iconColor="#14b8a6"
                  trendLabel="from last month"
                />
                <KpiCard 
                  title="Inventory Items"
                  value={inventoryItemsCount}
                  icon={<IoLayersOutline size={18} color="#f97316" />}
                  iconBgColor="#f9731613"
                  iconColor="#f97316"
                  trendLabel="items low stock"
                />
                <KpiCard 
                  title="Revenue"
                  value={Math.round(analytics.kpis.totalRevenue)}
                  prefix="₱"
                  change={analytics.kpis.totalRevenueChange}
                  icon={<IoPawOutline size={18} color="#ec4899" />}
                  iconBgColor="#ec489913"
                  iconColor="#ec4899"
                  trendLabel="from last month"
                />
              </div>
            </div>

            <div className="dashboardSectionShell dashboardActionShell">
              <h3 className="sectionTitle" style={{ fontSize: '15px', marginBottom: '2px', marginTop: '0' }}>Quick Actions</h3>
              <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '12px' }}>Frequently used tasks</p>
              
              <div className="dashboardActionGrid" style={{ 
                gridTemplateColumns: isCompact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(100px, 1fr))'
              }}>
                {quickActions.map((action, index) => (
                  <button 
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className="dashboardActionCard"
                    style={{ 
                      borderColor: action.borderColor,
                      backgroundColor: action.bgColor
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
            </div>

            {/* Weekly Activity Section */}
            <div className="dashboardSectionShell" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', marginBottom: '16px' }}>
                <div>
                  <h3 className="sectionTitle" style={{ fontSize: '15px', marginTop: '0', marginBottom: '2px' }}>Weekly Activity</h3>
                  <p className="sectionSubtitle" style={{ fontSize: '11px', marginBottom: '0' }}>Total walk-ins, appointments, and patients</p>
                </div>
              </div>
            

              {/* Chart */}
              <div className="dashboardChartCard">
                <ResponsiveContainer width="100%" height={isCompact ? 220 : 250}>
                  <ComposedChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="walkIns" name="Walk-ins" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#3d67ee" strokeWidth={2.5} dot={{ r: 4, fill: '#3d67ee' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="patients" name="Patients" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Movement Logs */}
            <div className="appointmentsCard dashboardSoftCard" style={{ padding: '15px', marginTop: isMobile ? '18px' : '35px', marginBottom: '15px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' }}>
              <div className="cardHeader" style={{ marginBottom: '8px' }}>
                <h3 className="cardTitle" style={{ fontSize: '14px', margin: 0 }}>Inventory Movement Logs</h3>
                <button className="viewAllBtn" style={{ fontSize: '11px' }} onClick={() => navigate('/inventory-logs')}>View All</button>
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
                {inventoryMovements.length > 0 ? inventoryMovements.slice(0, 5).map(movement => (
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
                )) : (
                  <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                    No inventory movement logs yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="rightContainer" style={{ gap: '12px', flex: isMobile ? '1' : '0.7', overflowY: 'visible', paddingLeft: isMobile ? '0' : '2px' }}>
            {/* Notifications Section */}
            <div className="notificationsCard dashboardSoftCard" style={{ padding: '12px', height: 'auto', maxHeight: isMobile ? 'none' : '320px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' }}>
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
                {displayedNotifications.length > 0 ? displayedNotifications.map(notif => {
                  const meta = getNotificationMeta(notif.type);
                  return (
                    <div key={notif.id} className="notificationItem" style={{ padding: '8px', gap: '8px', backgroundColor: notif.read ? '#f8fafc' : '#eff6ff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div className="notificationIcon" style={{ padding: '5px', backgroundColor: `${meta.color}20`, borderRadius: '8px' }}>
                        {meta.icon}
                      </div>
                      <div className="notificationContent">
                        <p className="notificationTitle" style={{ fontSize: '11px', fontWeight: 600 }}>{notif.title}</p>
                        <p className="notificationDesc" style={{ fontSize: '9px', color: '#666' }}>{notif.message}</p>
                      </div>
                      <span className="notificationTime" style={{ fontSize: '9px', color: '#999' }}>{formatRelativeTimestamp(notif.timestamp.toISOString())}</span>
                    </div>
                  );
                }) : (
                  <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                    No notifications yet
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Component */}
            <div className="calendarCard dashboardCalendarCard" style={{ marginTop: '0', width: '100%' }}>
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
            <div className="dashboardSoftCard" style={{ 
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
              <div className="upcomingEventsList" style={{ maxHeight: isMobile ? 'none' : '350px', overflowY: 'auto' }}>
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
        notifications={notifications}
        onNotificationClick={(notification) => {
          if (notification.link) navigate(notification.link);
        }}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      />
    </div>
  );
};

export default AdminDashboard;
