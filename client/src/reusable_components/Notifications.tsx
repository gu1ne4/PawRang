// reusable_components/Notifications.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import './NotifStyles.css';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  link?: string;
}

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
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Low Stock Alert',
      message: 'Premium Dog Food Adult 5kg is running low (12 units left)',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      link: '/inventory'
    },
    {
      id: '2',
      title: 'Expiration Alert',
      message: 'Gourmet Cat Food Fish Flavor 2kg expires in 5 days',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
      link: '/inventory'
    },
    {
      id: '3',
      title: 'Product Added',
      message: 'New product "Orthopedic Dog Bed" has been added to inventory',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      link: '/inventory'
    },
    {
      id: '4',
      title: 'System Update',
      message: 'System maintenance scheduled for tomorrow at 2:00 AM',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      read: true,
    }
  ]);

  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isOpen && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right
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

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    if (onMarkAsRead) onMarkAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    if (onMarkAllAsRead) onMarkAllAsRead();
  };

  const handleViewAll = () => {
    if (onViewAll) onViewAll();
    setIsOpen(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) onNotificationClick(notification);
    if (notification.link) {
      // Handle navigation - this will be handled by the parent component
    }
    setIsOpen(false);
  };

  const getIcon = (type: Notification['type']) => {
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
  };

  const formatTime = (date: Date) => {
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
  };

  return (
    <>
      {/* Notification Button */}
      <div className="notifButtonWrapper">
        <button 
          className={`notifButton ${buttonClassName}`}
          onClick={handleButtonClick}
        >
          <MdNotificationsNone size={25} className={iconClassName} />
          {unreadCount > 0 && (
            <span className="notifRedDot"></span>
          )}
        </button>
      </div>

      {/* Notification Popup */}
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
          {/* Header with Title and Close Button */}
          <div className="notifHeader">
            <div className="notifHeaderLeft">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notifBadge">{unreadCount} new</span>
              )}
            </div>
            <button className="notifCloseBtn" onClick={() => setIsOpen(false)}>
              <IoCloseOutline size={20} />
            </button>
          </div>

          {/* Action Buttons Section */}
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

          {/* Notifications List */}
          <div className="notifContent">
            {notifications.length === 0 ? (
              <div className="notifEmpty">
                <IoNotificationsOutline size={40} className="notifEmptyIcon" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notifItem ${!notification.read ? 'notifUnread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
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
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;