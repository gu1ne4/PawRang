import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoAlertCircleOutline,
  IoAlbumsOutline,
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoCloseCircleSharp,
  IoDocumentTextOutline,
  IoFilterSharp,
  IoFlashOutline,
  IoPeopleOutline,
  IoSearchSharp,
  IoSettingsOutline,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';

import './AdminStyles.css';
import API_URL from '../API';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { fetchAuditLogs, getStoredAuditLogs, type AuditLogEntry } from './auditLogService';

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

interface ModalConfigType {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
}

const MODULE_OPTIONS = [
  'All Modules',
  'Authentication',
  'Employee Accounts',
  'Patient Accounts',
  'Pet Profiles',
  'Appointments',
  'Settings',
  'Availability Settings',
  'Inventory',
  'EMR',
  'Billing'
];

const ROLE_OPTIONS = ['All Roles', 'Admin', 'Veterinarian', 'Receptionist', 'User'];
const STATUS_OPTIONS = ['All Statuses', 'Success', 'Warning', 'Failed'];

const getStatusClassName = (status: AuditLogEntry['status']) => {
  if (status === 'Success') return 'activeBadge';
  if (status === 'Warning') return 'auditWarningBadge';
  return 'inactiveBadge';
};

const getStatusTextClassName = (status: AuditLogEntry['status']) => {
  if (status === 'Success') return 'activeText';
  if (status === 'Warning') return 'auditWarningText';
  return 'auditFailedText';
};

export default function AdminAuditPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const [page, setPage] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditStatusMessage, setAuditStatusMessage] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  const itemsPerPage = 7;

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'confirm',
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        }
      } catch (error) {
        console.error('Failed to load user session', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAuditLogs = async () => {
      setAuditLoading(true);
      try {
        const result = await fetchAuditLogs();
        if (!isMounted) return;
        setAuditLogs(result.logs);
        setAuditStatusMessage(result.warning || '');
      } catch (error) {
        if (!isMounted) return;
        const fallbackLogs = getStoredAuditLogs();
        setAuditLogs(fallbackLogs);
        setAuditStatusMessage(
          fallbackLogs.length > 0
            ? 'Audit API is unavailable. Showing unsynced local settings logs.'
            : error instanceof Error ? error.message : 'Unable to load audit logs.'
        );
      } finally {
        if (isMounted) setAuditLoading(false);
      }
    };

    loadAuditLogs();
    window.addEventListener('focus', loadAuditLogs);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadAuditLogs);
    };
  }, []);

  const handleLogoutPress = () => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        if (currentUser) {
          await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id || currentUser.pk,
              userType: 'EMPLOYEE',
              username: currentUser.username || currentUser.fullName,
              role: currentUser.role
            })
          });
        }
      } catch (error) {
        console.error('Logout audit failed:', error);
      }
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/Login');
    }, true);
  };

  const orderedAuditLogs = useMemo(() => {
    return [...auditLogs].sort(
      (firstLog, secondLog) => new Date(secondLog.dateTime).getTime() - new Date(firstLog.dateTime).getTime()
    );
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return orderedAuditLogs.filter((log) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchLower === '' ||
        log.actor.toLowerCase().includes(searchLower) ||
        log.event.toLowerCase().includes(searchLower) ||
        log.module.toLowerCase().includes(searchLower) ||
        log.target.toLowerCase().includes(searchLower) ||
        log.summary.toLowerCase().includes(searchLower);

      const activeModuleFilter = selectedModule !== 'All Modules' ? selectedModule : moduleFilter;
      const matchesModule = activeModuleFilter === 'All Modules' ? true : log.module === activeModuleFilter;
      const matchesRole = roleFilter === 'All Roles' ? true : log.role === roleFilter;
      const matchesStatus = statusFilter === 'All Statuses' ? true : log.status === statusFilter;

      return matchesSearch && matchesModule && matchesRole && matchesStatus;
    });
  }, [orderedAuditLogs, moduleFilter, roleFilter, searchQuery, selectedModule, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const paginationWindowStart = Math.max(0, Math.min(page - 1, totalPages - 3));
  const paginationNumbers = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => paginationWindowStart + index
  );

  const summaryStats = useMemo(() => {
    const total = orderedAuditLogs.length;
    const success = orderedAuditLogs.filter((log) => log.status === 'Success').length;
    const warning = orderedAuditLogs.filter((log) => log.status === 'Warning').length;
    const failed = orderedAuditLogs.filter((log) => log.status === 'Failed').length;

    return { total, success, warning, failed };
  }, [orderedAuditLogs]);

  const moduleCards = useMemo(() => {
    return [
      {
        title: 'Authentication',
        count: orderedAuditLogs.filter((log) => log.module === 'Authentication').length,
        detail: 'Logins, logouts, and credential flows',
        icon: <IoShieldCheckmarkOutline size={22} />
      },
      {
        title: 'Appointments',
        count: orderedAuditLogs.filter((log) => log.module === 'Appointments').length,
        detail: 'Scheduling, completion, and rescheduling',
        icon: <IoCalendarOutline size={22} />
      },
      {
        title: 'Settings',
        count: orderedAuditLogs.filter((log) => log.module === 'Settings').length,
        detail: 'Homepage, services, prices, and publishing changes',
        icon: <IoSettingsOutline size={22} />
      },
      {
        title: 'Inventory',
        count: orderedAuditLogs.filter((log) => log.module === 'Inventory').length,
        detail: 'Stock movements and archive actions',
        icon: <IoAlbumsOutline size={22} />
      },
      {
        title: 'Records & Billing',
        count: orderedAuditLogs.filter((log) => log.module === 'EMR' || log.module === 'Billing').length,
        detail: 'Medical records, invoices, and sensitive edits',
        icon: <IoDocumentTextOutline size={22} />
      }
    ];
  }, [orderedAuditLogs]);

  useEffect(() => {
    setPage(0);
  }, [filteredLogs.length]);

  const clearFilters = () => {
    setModuleFilter('All Modules');
    setRoleFilter('All Roles');
    setStatusFilter('All Statuses');
    setSelectedModule('All Modules');
    setSearchQuery('');
    setPage(0);
  };

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      <div className="bodyContainer">
        <div className="topContainer auditTopContainer">
          <div className="subTopContainer auditSubTopContainer">
            <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText">Audit Logs</span>
          </div>
          <div className="subTopContainer notificationContainer auditNotificationContainer">
            <Notifications
              buttonClassName="iconButton"
              iconClassName="blueIcon"
              onViewAll={() => showAlert('info', 'Notifications', 'Notifications preview is not wired on this screen yet.')}
            />
          </div>
        </div>

        <div className="tableContainer auditTableContainer">
          {loading || auditLoading ? (
            <div className="loadingContainer"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="auditOverviewGrid">
                <div className="auditHeroCard">
                  <div className="auditHeroText">
                    <span className="auditEyebrow">Clinic Oversight</span>
                    <h2>Centralized visibility for every important system action.</h2>
                    <p>Review real audit logs grouped across authentication, appointments, settings, records, inventory, and billing.</p>
                  </div>

                  <div className="auditStatRow">
                    <div className="auditStatCard">
                      <div className="auditStatIcon auditBlueIconWrap"><IoFlashOutline size={18} /></div>
                      <div>
                        <strong>{summaryStats.total}</strong>
                        <span>Total events</span>
                      </div>
                    </div>
                    <div className="auditStatCard">
                      <div className="auditStatIcon auditGreenIconWrap"><IoCheckmarkCircleOutline size={18} /></div>
                      <div>
                        <strong>{summaryStats.success}</strong>
                        <span>Successful</span>
                      </div>
                    </div>
                    <div className="auditStatCard">
                      <div className="auditStatIcon auditAmberIconWrap"><IoAlertCircleOutline size={18} /></div>
                      <div>
                        <strong>{summaryStats.warning}</strong>
                        <span>Needs review</span>
                      </div>
                    </div>
                    <div className="auditStatCard">
                      <div className="auditStatIcon auditRedIconWrap"><IoCloseCircleOutline size={18} /></div>
                      <div>
                        <strong>{summaryStats.failed}</strong>
                        <span>Failed</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="auditMiniCardStack">
                  {moduleCards.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      className={`auditMiniCard ${selectedModule === card.title ? 'auditMiniCardActive' : ''}`}
                      onClick={() => setSelectedModule((current) => current === card.title ? 'All Modules' : card.title)}
                    >
                      <div className="auditMiniCardHeader">
                        <div className="auditMiniCardIcon">{card.icon}</div>
                        <span>{card.count} events</span>
                      </div>
                      <strong>{card.title}</strong>
                      <p>{card.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="auditChipRow">
                {MODULE_OPTIONS.map((module) => (
                  <button
                    key={module}
                    type="button"
                    className={`auditChip ${selectedModule === module ? 'auditChipActive' : ''}`}
                    onClick={() => setSelectedModule(module)}
                  >
                    {module}
                  </button>
                ))}
              </div>

              <div className="tableToolbar">
                <div className="searchFilterSection">
                  <div className="toolbarItem" onMouseEnter={() => setSearchHovered(true)} onMouseLeave={() => setSearchHovered(false)}>
                    <button className="iconButton" onClick={() => setSearchVisible(!searchVisible)}>
                      <IoSearchSharp size={25} color={searchVisible ? '#afccf8' : '#3d67ee'} />
                    </button>
                    {searchHovered && <div className="tooltip">Search</div>}
                  </div>

                  {searchVisible && (
                    <input
                      type="text"
                      placeholder="Search actor, module, event, or target..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="searchInput auditSearchInput"
                      maxLength={80}
                    />
                  )}

                  <div className="toolbarItem" onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
                    <button className="iconButton" onClick={() => setFilterVisible(!filterVisible)}>
                      <IoFilterSharp size={25} color={filterVisible ? '#afccf8' : '#3d67ee'} />
                    </button>
                    {filterHovered && <div className="tooltip">Filter</div>}
                  </div>

                  {filterVisible && (
                    <div className="filterSection auditFilterSection">
                      <select value={moduleFilter} className="filterSelect wide" onChange={(e) => setModuleFilter(e.target.value)}>
                        {MODULE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>

                      <select value={roleFilter} className="filterSelect wide" onChange={(e) => setRoleFilter(e.target.value)}>
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>

                      <select value={statusFilter} className="filterSelect wide" onChange={(e) => setStatusFilter(e.target.value)}>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>

                      <button onClick={clearFilters} className="clearFilterBtn">
                        <IoCloseCircleSharp size={15} color="#ffffff" style={{ marginTop: '1px' }} />
                        <span>Clear Filters</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="actionSection auditActionMeta">
                  <span>{auditStatusMessage || `${filteredLogs.length} visible log entries`}</span>
                </div>
              </div>

              <div className="tableWrapper">
                <table className="dataTable auditDesktopTable">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Module</th>
                      <th style={{ width: '17%' }}>Event</th>
                      <th style={{ width: '16%' }}>Actor</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>Role</th>
                      <th style={{ width: '15%' }}>Target</th>
                      <th style={{ width: '13%' }}>Date & Time</th>
                      <th style={{ width: '7%', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => {
                        const formattedDate = new Date(log.dateTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={log.id}>
                            <td>
                              <div className="auditModuleCell">
                                <div className="auditModuleIcon">
                                  {log.module === 'Authentication' && <IoShieldCheckmarkOutline size={18} color="#3d67ee" />}
                                  {log.module === 'Appointments' && <IoCalendarOutline size={18} color="#3d67ee" />}
                                  {log.module === 'Settings' && <IoSettingsOutline size={18} color="#3d67ee" />}
                                  {log.module === 'Inventory' && <IoAlbumsOutline size={18} color="#3d67ee" />}
                                  {log.module !== 'Authentication' && log.module !== 'Appointments' && log.module !== 'Settings' && log.module !== 'Inventory' && (
                                    <IoPeopleOutline size={18} color="#3d67ee" />
                                  )}
                                </div>
                                <div className="auditCellStack">
                                  <span className="tableFont">{log.module}</span>
                                  <small>{log.summary}</small>
                                </div>
                              </div>
                            </td>
                            <td className="tableFont">{log.event}</td>
                            <td>
                              <div className="auditCellStack">
                                <span className="tableFont">{log.actor}</span>
                                <small>{log.target}</small>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }} className="tableFont">{log.role}</td>
                            <td className="tableFont">{log.target}</td>
                            <td>
                              <div className="auditDateCell">
                                <IoCalendarOutline size={14} color="#7a7a7a" />
                                <span>{formattedDate}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className={`statusBadge ${getStatusClassName(log.status)}`}>
                                <span className={`statusText ${getStatusTextClassName(log.status)}`}>{log.status}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="noData">
                          No audit entries match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="auditMobileList">
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => {
                      const formattedDate = new Date(log.dateTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      });

                      return (
                        <article key={`mobile-${log.id}`} className="auditMobileCard">
                          <div className="auditMobileTopRow">
                            <div className="auditModuleCell">
                              <div className="auditModuleIcon">
                                {log.module === 'Authentication' && <IoShieldCheckmarkOutline size={18} color="#3d67ee" />}
                                {log.module === 'Appointments' && <IoCalendarOutline size={18} color="#3d67ee" />}
                                {log.module === 'Settings' && <IoSettingsOutline size={18} color="#3d67ee" />}
                                {log.module === 'Inventory' && <IoAlbumsOutline size={18} color="#3d67ee" />}
                                {log.module !== 'Authentication' && log.module !== 'Appointments' && log.module !== 'Settings' && log.module !== 'Inventory' && (
                                  <IoPeopleOutline size={18} color="#3d67ee" />
                                )}
                              </div>
                              <div className="auditCellStack">
                                <span className="tableFont">{log.module}</span>
                                <small>{log.event}</small>
                              </div>
                            </div>
                            <div className={`statusBadge ${getStatusClassName(log.status)}`}>
                              <span className={`statusText ${getStatusTextClassName(log.status)}`}>{log.status}</span>
                            </div>
                          </div>
                          <div className="auditMobileInfoGrid">
                            <div className="auditMobileInfoItem">
                              <label>Actor</label>
                              <span>{log.actor}</span>
                            </div>
                            <div className="auditMobileInfoItem">
                              <label>Role</label>
                              <span>{log.role}</span>
                            </div>
                            <div className="auditMobileInfoItem auditMobileInfoItemWide">
                              <label>Target</label>
                              <span>{log.target}</span>
                            </div>
                            <div className="auditMobileInfoItem auditMobileInfoItemWide">
                              <label>Summary</label>
                              <span>{log.summary}</span>
                            </div>
                            <div className="auditMobileInfoItem auditMobileInfoItemWide">
                              <label>Date & Time</label>
                              <span>{formattedDate}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="noData">No audit entries match the current filters.</div>
                  )}
                </div>

                <div className="auditLegendRow">
                  <div className="auditLegendItem"><IoArrowUpCircleOutline size={16} color="#1F7A3F" /><span>Success: completed actions</span></div>
                  <div className="auditLegendItem"><IoAlertCircleOutline size={16} color="#a86200" /><span>Warning: sensitive or reviewable actions</span></div>
                  <div className="auditLegendItem"><IoArrowDownCircleOutline size={16} color="#b42318" /><span>Failed: rejected or incomplete actions</span></div>
                </div>

                {filteredLogs.length > 0 && (
                  <div className="pagination">
                    <button className="paginationBtn" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                      Previous
                    </button>
                    <div className="auditPaginationNumbers">
                      {paginationNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={`auditPageNumber ${pageNumber === page ? 'auditPageNumberActive' : ''}`}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber + 1}
                        </button>
                      ))}
                    </div>
                    <span className="paginationInfo">Page {page + 1} of {totalPages}</span>
                    <button className="paginationBtn" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page === totalPages - 1}>
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {modalVisible && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              {modalConfig.type === 'success' ? <IoCheckmarkCircleOutline size={55} color="#2e9e0c" /> :
               modalConfig.type === 'error' ? <IoCloseCircleOutline size={55} color="#d93025" /> :
               <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>

            <h3 className="alertTitle">{modalConfig.title}</h3>

            {typeof modalConfig.message === 'string' ? (
              <p className="alertMessage">{modalConfig.message}</p>
            ) : (
              <div style={{ marginBottom: '25px' }}>{modalConfig.message}</div>
            )}

            <div className="alertActions">
              {modalConfig.showCancel && (
                <button className="alertBtn cancelAlertBtn" onClick={() => setModalVisible(false)}>
                  Cancel
                </button>
              )}

              <button
                className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
