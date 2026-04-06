import React, { useState, useEffect, useRef, useCallback, useMemo, useTransition, forwardRef, useImperativeHandle } from 'react';
import { 
  IoCloseOutline, 
  IoNotificationsOutline, 
  IoCheckmarkCircleOutline, 
  IoWarningOutline, 
  IoAlertCircleOutline,
  IoCheckmarkDoneOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoCheckboxOutline,
  IoCheckboxSharp,
  IoSquareOutline,
  IoArrowBackOutline,
  IoFilterOutline
} from 'react-icons/io5';
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

export interface NotificationsModalRef {
  openModal: () => void;
}

interface NotificationsAllModalProps {
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

const NotificationsAllModal = forwardRef<NotificationsModalRef, NotificationsAllModalProps>(({
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
}, ref) => {
  const [showViewAllModal, setShowViewAllModal] = useState<boolean>(false);
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
    },
    {
      id: '5',
      title: 'New Order Received',
      message: 'Order #12345 has been placed for $245.00',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
    },
    {
      id: '6',
      title: 'Payment Failed',
      message: 'Payment for Order #12340 has failed',
      type: 'error',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      read: false,
    }
  ]);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setShowViewAllModal(true);
    }
  }));

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      );
      return updated;
    });
    if (onMarkAsRead) onMarkAsRead(id);
  }, [onMarkAsRead]);

  const handleMarkAllAsReadGlobal = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    if (onMarkAllAsRead) onMarkAllAsRead();
  }, [onMarkAllAsRead]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) onNotificationClick(notification);
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

  return (
    <>
      {showViewAllModal && (
        <ViewAllNotificationsModal
          notifications={notifications}
          onClose={() => setShowViewAllModal(false)}
          onUpdateNotifications={setNotifications}
          getIcon={getIcon}
          formatTime={formatTime}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={handleMarkAllAsReadGlobal}
        />
      )}
    </>
  );
});

// ViewAllNotificationsModal Component
const ViewAllNotificationsModal: React.FC<ViewAllModalProps> = ({
  notifications,
  onClose,
  onUpdateNotifications,
  getIcon,
  formatTime,
  onNotificationClick,
  onMarkAllAsRead
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [, startTransition] = useTransition(); // Ignore the pending state
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [displaySearchTerm, setDisplaySearchTerm] = useState('');

  // Debounced search with transition for smooth UI
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        setDisplaySearchTerm(searchTerm);
      });
    }, 150);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Ultra fast filtering with proper sorting
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];
    
    if (displaySearchTerm) {
      const searchLower = displaySearchTerm.toLowerCase();
      result = result.filter(notif => 
        notif.title.toLowerCase().includes(searchLower) ||
        notif.message.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(notif => 
        filterStatus === 'read' ? notif.read : !notif.read
      );
    }
    
    if (sortOrder === 'newest') {
      result = [...result].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      result = [...result].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    
    return result;
  }, [notifications, displaySearchTerm, filterStatus, sortOrder]);

  const unreadCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < notifications.length; i++) {
      if (!notifications[i].read) count++;
    }
    return count;
  }, [notifications]);
  
  const readCount = notifications.length - unreadCount;

  const handleSelectAll = useCallback(() => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [selectedNotifications, filteredNotifications]);

  const handleSelectNotification = useCallback((id: string) => {
    setSelectedNotifications(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const handleBulkMarkAsRead = useCallback(() => {
    startTransition(() => {
      onUpdateNotifications(prev =>
        prev.map(notif => 
          selectedNotifications.has(notif.id) ? { ...notif, read: true } : notif
        )
      );
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);
    });
  }, [selectedNotifications, onUpdateNotifications]);

  const handleBulkDelete = useCallback(() => {
    if (window.confirm(`Delete ${selectedNotifications.size} notification(s)?`)) {
      startTransition(() => {
        onUpdateNotifications(prev => prev.filter(notif => !selectedNotifications.has(notif.id)));
        setSelectedNotifications(new Set());
        setIsSelectionMode(false);
      });
    }
  }, [selectedNotifications, onUpdateNotifications]);

  const handleDeleteAll = useCallback(() => {
    if (window.confirm('Delete all notifications?')) {
      startTransition(() => {
        onUpdateNotifications([]);
        setSelectedNotifications(new Set());
        setIsSelectionMode(false);
      });
    }
  }, [onUpdateNotifications]);

  const handleMarkSingleAsRead = useCallback((id: string) => {
    onUpdateNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, [onUpdateNotifications]);

  const handleDeleteSingle = useCallback((id: string) => {
    if (window.confirm('Delete this notification?')) {
      onUpdateNotifications(prev => prev.filter(notif => notif.id !== id));
      setSelectedNotifications(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(id);
        return newSelected;
      });
    }
  }, [onUpdateNotifications]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNotifications(new Set());
  }, []);

  const handleMarkAllAsReadModal = useCallback(() => {
    startTransition(() => {
      onUpdateNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (onMarkAllAsRead) onMarkAllAsRead();
    });
  }, [onUpdateNotifications, onMarkAllAsRead]);

  return (
    <div className="viewAllOverlay" onClick={onClose} style={{ willChange: 'auto' }}>
      <div className="viewAllOverlayContent" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="viewAllOverlayHeader">
          <div className="viewAllOverlayHeaderLeft">
            <button className="viewAllOverlayBackBtn" onClick={onClose}>
              <IoArrowBackOutline size={20} />
            </button>
            <div className="viewAllOverlayTitleSection">
              <IoNotificationsOutline size={24} className="viewAllOverlayIcon" />
              <h2>All Notifications</h2>
              <span className="viewAllOverlayBadge">{notifications.length} Total</span>
            </div>
          </div>
          <button className="viewAllOverlayCloseBtn" onClick={onClose}>
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="viewAllOverlayFilters">
          <div className="viewAllOverlaySearchWrapper">
            <IoSearchOutline size={18} className="viewAllOverlaySearchIcon" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="viewAllOverlaySearchInput"
            />
          </div>

          <div className="viewAllOverlayFilterGroup">
            <div className="viewAllOverlaySortButtons">
              <button
                className={`viewAllOverlaySortBtn ${sortOrder === 'newest' ? 'active' : ''}`}
                onClick={() => setSortOrder('newest')}
              >
                Newest
              </button>
              <button
                className={`viewAllOverlaySortBtn ${sortOrder === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortOrder('oldest')}
              >
                Oldest
              </button>
            </div>

            <div className="viewAllOverlayFilterSelectWrapper">
              <IoFilterOutline size={16} className="viewAllOverlayFilterSelectIcon" color='#3d67ee' />
              <select 
                className="viewAllOverlayFilterSelect"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All ({notifications.length})</option>
                <option value="unread">Unread ({unreadCount})</option>
                <option value="read">Read ({readCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="viewAllOverlayActions">
          {!isSelectionMode ? (
            <>
              <button className="viewAllOverlayMarkAllBtn" onClick={handleMarkAllAsReadModal}>
                <IoCheckmarkDoneOutline size={16} />
                Mark All Read
              </button>
              <button className="viewAllOverlaySelectBtn" onClick={() => setIsSelectionMode(true)}>
                <IoCheckboxOutline size={16} />
                Select
              </button>
            </>
          ) : (
            <div className="viewAllOverlaySelectionActions">
              <span className="viewAllOverlaySelectedCount">
                {selectedNotifications.size} selected
              </span>
              <button className="viewAllOverlaySelectAllBtn" onClick={handleSelectAll}>
                {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedNotifications.size > 0 && (
                <>
                  <button className="viewAllOverlayBulkReadBtn" onClick={handleBulkMarkAsRead}>
                    <IoCheckmarkDoneOutline size={12}/>
                    Mark Read
                  </button>
                  <button className="viewAllOverlayBulkDeleteBtn" onClick={handleBulkDelete}>
                    <IoTrashOutline size={12}/>
                    Delete
                  </button>
                </>
              )}
              <button className="viewAllOverlayCancelBtn" onClick={exitSelectionMode}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="viewAllOverlayList">
          {filteredNotifications.length === 0 ? (
            <div className="viewAllOverlayEmpty">
              <IoNotificationsOutline size={48} />
              <h3>No notifications</h3>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`viewAllOverlayItem ${!notification.read ? 'unread' : ''}`}
                style={{ 
                  cursor: isSelectionMode ? 'pointer' : 'default',
                  transform: 'translateZ(0)' 
                }}
              >
                {isSelectionMode && (
                  <div className="viewAllOverlayItemCheckbox" onClick={() => handleSelectNotification(notification.id)}>
                    {selectedNotifications.has(notification.id) ? (
                      <IoCheckboxSharp size={20} color="#3d67ee" />
                    ) : (
                      <IoSquareOutline size={20} color="#999" />
                    )}
                  </div>
                )}
                <div className="viewAllOverlayItemIcon">
                  {getIcon(notification.type)}
                </div>
                <div 
                  className="viewAllOverlayItemContent"
                  onClick={() => {
                    if (isSelectionMode) {
                      handleSelectNotification(notification.id);
                    } else if (!notification.read) {
                      handleMarkSingleAsRead(notification.id);
                    }
                    if (onNotificationClick) onNotificationClick(notification);
                  }}
                >
                  <div className="viewAllOverlayItemHeader">
                    <div className="viewAllOverlayItemTitle">
                      {!notification.read && <span className="viewAllOverlayItemUnreadDot" />}
                      {notification.title}
                    </div>
                    <div className="viewAllOverlayItemTime">
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                  <p className="viewAllOverlayItemMessage">{notification.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Delete All */}
        {notifications.length > 0 && !isSelectionMode && (
          <div className="viewAllOverlayFooter">
          </div>
        )}
      </div>
    </div>
  );
};

interface ViewAllModalProps {
  notifications: Notification[];
  onClose: () => void;
  onUpdateNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  getIcon: (type: Notification['type']) => React.ReactElement;
  formatTime: (date: Date) => string;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllAsRead?: () => void;
}

export default NotificationsAllModal;