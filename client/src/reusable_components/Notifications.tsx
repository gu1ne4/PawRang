import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  IoCloseOutline, 
  IoNotificationsOutline, 
  IoCheckmarkCircleOutline, 
  IoWarningOutline, 
  IoAlertCircleOutline,
  IoCheckmarkDoneOutline,
  IoEyeOutline
} from 'react-icons/io5';
import { MdNotificationsNone } from "react-icons/md";
import NotificationsAllModal, { type Notification, type NotificationsModalRef } from './NotificationsAllModal';
import './NotifStyles.css';

// Re-export Notification interface for other components
export type { Notification };

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';
const NOTIFICATION_SOUND_URL = '/audio/notification-chime.wav';
const NOTIFICATION_CACHE_TTL_MS = 30 * 1000;
const NOTIFICATION_REFRESH_MS = 30 * 1000;

let notificationCache:
  | { adminUserId: string; expiresAt: number; notifications: Notification[] }
  | null = null;
let notificationRequest: Promise<Notification[]> | null = null;

interface NotificationsProps {
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onViewAll?: () => void;
  buttonClassName?: string;
  iconClassName?: string;
}

const Notifications: React.FC<NotificationsProps> = ({
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewAll,
  buttonClassName = '',
  iconClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Ref for the modal component
  const modalRef = useRef<NotificationsModalRef>(null);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedNotificationsRef = useRef(false);

  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const getAdminUserId = useCallback(() => {
    try {
      const rawSession = localStorage.getItem('userSession');
      if (!rawSession) return '';
      const session = JSON.parse(rawSession);
      return String(session?.id || session?.pk || '').trim();
    } catch {
      return '';
    }
  }, []);

  const normalizeFetchedNotification = useCallback((record: any): Notification => ({
    id: String(record.notificationId || record.id || ''),
    title: String(record.title || ''),
    message: String(record.message || ''),
    type: (record.type || 'info') as Notification['type'],
    timestamp: new Date(record.timestamp || Date.now()),
    read: Boolean(record.read),
    link: record.link || undefined,
  }), []);

  const playGeneratedNotificationTone = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      gain.connect(audioContext.destination);

      const firstTone = audioContext.createOscillator();
      firstTone.type = 'sine';
      firstTone.frequency.setValueAtTime(740, audioContext.currentTime);
      firstTone.connect(gain);
      firstTone.start(audioContext.currentTime);
      firstTone.stop(audioContext.currentTime + 0.16);

      const secondTone = audioContext.createOscillator();
      secondTone.type = 'sine';
      secondTone.frequency.setValueAtTime(980, audioContext.currentTime + 0.13);
      secondTone.connect(gain);
      secondTone.start(audioContext.currentTime + 0.13);
      secondTone.stop(audioContext.currentTime + 0.42);

      window.setTimeout(() => {
        audioContext.close().catch(() => undefined);
      }, 700);
    } catch (error) {
      console.debug('Notification sound skipped:', error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.55;
      audio.play().catch(() => {
        playGeneratedNotificationTone();
      });
    } catch {
      playGeneratedNotificationTone();
    }
  }, [playGeneratedNotificationTone]);

  const updateKnownNotificationsAndSound = useCallback((nextNotifications: Notification[]) => {
    const previousIds = knownNotificationIdsRef.current;
    const hasLoaded = hasLoadedNotificationsRef.current;
    const hasNewUnread = nextNotifications.some(notification =>
      notification.id &&
      !notification.read &&
      !previousIds.has(notification.id)
    );

    knownNotificationIdsRef.current = new Set(nextNotifications.map(notification => notification.id).filter(Boolean));
    hasLoadedNotificationsRef.current = true;

    if (hasLoaded && hasNewUnread) {
      playNotificationSound();
    }
  }, [playNotificationSound]);

  const fetchNotifications = useCallback(async (forceRefresh: boolean = false) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) {
      setNotifications([]);
      return;
    }

    if (
      !forceRefresh &&
      notificationCache &&
      notificationCache.adminUserId === adminUserId &&
      notificationCache.expiresAt > Date.now()
    ) {
      updateKnownNotificationsAndSound(notificationCache.notifications);
      setNotifications(notificationCache.notifications);
      return;
    }

    try {
      if (!notificationRequest || forceRefresh) {
        notificationRequest = (async () => {
          const response = await fetch(
            `${API_URL}/api/admin-notifications?admin_user_id=${encodeURIComponent(adminUserId)}&module=inventory&limit=50`
          );
          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch notifications.');
          }

          return Array.isArray(result.notifications)
            ? result.notifications.map(normalizeFetchedNotification)
            : [];
        })().finally(() => {
          notificationRequest = null;
        });
      }

      const normalized = await notificationRequest;
      notificationCache = {
        adminUserId,
        expiresAt: Date.now() + NOTIFICATION_CACHE_TTL_MS,
        notifications: normalized,
      };
      updateKnownNotificationsAndSound(normalized);
      setNotifications(normalized);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      setNotifications([]);
    }
  }, [getAdminUserId, normalizeFetchedNotification, updateKnownNotificationsAndSound]);

  useEffect(() => {
    if (isOpen && anchorEl) {
      requestAnimationFrame(() => {
        const rect = anchorEl.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 5,
          right: window.innerWidth - rect.right
        });
      });
    }
  }, [isOpen, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) && 
          anchorEl && !anchorEl.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, anchorEl]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchNotifications(true);
    }, NOTIFICATION_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchNotifications]);

  const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(prev => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        fetchNotifications(true);
      }
      return nextIsOpen;
    });
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) return;

    setNotifications(prev =>
      prev.map(notif => {
        const updated = notif.id === id ? { ...notif, read: true } : notif;
        return updated;
      })
    );
    notificationCache = null;

    try {
      const response = await fetch(`${API_URL}/api/admin-notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark notification as read.');
      }
      if (onMarkAsRead) onMarkAsRead(id);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      fetchNotifications();
    }
  }, [fetchNotifications, getAdminUserId, onMarkAsRead]);

  const handleMarkAllAsRead = useCallback(async () => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) return;

    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    notificationCache = null;

    try {
      const response = await fetch(`${API_URL}/api/admin-notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, module: 'inventory' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark all notifications as read.');
      }
      if (onMarkAllAsRead) onMarkAllAsRead();
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      fetchNotifications();
    }
  }, [fetchNotifications, getAdminUserId, onMarkAllAsRead]);

  const handleViewAll = useCallback(() => {
    if (onViewAll) onViewAll();
    setIsOpen(false);
    // Open the modal via ref
    modalRef.current?.openModal();
  }, [onViewAll]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) onNotificationClick(notification);
    setIsOpen(false);
  }, [handleMarkAsRead, onNotificationClick]);

  const getIcon = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <IoCheckmarkCircleOutline size={18} className="notifIconSuccess" />;
      case 'warning':
        return <IoWarningOutline size={18} className="notifIconWarning" />;
      case 'error':
        return <IoAlertCircleOutline size={18} className="notifIconError" />;
      default:
        return <IoNotificationsOutline size={18} className="notifIconInfo" />;
    }
  }, []);

  const formatTime = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }, []);

  const displayedNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <>
      <div className="notifButtonWrapper">
        <button 
          className={`notifButton ${buttonClassName}`}
          onClick={handleButtonClick}
        >
          <MdNotificationsNone size={25} className={iconClassName} />
          {unreadCount > 0 && <span className="notifRedDot"></span>}
        </button>
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          className="notifPopup"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            right: `${position.right}px`,
            zIndex: 9999
          }}
        >
          <div className="notifHeader">
            <div className="notifHeaderLeft">
              <h3>Notifications</h3>
              {unreadCount > 0 && <span className="notifBadge">{unreadCount} new</span>}
            </div>
            <button className="notifCloseBtn" onClick={() => setIsOpen(false)}>
              <IoCloseOutline size={20} />
            </button>
          </div>

          <div className="notifActions">
            {unreadCount > 0 && (
              <button className="notifMarkAllBtn" onClick={handleMarkAllAsRead}>
                <IoCheckmarkDoneOutline size={16} />
                Mark all as read
              </button>
            )}
            <button className="notifViewAllBtn" onClick={handleViewAll}>
              <IoEyeOutline size={16} />
              View all
            </button>
          </div>

          <div className="notifContent">
            {notifications.length === 0 ? (
              <div className="notifEmpty">
                <IoNotificationsOutline size={40} className="notifEmptyIcon" />
                <p>No notifications</p>
              </div>
            ) : (
              displayedNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  getIcon={getIcon}
                  formatTime={formatTime}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>
        </div>
      )}

      <NotificationsAllModal
        ref={modalRef}
        notifications={notifications}
        onNotificationClick={onNotificationClick}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </>
  );
};

const NotificationItem = React.memo(({ 
  notification, 
  getIcon, 
  formatTime, 
  onClick 
}: {
  notification: Notification;
  getIcon: (type: Notification['type']) => React.ReactElement;
  formatTime: (date: Date) => string;
  onClick: (notification: Notification) => void;
}) => (
  <div
    className={`notifItem ${!notification.read ? 'notifUnread' : ''}`}
    onClick={() => onClick(notification)}
  >
    <div className="notifItemIcon">
      {getIcon(notification.type)}
    </div>
    <div className="notifItemContent">
      <div className="notifItemHeader">
        <span className="notifItemTitle">{notification.title}</span>
        <span className="notifItemTime">{formatTime(notification.timestamp)}</span>
      </div>
      <p className="notifItemMessage">{notification.message}</p>
    </div>
    {!notification.read && <div className="notifUnreadDot" />}
  </div>
));

NotificationItem.displayName = 'NotificationItem';

export default Notifications;
