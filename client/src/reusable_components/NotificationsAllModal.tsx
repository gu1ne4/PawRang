import React, { useState, useEffect, useRef, useCallback, useMemo, useTransition, forwardRef, useImperativeHandle } from 'react';
import { 
  IoCloseOutline, 
  IoNotificationsOutline, 
  IoCheckmarkCircleOutline, 
  IoWarningOutline, 
  IoAlertCircleOutline,
  IoCheckmarkDoneOutline,
  IoSearchOutline,
  IoCheckboxOutline,
  IoCheckboxSharp,
  IoSquareOutline,
  IoArrowBackOutline,
  IoFilterOutline,
  IoTrashOutline
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
  module?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationsModalRef {
  openModal: () => void;
}

interface NotificationsAllModalProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  onDelete?: (ids: string[]) => void | Promise<void>;
}

const MODULE_LABELS: Record<string, string> = {
  inventory: 'Inventory',
  appointments: 'Appointments',
  emr: 'EMR',
  billing: 'Billing',
  accounts: 'Accounts',
  availability: 'Availability',
  audit: 'Audit',
  system: 'System',
};

const getNotificationModuleKey = (notification: Notification) => {
  return String(notification.module || 'system').trim().toLowerCase() || 'system';
};

const getNotificationModuleLabel = (moduleKey: string) => {
  return MODULE_LABELS[moduleKey] || moduleKey.replace(/(^|-|_)\w/g, (match) => match.replace(/[-_]/, '').toUpperCase());
};

const NotificationsAllModal = forwardRef<NotificationsModalRef, NotificationsAllModalProps>(({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}, ref) => {
  const [showViewAllModal, setShowViewAllModal] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    openModal: () => {
      setShowViewAllModal(true);
    }
  }));

  const handleMarkAsRead = useCallback((id: string) => {
    if (onMarkAsRead) onMarkAsRead(id);
  }, [onMarkAsRead]);

  const handleMarkAllAsReadGlobal = useCallback(() => {
    if (onMarkAllAsRead) onMarkAllAsRead();
  }, [onMarkAllAsRead]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) onNotificationClick(notification);
    setShowViewAllModal(false);
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
          getIcon={getIcon}
          formatTime={formatTime}
          onNotificationClick={handleNotificationClick}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsReadGlobal}
          onDelete={onDelete}
        />
      )}
    </>
  );
});

// ViewAllNotificationsModal Component
const ViewAllNotificationsModal: React.FC<ViewAllModalProps> = ({
  notifications,
  onClose,
  getIcon,
  formatTime,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [filterModule, setFilterModule] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [, startTransition] = useTransition(); // Ignore the pending state
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

    if (filterModule !== 'all') {
      result = result.filter(notif => getNotificationModuleKey(notif) === filterModule);
    }
    
    if (sortOrder === 'newest') {
      result = [...result].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      result = [...result].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    
    return result;
  }, [notifications, displaySearchTerm, filterStatus, filterModule, sortOrder]);

  const moduleCounts = useMemo(() => {
    return notifications.reduce<Record<string, number>>((counts, notification) => {
      const moduleKey = getNotificationModuleKey(notification);
      counts[moduleKey] = (counts[moduleKey] || 0) + 1;
      return counts;
    }, {});
  }, [notifications]);

  const moduleOptions = useMemo(() => {
    const moduleKeys = Object.keys(moduleCounts).sort((a, b) =>
      getNotificationModuleLabel(a).localeCompare(getNotificationModuleLabel(b))
    );

    return moduleKeys.map((moduleKey) => ({
      value: moduleKey,
      label: getNotificationModuleLabel(moduleKey),
      count: moduleCounts[moduleKey],
    }));
  }, [moduleCounts]);

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
      selectedNotifications.forEach(notificationId => {
        if (onMarkAsRead) onMarkAsRead(notificationId);
      });
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);
    });
  }, [onMarkAsRead, selectedNotifications]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedNotifications);
    if (ids.length === 0) return;
    if (onDelete) onDelete(ids);
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  }, [onDelete, selectedNotifications]);

  const handleDeleteSingle = useCallback((id: string) => {
    if (onDelete) onDelete([id]);
  }, [onDelete]);

  const handleMarkSingleAsRead = useCallback((id: string) => {
    if (onMarkAsRead) onMarkAsRead(id);
  }, [onMarkAsRead]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNotifications(new Set());
  }, []);

  const handleMarkAllAsReadModal = useCallback(() => {
    startTransition(() => {
      if (onMarkAllAsRead) onMarkAllAsRead();
    });
  }, [onMarkAllAsRead]);

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

            <div className="viewAllOverlayFilterSelectWrapper">
              <IoFilterOutline size={16} className="viewAllOverlayFilterSelectIcon" color='#3d67ee' />
              <select
                className="viewAllOverlayFilterSelect"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
              >
                <option value="all">All Sources ({notifications.length})</option>
                {moduleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
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
                      return;
                    }

                    if (!notification.read) {
                      handleMarkSingleAsRead(notification.id);
                    }
                    if (onNotificationClick) onNotificationClick(notification);
                    onClose();
                  }}
                >
                  <div className="viewAllOverlayItemHeader">
                    <div className="viewAllOverlayItemTitle">
                      {!notification.read && <span className="viewAllOverlayItemUnreadDot" />}
                      {notification.title}
                      <span className="viewAllOverlayItemSource">
                        {getNotificationModuleLabel(getNotificationModuleKey(notification))}
                      </span>
                    </div>
                    <div className="viewAllOverlayItemTime">
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                  <p className="viewAllOverlayItemMessage">{notification.message}</p>
                </div>
                {!isSelectionMode && (
                  <button
                    type="button"
                    className="viewAllOverlayItemDelete"
                    title="Delete notification"
                    aria-label="Delete notification"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSingle(notification.id);
                    }}
                  >
                    <IoTrashOutline size={17} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface ViewAllModalProps {
  notifications: Notification[];
  onClose: () => void;
  getIcon: (type: Notification['type']) => React.ReactElement;
  formatTime: (date: Date) => string;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void | Promise<void>;
  onMarkAllAsRead?: () => void | Promise<void>;
  onDelete?: (ids: string[]) => void | Promise<void>;
}

export default NotificationsAllModal;
