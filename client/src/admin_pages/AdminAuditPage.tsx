import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoAlertCircleOutline,
  IoAlbumsOutline,
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
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
import { RiListSettingsLine } from 'react-icons/ri';

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

const ROLE_OPTIONS = ['All Roles', 'Admin', 'Veterinarian', 'Clinic Staff', 'User'];
const STATUS_OPTIONS = ['All Statuses', 'Success', 'Warning', 'Failed'];
type AuditSortOption = 'newest' | 'oldest' | 'moduleAZ' | 'actorAZ' | 'statusAZ';

const AUDIT_SORT_OPTIONS: Array<{ value: AuditSortOption; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'moduleAZ', label: 'Module A-Z' },
  { value: 'actorAZ', label: 'Actor A-Z' },
  { value: 'statusAZ', label: 'Status A-Z' }
];

const AUDIT_ROWS_PER_PAGE_OPTIONS = [8, 12, 16, 24];

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

const getModuleIcon = (module: string, size = 18) => {
  if (module === 'All Modules') return <IoFlashOutline size={size} />;
  if (module === 'Authentication') return <IoShieldCheckmarkOutline size={size} />;
  if (module === 'Appointments' || module === 'Availability Settings') return <IoCalendarOutline size={size} />;
  if (module === 'Settings') return <IoSettingsOutline size={size} />;
  if (module === 'Inventory') return <IoAlbumsOutline size={size} />;
  if (module === 'EMR' || module === 'Billing') return <IoDocumentTextOutline size={size} />;
  return <IoPeopleOutline size={size} />;
};

export default function AdminAuditPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterVisible, setFilterVisible] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHovered, setFilterHovered] = useState(false);
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<AuditSortOption>('newest');
  const [rowsPerPage, setRowsPerPage] = useState(8);
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

  const itemsPerPage = rowsPerPage;

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

      const matchesModule = selectedModules.length === 0 ? true : selectedModules.includes(log.module);
      const matchesRole = roleFilter === 'All Roles' ? true : log.role === roleFilter;
      const matchesStatus = statusFilter === 'All Statuses' ? true : log.status === statusFilter;

      return matchesSearch && matchesModule && matchesRole && matchesStatus;
    });
  }, [orderedAuditLogs, roleFilter, searchQuery, selectedModules, statusFilter]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((firstLog, secondLog) => {
      const firstDate = new Date(firstLog.dateTime).getTime();
      const secondDate = new Date(secondLog.dateTime).getTime();

      switch (sortOption) {
        case 'oldest':
          return firstDate - secondDate;
        case 'moduleAZ':
          return firstLog.module.localeCompare(secondLog.module);
        case 'actorAZ':
          return firstLog.actor.localeCompare(secondLog.actor);
        case 'statusAZ':
          return firstLog.status.localeCompare(secondLog.status);
        case 'newest':
        default:
          return secondDate - firstDate;
      }
    });
  }, [filteredLogs, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const paginatedLogs = sortedLogs.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const summaryStats = useMemo(() => {
    const total = orderedAuditLogs.length;
    const success = orderedAuditLogs.filter((log) => log.status === 'Success').length;
    const warning = orderedAuditLogs.filter((log) => log.status === 'Warning').length;
    const failed = orderedAuditLogs.filter((log) => log.status === 'Failed').length;

    return { total, success, warning, failed };
  }, [orderedAuditLogs]);

  const moduleOptionCards = useMemo(() => {
    return MODULE_OPTIONS.map((module) => ({
      title: module,
      count: module === 'All Modules'
        ? orderedAuditLogs.length
        : orderedAuditLogs.filter((log) => log.module === module).length
    }));
  }, [orderedAuditLogs]);

  const selectedModuleSummary = useMemo(() => {
    if (selectedModules.length === 0) return 'All Modules';
    if (selectedModules.length === 1) return selectedModules[0];
    return `${selectedModules.length} modules selected`;
  }, [selectedModules]);

  useEffect(() => {
    setPage(0);
  }, [sortedLogs.length, rowsPerPage]);

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(0);
  };

  const handleModuleFilterToggle = (module: string) => {
    setPage(0);

    if (module === 'All Modules') {
      setSelectedModules([]);
      return;
    }

    setSelectedModules((currentModules) => (
      currentModules.includes(module)
        ? currentModules.filter((currentModule) => currentModule !== module)
        : [...currentModules, module]
    ));
  };

  const clearFilters = () => {
    setRoleFilter('All Roles');
    setStatusFilter('All Statuses');
    setSelectedModules([]);
    setSearchQuery('');
    setPage(0);
  };

  const getAuditRowClassName = (status: AuditLogEntry['status']) => {
    if (status === 'Warning') return 'auditRowWarning';
    if (status === 'Failed') return 'auditRowFailed';
    return '';
  };

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      <div className="bodyContainer auditBodyContainer">
        <div className="topContainer auditTopContainer">
          <div className="subTopContainer auditSubTopContainer">
            <div className="auditHeroIcon">
              <IoDocumentTextOutline size={25} />
            </div>
            <div className="auditHeroCopy">
              <span>Clinic Oversight</span>
              <h1>Audit Logs</h1>
              <p>Track authentication, appointment, settings, inventory, record, and billing activity.</p>
            </div>
          </div>
          <div className="accountOverviewHeaderActions auditHeaderActions">
            <div className="accountSearchRow accountHeaderSearchRow">
              <div className="toolbarItem accountToolbarStaticIcon">
                <IoSearchSharp size={18} className="iconDefault" />
              </div>
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="searchInput accountHeaderSearchInput auditHeaderSearchInput"
                maxLength={80}
              />
            </div>
            <div className="accountHeaderDivider" aria-hidden="true" />
            <div className="subTopContainer notificationContainer auditNotificationContainer">
              <Notifications
                buttonClassName="iconButton"
                iconClassName="blueIcon"
                onViewAll={() => showAlert('info', 'Notifications', 'Notifications preview is not wired on this screen yet.')}
              />
            </div>
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

                <div className="auditModuleOptionsPanel">
                  <div className="auditModuleOptionsHeader">
                    <div>
                      <span className="auditModuleOptionsEyebrow">Module Options</span>
                      <h3>Filter activity by system area</h3>
                    </div>
                    <span>{selectedModuleSummary}</span>
                  </div>

                  <div className="auditModuleOptionGrid">
                    {moduleOptionCards.map((module) => (
                      <button
                        key={module.title}
                        type="button"
                        className={`auditModuleOption ${
                          (module.title === 'All Modules' && selectedModules.length === 0) || selectedModules.includes(module.title)
                            ? 'auditModuleOptionActive'
                            : ''
                        }`}
                        onClick={() => handleModuleFilterToggle(module.title)}
                        aria-pressed={(module.title === 'All Modules' && selectedModules.length === 0) || selectedModules.includes(module.title)}
                      >
                        <span className="auditModuleOptionIcon">{getModuleIcon(module.title, 17)}</span>
                        <span className="auditModuleOptionText">{module.title}</span>
                        <span className="auditModuleOptionCount">{module.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tableToolbar">
                <div className="searchFilterSection">
                  <div className="accountFilterRow">
                    <div className="toolbarItem" onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
                      <button className="iconButton" onClick={() => setFilterVisible(!filterVisible)}>
                        <IoFilterSharp size={18} className={filterVisible ? 'iconActive' : 'iconDefault'} />
                      </button>
                      {filterHovered && <div className="tooltip">Filter</div>}
                    </div>

                    {filterVisible && (
                      <div className="filterSection auditFilterSection">
                        <select value={roleFilter} className="filterSelect wide" onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>

                        <select value={statusFilter} className="filterSelect wide" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
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

                    <div className="accountFilterDivider" aria-hidden="true" />

                    <div className="accountSettingsDropdownContainer auditSettingsDropdownContainer">
                      <div className="toolbarItem">
                        <button
                          className="iconButton accountSortIconButton auditSortIconButton"
                          onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                          aria-label="Audit table settings"
                        >
                          <RiListSettingsLine size={19} className={showSettingsDropdown ? 'iconActive' : 'iconDefault'} />
                        </button>
                      </div>
                      {showSettingsDropdown && (
                        <div className="accountSettingsDropdown auditSettingsDropdown">
                          <div className="accountSettingsSection">
                            <label>Sort By</label>
                            <select
                              value={sortOption}
                              onChange={(e) => { setSortOption(e.target.value as AuditSortOption); setPage(0); }}
                              className="accountSettingsSelect"
                            >
                              {AUDIT_SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="accountSettingsDivider" />
                          <div className="accountSettingsSection">
                            <label>Rows Per Page</label>
                            <select
                              value={rowsPerPage}
                              onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value, 10))}
                              className="accountSettingsSelect"
                            >
                              {AUDIT_ROWS_PER_PAGE_OPTIONS.map(option => (
                                <option key={option} value={option}>{option} per page</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="actionSection auditActionMeta">
                  <span>{auditStatusMessage || `${sortedLogs.length} visible log entries`}</span>
                </div>
              </div>

              <div className="auditLegendRow">
                <div className="auditLegendItem"><IoArrowUpCircleOutline size={16} color="#1F7A3F" /><span>Success: completed actions</span></div>
                <div className="auditLegendItem"><IoAlertCircleOutline size={16} color="#a86200" /><span>Warning: sensitive or reviewable actions</span></div>
                <div className="auditLegendItem"><IoArrowDownCircleOutline size={16} color="#b42318" /><span>Failed: rejected or incomplete actions</span></div>
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
                          <tr key={log.id} className={getAuditRowClassName(log.status)}>
                            <td>
                              <div className="auditModuleCell">
                                <div className="auditModuleIcon">
                                  {getModuleIcon(log.module, 18)}
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
                        <article key={`mobile-${log.id}`} className={`auditMobileCard ${getAuditRowClassName(log.status)}`}>
                          <div className="auditMobileTopRow">
                            <div className="auditModuleCell">
                              <div className="auditModuleIcon">
                                {getModuleIcon(log.module, 18)}
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
                {sortedLogs.length > 0 && (
                  <div className="pagination accountPagination auditPagination">
                    <button className="paginationBtn paginationPrevBtn" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                      <IoChevronBackOutline size={15} />
                      <span>Previous</span>
                    </button>
                    <span className="paginationInfo">
                      Showing {sortedLogs.length === 0 ? 0 : page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, sortedLogs.length)} of {sortedLogs.length} items
                    </span>
                    <button className="paginationBtn paginationNextBtn" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page === totalPages - 1}>
                      <span>Next</span>
                      <IoChevronForwardOutline size={15} />
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
