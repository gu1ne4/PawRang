// ViewAllNotificationsOverlay.tsx - SIMPLE & FAST
import React, { useState, useEffect } from 'react';
import {
  IoArrowBackOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoAlertCircleOutline,
  IoNotificationsOutline,
  IoCheckmarkDoneOutline,
  IoTrashOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoCloseOutline,
  IoCalendarOutline,
  IoCheckboxOutline,
  IoCheckboxSharp,
  IoSquareOutline,
  IoEyeOutline
} from 'react-icons/io5';
import type { AppNotification } from './Notifications';
import './NotifStyles.css';

interface ViewAllNotificationsOverlayProps {
  initialNotifications: AppNotification[];
  onClose: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

type FilterType = 'all' | 'unread' | 'read';
type SortType = 'newest' | 'oldest';

const ViewAllNotificationsOverlay: React.FC<ViewAllNotificationsOverlayProps> = ({
  initialNotifications,
  onClose,
  onNotificationClick
}) => {
  // Simple state - no useMemo/useCallback
  const [notifications, setNotifications] = useState(initialNotifications);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Only essential effect - prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Helper functions - direct and simple
  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return <IoCheckmarkCircleOutline size={20} className="notifDetailIconSuccess" />;
      case 'warning': return <IoWarningOutline size={20} className="notifDetailIconWarning" />;
      case 'error': return <IoAlertCircleOutline size={20} className="notifDetailIconError" />;
      default: return <IoNotificationsOutline size={20} className="notifDetailIconInfo" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 2880) return 'Yesterday';
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Filter and sort - simple and direct
  let filteredNotifications = [...notifications];
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredNotifications = filteredNotifications.filter(
      n => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query)
    );
  }
  
  if (filterType === 'unread') {
    filteredNotifications = filteredNotifications.filter(n => !n.read);
  } else if (filterType === 'read') {
    filteredNotifications = filteredNotifications.filter(n => n.read);
  }
  
  filteredNotifications.sort((a, b) => {
    const multiplier = sortType === 'newest' ? -1 : 1;
    return (a.timestamp.getTime() - b.timestamp.getTime()) * multiplier;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.length - unreadCount;

  // Simple handlers
  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    selectedNotifications.delete(id);
    setSelectedNotifications(new Set(selectedNotifications));
  };

  const handleDeleteAll = () => {
    setNotifications([]);
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkAsRead = () => {
    setNotifications(notifications.map(n => 
      selectedNotifications.has(n.id) ? { ...n, read: true } : n
    ));
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = () => {
    setNotifications(notifications.filter(n => !selectedNotifications.has(n.id)));
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (isSelectionMode) {
      handleSelectNotification(notification.id);
    } else {
      if (!notification.read) handleMarkAsRead(notification.id);
      if (onNotificationClick) onNotificationClick(notification);
      onClose();
    }
  };

  return (
    <div className="viewAllOverlay">
      <div className="viewAllOverlayContent">
        {/* Header */}
        <div className="viewAllOverlayHeader">
          <div className="viewAllOverlayHeaderLeft">
            <button className="viewAllOverlayBackBtn" onClick={onClose}>
              <IoArrowBackOutline size={22} />
            </button>
            <div className="viewAllOverlayTitleSection">
              <IoEyeOutline size={22} className="viewAllOverlayIcon" />
              <h2>Notifications</h2>
              {unreadCount > 0 && <span className="viewAllOverlayBadge">{unreadCount} new</span>}
            </div>
          </div>
          <button className="viewAllOverlayCloseBtn" onClick={onClose}>
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="viewAllOverlayFilters">
          <div className="viewAllOverlaySearchWrapper">
            <IoSearchOutline className="viewAllOverlaySearchIcon" size={18} />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="viewAllOverlaySearchInput"
            />
          </div>

          <div className="viewAllOverlayFilterGroup">
            <div className="viewAllOverlaySortButtons">
              <button
                className={`viewAllOverlaySortBtn ${sortType === 'newest' ? 'active' : ''}`}
                onClick={() => setSortType('newest')}
              >
                Newest
              </button>
              <button
                className={`viewAllOverlaySortBtn ${sortType === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortType('oldest')}
              >
                Oldest
              </button>
            </div>

            <div className="viewAllOverlayFilterDropdown">
              <button 
                className="viewAllOverlayFilterBtn"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <IoFilterOutline size={16} />
                Filter
              </button>
              
              {showFilterDropdown && (
                <div className="viewAllOverlayFilterMenu">
                  <button onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}>
                    All ({notifications.length})
                  </button>
                  <button onClick={() => { setFilterType('unread'); setShowFilterDropdown(false); }}>
                    Unread ({unreadCount})
                  </button>
                  <button onClick={() => { setFilterType('read'); setShowFilterDropdown(false); }}>
                    Read ({readCount})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="viewAllOverlayActions">
          {!isSelectionMode ? (
            <>
              {unreadCount > 0 && (
                <button className="viewAllOverlayMarkAllBtn" onClick={handleMarkAllAsRead}>
                  <IoCheckmarkDoneOutline size={16} />
                  Mark all read
                </button>
              )}
              <button className="viewAllOverlaySelectBtn" onClick={() => setIsSelectionMode(true)}>
                <IoCheckboxOutline size={16} />
                Select
              </button>
            </>
          ) : (
            <div className="viewAllOverlaySelectionActions">
              <span>{selectedNotifications.size} selected</span>
              <button onClick={handleSelectAll}>
                {selectedNotifications.size === filteredNotifications.length ? 'Deselect all' : 'Select all'}
              </button>
              {selectedNotifications.size > 0 && (
                <>
                  <button onClick={handleBulkMarkAsRead}>
                    <IoCheckmarkDoneOutline size={14} />
                    Read
                  </button>
                  <button onClick={handleBulkDelete}>
                    <IoTrashOutline size={14} />
                    Delete
                  </button>
                </>
              )}
              <button onClick={() => { setIsSelectionMode(false); setSelectedNotifications(new Set()); }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="viewAllOverlayStats">
          <div>Total: <strong>{notifications.length}</strong></div>
          <div>Unread: <strong className="unread">{unreadCount}</strong></div>
          <div>Read: <strong className="read">{readCount}</strong></div>
          {searchQuery && <div>Showing: <strong>{filteredNotifications.length}</strong></div>}
        </div>

        {/* Notifications List */}
        <div className="viewAllOverlayList">
          {filteredNotifications.length === 0 ? (
            <div className="viewAllOverlayEmpty">
              <IoNotificationsOutline size={48} />
              <h3>No notifications found</h3>
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setFilterType('all'); }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`viewAllOverlayItem ${!notification.read ? 'unread' : ''} ${selectedNotifications.has(notification.id) ? 'selected' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                {isSelectionMode && (
                  <div className="viewAllOverlayItemCheckbox" onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNotification(notification.id);
                  }}>
                    {selectedNotifications.has(notification.id) ? (
                      <IoCheckboxSharp size={18} />
                    ) : (
                      <IoSquareOutline size={18} />
                    )}
                  </div>
                )}
                
                <div className="viewAllOverlayItemIcon">
                  {getIcon(notification.type)}
                </div>
                
                <div className="viewAllOverlayItemContent">
                  <div className="viewAllOverlayItemHeader">
                    <div className="viewAllOverlayItemTitle">
                      {notification.title}
                      {!notification.read && <span className="viewAllOverlayItemUnreadDot" />}
                    </div>
                    <div className="viewAllOverlayItemTime">
                      <IoCalendarOutline size={12} />
                      {formatDate(notification.timestamp)}
                    </div>
                  </div>
                  <p className="viewAllOverlayItemMessage">{notification.message}</p>
                </div>
                
                {!isSelectionMode && (
                  <button
                    className="viewAllOverlayItemDelete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                  >
                    <IoTrashOutline size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && !isSelectionMode && (
          <div className="viewAllOverlayFooter">
            <button onClick={handleDeleteAll}>
              <IoTrashOutline size={16} />
              Delete all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllNotificationsOverlay;