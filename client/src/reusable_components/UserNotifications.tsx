import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoHourglassOutline,
  IoNotificationsOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import API_URL from '../API';

type UserNotificationType = 'success' | 'warning' | 'info';

interface UserNotificationsProps {
  userId?: string | number;
  onOpenAppointments?: () => void;
  iconColor?: string;
}

interface UserNotification {
  id: string;
  type: UserNotificationType;
  title: string;
  message: string;
  timestamp: string;
}

const READ_KEY = 'userNotificationReadIds';

const getReadIds = (): string[] => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const saveReadIds = (ids: string[]) => {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(new Set(ids))));
};

const formatAppointmentDate = (date?: string, time?: string) => {
  const parts = [date, time].filter(Boolean);
  return parts.length ? parts.join(' at ') : 'Schedule unavailable';
};

const getNotificationTimeValue = (notification: UserNotification) => {
  const parsed = Date.parse(notification.timestamp || '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatRelativeNotificationTime = (timestamp: string) => {
  const parsed = Date.parse(timestamp || '');
  if (Number.isNaN(parsed)) return 'Just now';

  const diffMs = Date.now() - parsed;
  const tense = diffMs >= 0 ? 'ago' : 'from now';
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return 'Just now';
  if (absMs < hour) {
    const minutes = Math.max(1, Math.floor(absMs / minute));
    return `${minutes} min${minutes === 1 ? '' : 's'} ${tense}`;
  }
  if (absMs < day) {
    const hours = Math.floor(absMs / hour);
    return `${hours} hr${hours === 1 ? '' : 's'} ${tense}`;
  }

  const days = Math.floor(absMs / day);
  return `${days} day${days === 1 ? '' : 's'} ${tense}`;
};

const buildNotifications = (appointments: any[]): UserNotification[] => {
  const sorted = [...appointments].sort((a, b) => {
    const left = Date.parse(b.updated_at || b.created_at || b.appointment_date || '');
    const right = Date.parse(a.updated_at || a.created_at || a.appointment_date || '');
    return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
  });

  return sorted.slice(0, 8).map((appointment) => {
    const id = String(appointment.appointment_id || appointment.id || '');
    const status = String(appointment.status || 'pending').toLowerCase();
    const petName = appointment.pet_name || appointment.pet_profile?.pet_name || 'your pet';
    const service = appointment.appointment_type || appointment.service || 'Appointment';
    const schedule = formatAppointmentDate(appointment.date_display || appointment.appointment_date, appointment.time_display);

    if (status === 'confirmed') {
      return {
        id: `appointment-confirmed-${id}`,
        type: 'success',
        title: 'Appointment Confirmed',
        message: `${service} for ${petName} is confirmed for ${schedule}.`,
        timestamp: appointment.updated_at || appointment.created_at || appointment.appointment_date || '',
      };
    }

    if (status === 'cancelled') {
      return {
        id: `appointment-cancelled-${id}`,
        type: 'warning',
        title: 'Appointment Cancelled',
        message: `${service} for ${petName} was cancelled. You can book another schedule when ready.`,
        timestamp: appointment.updated_at || appointment.created_at || appointment.appointment_date || '',
      };
    }

    return {
      id: `appointment-pending-${id}`,
      type: 'info',
      title: 'Appointment Under Review',
      message: `${service} for ${petName} is waiting for clinic confirmation.`,
      timestamp: appointment.created_at || appointment.appointment_date || '',
    };
  });
};

const getNotificationIcon = (type: UserNotificationType) => {
  if (type === 'success') return <IoCheckmarkCircleOutline size={18} />;
  if (type === 'warning') return <IoWarningOutline size={18} />;
  return <IoHourglassOutline size={18} />;
};

const UserNotifications: React.FC<UserNotificationsProps> = ({ userId, onOpenAppointments, iconColor = 'currentColor' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => getReadIds());
  const popupRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !readIds.includes(notification.id)).length,
    [notifications, readIds],
  );

  const orderedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aUnread = !readIds.includes(a.id);
      const bUnread = !readIds.includes(b.id);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return getNotificationTimeValue(b) - getNotificationTimeValue(a);
    });
  }, [notifications, readIds]);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/appointments/user/${encodeURIComponent(String(userId))}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to load user notifications');
      setNotifications(buildNotifications(Array.isArray(payload.appointments) ? payload.appointments : []));
    } catch (error) {
      console.error('User notifications error:', error);
      setNotifications([]);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllRead = () => {
    const nextReadIds = [...readIds, ...notifications.map(notification => notification.id)];
    setReadIds(nextReadIds);
    saveReadIds(nextReadIds);
  };

  const handleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) void loadNotifications();
  };

  return (
    <div className="client-notification-shell" ref={popupRef}>
      <button type="button" className="icon-button client-notification-button" onClick={handleOpen} aria-label="Open notifications">
        <IoNotificationsOutline size={21} color={iconColor} />
        {unreadCount > 0 && <span className="client-notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="client-notification-popover">
          <div className="client-notification-header">
            <div>
              <span className="client-notification-kicker">User updates</span>
              <h3>Notifications</h3>
            </div>
            <button type="button" className="client-notification-close" onClick={() => setIsOpen(false)} aria-label="Close notifications">
              <IoCloseOutline size={20} />
            </button>
          </div>

          <div className="client-notification-actions">
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0}>Mark all read</button>
            <button type="button" onClick={onOpenAppointments}>View appointments</button>
          </div>

          <div className="client-notification-list">
            {orderedNotifications.length === 0 ? (
              <div className="client-notification-empty">
                <IoCalendarOutline size={34} />
                <p>No appointment notifications yet.</p>
              </div>
            ) : orderedNotifications.map(notification => {
              const unread = !readIds.includes(notification.id);
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`client-notification-item ${notification.type} ${unread ? 'unread' : ''}`}
                  onClick={() => {
                    const nextReadIds = [...readIds, notification.id];
                    setReadIds(nextReadIds);
                    saveReadIds(nextReadIds);
                    onOpenAppointments?.();
                  }}
                >
                  <span className="client-notification-icon">{getNotificationIcon(notification.type)}</span>
                  <span className="client-notification-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small className="client-notification-time">{formatRelativeNotificationTime(notification.timestamp)}</small>
                  </span>
                  {unread && <span className="client-notification-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserNotifications;
