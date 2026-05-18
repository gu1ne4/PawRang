import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import API_URL from '../API';
import { apiService } from '../apiService';
import Navbar from '../reusable_components/NavBar';
import NotificationsAllModal from '../reusable_components/NotificationsAllModal';
import type { Notification as AppNotification, NotificationsModalRef } from '../reusable_components/NotificationsAllModal';
import userImg from '../assets/userAvatar.jpg';
import {
  IoAlertCircleOutline,
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCreateOutline,
  IoDocumentTextOutline,
  IoLayersOutline,
  IoMedkitOutline,
  IoNotificationsOutline,
  IoPawOutline,
  IoSparkles,
  IoTimeOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import '../admin_pages/AdminDashboardLayout.css';
import './DoctorPortal.css';

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  employee_id?: string | number;
  employeeId?: string | number;
  account_id?: string | number;
  username?: string;
  fullName?: string;
  name?: string;
  role?: string;
  userImage?: string;
  userimage?: string;
  user_image?: string;
  profileImage?: string;
  employee_image?: string;
  image?: string;
}

interface AppointmentItem {
  id?: string | number;
  dbId?: string | number;
  ownerName?: string;
  petName?: string;
  doctor?: string;
  assignedDoctor?: string;
  veterinarian?: string;
  appointment_date?: string;
  appointmentDate?: string;
  date_only?: string;
  date_time?: string;
  appointment_time?: string;
  appointmentTime?: string;
  service?: string;
  status?: string;
}

interface DoctorKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  helper: string;
}

const getCurrentUser = (): CurrentUser | null => {
  try {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const getCurrentUserId = (user: CurrentUser | null): string =>
  String(user?.id || user?.pk || user?.employee_id || user?.employeeId || user?.account_id || '').trim();

const getDisplayName = (user: CurrentUser | null): string =>
  user?.fullName || user?.name || user?.username || 'Veterinarian';

const getUserImage = (user: CurrentUser | null): string =>
  user?.profileImage ||
  user?.employee_image ||
  user?.image ||
  user?.userImage ||
  user?.userimage ||
  user?.user_image ||
  userImg;

const formatDate = (): string => new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatTime = (): string => new Date().toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
});

const getRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const normalizeFetchedNotification = (record: unknown): AppNotification => {
  const item = record && typeof record === 'object' ? record as Record<string, unknown> : {};
  const type = String(getRecordValue(item, ['type']) || 'info');
  const safeType = ['info', 'success', 'warning', 'error'].includes(type) ? type as AppNotification['type'] : 'info';
  const timestamp = getRecordValue(item, ['timestamp', 'created_at']);
  const moduleValue = getRecordValue(item, ['module']);
  const eventType = getRecordValue(item, ['eventType', 'event_type']);
  const entityType = getRecordValue(item, ['entityType', 'entity_type']);
  const entityId = getRecordValue(item, ['entityId', 'entity_id']);
  const metadata = getRecordValue(item, ['metadata']);

  return {
    id: String(getRecordValue(item, ['notificationId', 'notification_id', 'id']) || ''),
    title: String(getRecordValue(item, ['title']) || 'Notification'),
    message: String(getRecordValue(item, ['message', 'description']) || ''),
    type: safeType,
    timestamp: new Date(String(timestamp || Date.now())),
    read: Boolean(getRecordValue(item, ['read'])),
    link: typeof getRecordValue(item, ['link']) === 'string' ? String(getRecordValue(item, ['link'])) : undefined,
    module: moduleValue ? String(moduleValue) : undefined,
    eventType: eventType ? String(eventType) : undefined,
    entityType: entityType ? String(entityType) : undefined,
    entityId: entityId as string | number | null | undefined,
    metadata: metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : undefined,
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

const getDoctorNotificationTarget = (target: string): string | null => {
  const normalizedTarget = target.trim();
  if (!normalizedTarget || /^https?:\/\//i.test(normalizedTarget)) return null;

  if (normalizedTarget === '/patient-records') return '/doctor/medical-records';
  if (normalizedTarget === '/admin/schedule' || normalizedTarget === '/admin/history' || normalizedTarget === '/schedule') return '/doctor/appointments';
  if (normalizedTarget === '/inventory') return '/doctor/inventory';
  if (normalizedTarget === '/inventory-logs') return '/doctor/inventory-logs';
  if (normalizedTarget === '/inventory-archive') return '/doctor/inventory';
  if (normalizedTarget.startsWith('/doctor/')) return normalizedTarget;

  return null;
};

const isDoctorAccessibleNotification = (notification: AppNotification): boolean => {
  const moduleKey = normalize(notification.module || 'system');
  const allowedModules = new Set(['system', 'appointments', 'appointment', 'emr', 'medical-records', 'medical_records', 'inventory']);
  if (moduleKey && !allowedModules.has(moduleKey)) return false;

  const link = typeof notification.link === 'string' ? notification.link.trim() : '';
  return !link || getDoctorNotificationTarget(link) !== null;
};

const getNotificationMeta = (type: AppNotification['type']) => {
  switch (type) {
    case 'success':
      return { color: '#10b981', icon: <IoCheckmarkCircleOutline size={12} color="#10b981" /> };
    case 'warning':
      return { color: '#f59e0b', icon: <IoWarningOutline size={12} color="#f59e0b" /> };
    case 'error':
      return { color: '#ef4444', icon: <IoAlertCircleOutline size={12} color="#ef4444" /> };
    default:
      return { color: '#3d67ee', icon: <IoNotificationsOutline size={12} color="#3d67ee" /> };
  }
};

const matchesDoctor = (appointment: AppointmentItem, user: CurrentUser | null) => {
  if (!user) return true;

  const doctorCandidates = [appointment.doctor, appointment.assignedDoctor, appointment.veterinarian]
    .map(normalize)
    .filter(Boolean);
  const userCandidates = [user.fullName, user.username].map(normalize).filter(Boolean);

  if (doctorCandidates.length === 0) return true;
  return userCandidates.some((candidate) => doctorCandidates.some((doctor) => doctor.includes(candidate) || candidate.includes(doctor)));
};

const DoctorKpiCard: React.FC<DoctorKpiCardProps> = ({ title, value, icon, iconBgColor, helper }) => (
  <div className="doctorDashboardKpiCard">
    <div className="doctorDashboardKpiHeader">
      <span>{title}</span>
      <div className="doctorDashboardKpiIcon" style={{ backgroundColor: iconBgColor }}>
        {icon}
      </div>
    </div>
    <div className="doctorDashboardKpiValue">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    <div className="doctorDashboardKpiHelper">{helper}</div>
  </div>
);

const DoctorHome: React.FC = () => {
  const navigate = useNavigate();
  const notificationsModalRef = useRef<NotificationsModalRef>(null);
  const [currentUser] = useState<CurrentUser | null>(() => getCurrentUser());
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const response = await apiService.getAppointmentsForTable();
        const items = response?.appointments || response || [];
        setAppointments(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error('Failed to load doctor overview appointments:', error);
      }
    };

    loadAppointments();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      const userId = getCurrentUserId(currentUser);
      if (!userId) {
        setNotifications([]);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/admin-notifications?admin_user_id=${encodeURIComponent(userId)}&limit=50`);
        if (!response.ok) throw new Error('Unable to load notifications');
        const payload = await response.json().catch(() => ({}));
        const items = Array.isArray(payload?.notifications) ? payload.notifications : [];
        setNotifications(items.map(normalizeFetchedNotification));
      } catch (error) {
        console.error('Failed to load doctor dashboard notifications:', error);
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scopedAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => matchesDoctor(appointment, currentUser));
    return filtered.length > 0 ? filtered : appointments;
  }, [appointments, currentUser]);

  const upcomingAppointments = scopedAppointments;
  const doctorNotifications = useMemo(
    () => notifications.filter(isDoctorAccessibleNotification),
    [notifications]
  );
  const displayedNotifications = doctorNotifications.slice(0, 4);
  const pendingCount = scopedAppointments.filter((item) => normalize(item.status) === 'pending').length;
  const handledCount = scopedAppointments.filter((item) => {
    const status = normalize(item.status);
    return status === 'confirmed' || status === 'accepted' || status === 'completed';
  }).length;
  const completedCount = scopedAppointments.filter((item) => normalize(item.status) === 'completed').length;
  const isMobile = viewportWidth <= 900;
  const isCompact = viewportWidth <= 640;

  const quickActions = [
    {
      icon: IoCalendarOutline,
      label: 'Appointments',
      iconColor: '#3566ee',
      bgColor: '#3566ee13',
      borderColor: '#3566ee',
      hoverBg: '#3566ee25',
      action: () => navigate('/doctor/appointments'),
    },
    {
      icon: IoDocumentTextOutline,
      label: 'Medical Records',
      iconColor: '#f12ba5',
      bgColor: '#f12ba513',
      borderColor: '#f12ba5',
      hoverBg: '#f12ba525',
      action: () => navigate('/doctor/medical-records'),
    },
    {
      icon: IoLayersOutline,
      label: 'Inventory',
      iconColor: '#f97316',
      bgColor: '#f9731613',
      borderColor: '#f97316',
      hoverBg: '#f9731625',
      action: () => navigate('/doctor/inventory'),
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const handleNotificationClick = (notification: AppNotification) => {
    const target = notification.link ? getDoctorNotificationTarget(notification.link) : null;
    if (target) navigate(target);
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(notification => (
      notification.id === id ? { ...notification, read: true } : notification
    )));

    const userId = getCurrentUserId(currentUser);
    if (!userId) return;

    try {
      await fetch(`${API_URL}/api/admin-notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId }),
      });
    } catch (error) {
      console.error('Doctor dashboard mark notification read error:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const notificationIds = new Set(doctorNotifications.map(notification => notification.id));
    setNotifications(prev => prev.map(notification => (
      notificationIds.has(notification.id) ? { ...notification, read: true } : notification
    )));

    const userId = getCurrentUserId(currentUser);
    if (!userId) return;

    try {
      await fetch(`${API_URL}/api/admin-notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId }),
      });
    } catch (error) {
      console.error('Doctor dashboard mark all notifications read error:', error);
    }
  };

  const handleDeleteNotifications = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;

    const previousNotifications = notifications;
    setNotifications(prev => prev.filter(notification => !uniqueIds.includes(notification.id)));

    const userId = getCurrentUserId(currentUser);
    if (!userId) return;

    try {
      await fetch(`${API_URL}/api/admin-notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId, notificationIds: uniqueIds }),
      });
    } catch (error) {
      console.error('Doctor dashboard delete notifications error:', error);
      setNotifications(previousNotifications);
    }
  };

  return (
    <div className="biContainer doctorDashboardShell">
      <Navbar currentUser={currentUser} onLogout={handleLogout} confirmLogout />
      <main className="bodyContainer doctorDashboardBody">
        <div className="doctorTableContainer doctorDashboardLayout" style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '20px' }}>
          <div className="leftContainer doctorDashboardLeft">
            <section className="profileCard dashboardProfileCard doctorDashboardProfile">
              <div className="profileHeader doctorDashboardProfileHeader">
                <div className="profileInfo">
                  <div className="profileNameSection doctorDashboardProfileName">
                    <h2 className="doctorName">{getDisplayName(currentUser)}</h2>
                    <p className="doctorUsername">@{currentUser?.username || 'doctor'}</p>
                    <p className="doctorRole">{currentUser?.role || 'Veterinarian'}</p>
                  </div>
                  <div className="profileDateTime">
                    <div className="profileGlassContainer">
                      <span className="dateTimeText">{formatDate()} - {formatTime()}</span>
                    </div>
                    <button className="editProfileBtn" type="button" aria-label="Profile">
                      <IoCreateOutline size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="profileAvatar doctorDashboardAvatar">
                <img src={getUserImage(currentUser)} alt={getDisplayName(currentUser)} className="doctorAvatar" />
              </div>
            </section>

            <section className="dashboardSectionShell doctorDashboardSection">
              <div className="doctorDashboardSectionHeader">
                <div>
                  <h3 className="sectionTitle">Clinical Overview</h3>
                  <p className="sectionSubtitle">Doctor workspace activity and case workload</p>
                </div>
                <div className="doctorDashboardLivePill">
                  <IoSparkles size={12} />
                  <span>Doctor Dashboard</span>
                </div>
              </div>
              <div className="doctorDashboardKpiGrid" style={{ gridTemplateColumns: isCompact ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
                <DoctorKpiCard
                  title="Appointments"
                  value={scopedAppointments.length}
                  icon={<IoCalendarClearOutline size={18} color="#14b8a6" />}
                  iconBgColor="#14b8a613"
                  helper="Visible in your doctor schedule"
                />
                <DoctorKpiCard
                  title="Pending Cases"
                  value={pendingCount}
                  icon={<IoTimeOutline size={18} color="#f59e0b" />}
                  iconBgColor="#f59e0b13"
                  helper="Awaiting confirmation or review"
                />
                <DoctorKpiCard
                  title="Handled Cases"
                  value={handledCount}
                  icon={<IoMedkitOutline size={18} color="#8b5cf6" />}
                  iconBgColor="#8b5cf613"
                  helper="Confirmed, accepted, or completed"
                />
                <DoctorKpiCard
                  title="Completed"
                  value={completedCount}
                  icon={<IoPawOutline size={18} color="#ec4899" />}
                  iconBgColor="#ec489913"
                  helper="Finished cases in the current feed"
                />
              </div>
            </section>

            <section className="dashboardSectionShell dashboardActionShell doctorDashboardSection doctorDashboardQuickActions">
              <h3 className="sectionTitle">Quick Actions</h3>
              <p className="sectionSubtitle">Doctor-accessible modules only</p>
              <div className="dashboardActionGrid doctorDashboardActionGrid">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="dashboardActionCard"
                    style={{
                      borderColor: action.borderColor,
                      backgroundColor: action.bgColor,
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
                    <span style={{ color: action.iconColor }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="appointmentsCard dashboardSoftCard doctorDashboardCases">
              <div className="cardHeader">
                <h3 className="cardTitle">Upcoming Cases</h3>
                <button className="viewAllBtn" type="button" onClick={() => navigate('/doctor/appointments')}>View All</button>
              </div>
              <p className="appointmentTotal">{upcomingAppointments.length} upcoming case{upcomingAppointments.length === 1 ? '' : 's'} in scope</p>
              <div className="doctorList">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment, index) => (
                    <div className="doctorListItem doctorDashboardCaseRow" key={`${appointment.dbId || appointment.id || 'appointment'}-${index}`}>
                      <div className="doctorListPrimary">
                        <div className="doctorListTitle">{appointment.petName || 'Unnamed Pet'} - {appointment.ownerName || 'Unknown Owner'}</div>
                        <div className="doctorListMeta">
                          {appointment.date_only || appointment.appointment_date || appointment.appointmentDate || appointment.date_time || 'Date TBD'}
                          {' - '}
                          {appointment.appointment_time || appointment.appointmentTime || appointment.service || 'General appointment'}
                        </div>
                      </div>
                      <span className={`doctorStatusPill ${normalize(appointment.status) || 'pending'}`}>
                        {appointment.status || 'Pending'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="doctorEmptyState">No appointments are available yet for this doctor workspace.</div>
                )}
              </div>
            </section>
          </div>

          <aside className="rightContainer doctorDashboardRight">
            <section className="notificationsCard dashboardSoftCard doctorDashboardNotifications">
              <div className="notificationsHeader doctorDashboardNotificationsHeader">
                <div className="notificationsTitle doctorDashboardNotificationsTitle">
                  <IoNotificationsOutline size={14} />
                  <h3>Notifications</h3>
                </div>
                <button
                  className="viewAllBtn"
                  type="button"
                  onClick={() => notificationsModalRef.current?.openModal()}
                >
                  View All
                </button>
              </div>
              <div className="notificationsList doctorDashboardNotificationsList">
                {displayedNotifications.length > 0 ? displayedNotifications.map((notification) => {
                  const meta = getNotificationMeta(notification.type);
                  return (
                    <div key={notification.id} className={`notificationItem doctorDashboardNotificationItem ${notification.read ? '' : 'unread'}`}>
                      <div className="notificationIcon doctorDashboardNotificationIcon" style={{ backgroundColor: `${meta.color}20` }}>
                        {meta.icon}
                      </div>
                      <div className="notificationContent">
                        <p className="notificationTitle">{notification.title}</p>
                        <p className="notificationDesc">{notification.message}</p>
                      </div>
                      <span className="notificationTime">{formatRelativeTimestamp(notification.timestamp.toISOString())}</span>
                    </div>
                  );
                }) : (
                  <div className="doctorDashboardNotificationEmpty">No notifications yet</div>
                )}
              </div>
            </section>

            <section className="calendarCard dashboardCalendarCard doctorDashboardCalendar">
              <div className="calendarGradient">
                <Calendar
                  onChange={(value) => setDate(value as Date)}
                  value={date}
                  tileClassName={({ date: tileDate, view }) =>
                    view === 'month' && tileDate.toDateString() === new Date().toDateString()
                      ? 'today'
                      : ''
                  }
                  formatShortWeekday={(_locale, weekdayDate) =>
                    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][weekdayDate.getDay()]
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      </main>
      <NotificationsAllModal
        ref={notificationsModalRef}
        notifications={doctorNotifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDelete={handleDeleteNotifications}
      />
    </div>
  );
};

export default DoctorHome;
