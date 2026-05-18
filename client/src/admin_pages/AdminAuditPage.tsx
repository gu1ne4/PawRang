import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  IoCloseOutline,
  IoChevronDownOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoFilterSharp,
  IoFlashOutline,
  IoPeopleOutline,
  IoSearchSharp,
  IoSettingsOutline,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';
import { RiListSettingsLine } from 'react-icons/ri';

import './AdminStyles.css';
import './AnalyticsStyles.css';
import API_URL from '../API';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import { fetchAuditLogs, getStoredAuditLogs, recordSettingsAuditLog, type AuditLogEntry } from './auditLogService';

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

interface BranchOption {
  id: string;
  name: string;
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

const ROLE_OPTIONS = ['All Roles', 'Admin', 'Veterinarian', 'Clinic Staff', 'Nurse', 'User'];
const STATUS_OPTIONS = ['All Statuses', 'Success', 'Warning', 'Failed'];
const ALL_BRANCHES_OPTION = 'All Branches';
const SYSTEM_WIDE_BRANCH_OPTION = 'System-wide';
const RECORDS_BILLING_MODULE_GROUP = 'Records & Billing';
type AuditSortOption = 'newest' | 'oldest' | 'moduleAZ' | 'actorAZ' | 'statusAZ';

type AuditReportPreset = 'thisWeek' | 'thisMonth' | 'last7Days' | 'last30Days' | 'custom';
type AuditReportSectionKey = 'summary' | 'details';

const AUDIT_SORT_OPTIONS: Array<{ value: AuditSortOption; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'moduleAZ', label: 'Module A-Z' },
  { value: 'actorAZ', label: 'Actor A-Z' },
  { value: 'statusAZ', label: 'Status A-Z' }
];

const AUDIT_ROWS_PER_PAGE_OPTIONS = [8, 12, 16, 24];

const AUDIT_REPORT_PRESETS: Array<{ key: AuditReportPreset; label: string }> = [
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last7Days', label: 'Last 7 Days' },
  { key: 'last30Days', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom Range' }
];

const AUDIT_REPORT_SECTIONS: Array<{ key: AuditReportSectionKey; label: string }> = [
  { key: 'summary', label: 'Audit Summary' },
  { key: 'details', label: 'Detailed Logs' }
];

const auditModuleMatchesFilter = (moduleName: string, filterName: string) => {
  if (filterName === 'All Modules') return true;
  if (filterName === RECORDS_BILLING_MODULE_GROUP) {
    return moduleName === 'EMR' || moduleName === 'Billing';
  }
  return moduleName === filterName;
};

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

const isAdminRole = (role?: string) => /admin/i.test(String(role || ''));

const formatAuditReportDate = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime || 'N/A';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const buildAuditReportFilename = (startDate: string, endDate: string) =>
  `PetShield_Audit_Report_${startDate}_to_${endDate}.pdf`;

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getAuditPresetRange = (preset: AuditReportPreset) => {
  const today = new Date();
  if (preset === 'thisWeek') {
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    return { startDate: formatInputDate(addDays(today, mondayOffset)), endDate: formatInputDate(today) };
  }
  if (preset === 'thisMonth') {
    return { startDate: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: formatInputDate(today) };
  }
  if (preset === 'last7Days') {
    return { startDate: formatInputDate(addDays(today, -6)), endDate: formatInputDate(today) };
  }
  if (preset === 'last30Days') {
    return { startDate: formatInputDate(addDays(today, -29)), endDate: formatInputDate(today) };
  }
  return { startDate: formatInputDate(today), endDate: formatInputDate(today) };
};

const formatReportDateRange = (startDate: string, endDate: string) =>
  `${formatAuditReportDate(`${startDate}T00:00:00`).replace(/, 12:00 AM$/, '')} - ${formatAuditReportDate(`${endDate}T00:00:00`).replace(/, 12:00 AM$/, '')}`;

const countBy = <T,>(items: T[], getKey: (item: T) => string) => (
  Object.entries(items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item) || 'Unspecified';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {})).sort((first, second) => second[1] - first[1])
);

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
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditStatusMessage, setAuditStatusMessage] = useState('');
  const [exportingAuditReport, setExportingAuditReport] = useState(false);
  const [auditExportModalOpen, setAuditExportModalOpen] = useState(false);
  const [auditExportError, setAuditExportError] = useState('');
  const [auditReportPreset, setAuditReportPreset] = useState<AuditReportPreset>('thisMonth');
  const defaultAuditRange = useMemo(() => getAuditPresetRange('thisMonth'), []);
  const [auditReportStartDate, setAuditReportStartDate] = useState(defaultAuditRange.startDate);
  const [auditReportEndDate, setAuditReportEndDate] = useState(defaultAuditRange.endDate);
  const [auditReportBranch, setAuditReportBranch] = useState(ALL_BRANCHES_OPTION);
  const [auditReportModule, setAuditReportModule] = useState('All Modules');
  const [auditReportRole, setAuditReportRole] = useState('All Roles');
  const [auditReportStatus, setAuditReportStatus] = useState('All Statuses');
  const [auditReportSections, setAuditReportSections] = useState<Record<AuditReportSectionKey, boolean>>({
    summary: true,
    details: true
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  });

  const itemsPerPage = rowsPerPage;
  const canExportAuditReport = isAdminRole(currentUser?.role);
  const allAuditReportSectionsSelected = AUDIT_REPORT_SECTIONS.every(section => auditReportSections[section.key]);

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

    const loadBranches = async () => {
      try {
        const response = await fetch(`${API_URL}/branches`);
        const payload = await response.json().catch(() => ({ branches: [] }));
        if (!isMounted || !Array.isArray(payload.branches)) return;

        const nextBranches = payload.branches
          .map((branch: any): BranchOption | null => {
            const id = branch?.branch_id ?? branch?.id;
            if (id === undefined || id === null || id === '') return null;

            return {
              id: String(id),
              name: branch?.branch_name || branch?.name || `Branch ${id}`
            };
          })
          .filter((branch: BranchOption | null): branch is BranchOption => Boolean(branch));

        setBranches(nextBranches);
      } catch (error) {
        console.error('Failed to load branches for audit filters', error);
      }
    };

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

    loadBranches();
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

  const branchesById = useMemo(() => {
    return branches.reduce<Record<string, BranchOption>>((lookup, branch) => {
      lookup[branch.id] = branch;
      return lookup;
    }, {});
  }, [branches]);

  const getLogBranchId = useCallback((log: AuditLogEntry) => {
    const branchId = log.branchId ?? log.branch_id;
    return branchId === undefined || branchId === null || branchId === '' ? '' : String(branchId);
  }, []);

  const getLogBranchName = useCallback((log: AuditLogEntry) => {
    const branchId = getLogBranchId(log);
    if (!branchId) return SYSTEM_WIDE_BRANCH_OPTION;
    return branchesById[branchId]?.name || `Branch ${branchId}`;
  }, [branchesById, getLogBranchId]);

  const filteredLogs = useMemo(() => {
    return orderedAuditLogs.filter((log) => {
      const branchName = getLogBranchName(log);
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchLower === '' ||
        log.actor.toLowerCase().includes(searchLower) ||
        log.event.toLowerCase().includes(searchLower) ||
        log.module.toLowerCase().includes(searchLower) ||
        log.target.toLowerCase().includes(searchLower) ||
        log.summary.toLowerCase().includes(searchLower) ||
        branchName.toLowerCase().includes(searchLower);

      const matchesModule = selectedModules.length === 0 ? true : selectedModules.includes(log.module);
      const matchesRole = roleFilter === 'All Roles' ? true : log.role === roleFilter;
      const matchesStatus = statusFilter === 'All Statuses' ? true : log.status === statusFilter;
      return matchesSearch && matchesModule && matchesRole && matchesStatus;
    });
  }, [getLogBranchName, orderedAuditLogs, roleFilter, searchQuery, selectedModules, statusFilter]);

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

  const getAuditReportBranchLabel = (branchValue: string) => {
    if (branchValue === ALL_BRANCHES_OPTION) return `${ALL_BRANCHES_OPTION} including ${SYSTEM_WIDE_BRANCH_OPTION}`;
    if (branchValue === SYSTEM_WIDE_BRANCH_OPTION) return SYSTEM_WIDE_BRANCH_OPTION;
    return branchesById[branchValue]?.name || `Branch ${branchValue}`;
  };

  const getAuditLogsForReport = () => {
    const startTime = new Date(`${auditReportStartDate}T00:00:00`).getTime();
    const endTime = new Date(`${auditReportEndDate}T23:59:59`).getTime();

    return orderedAuditLogs.filter((log) => {
      const logTime = new Date(log.dateTime).getTime();
      const matchesDate = !Number.isNaN(logTime) && logTime >= startTime && logTime <= endTime;
      const matchesModule = auditModuleMatchesFilter(log.module, auditReportModule);
      const matchesRole = auditReportRole === 'All Roles' ? true : log.role === auditReportRole;
      const matchesStatus = auditReportStatus === 'All Statuses' ? true : log.status === auditReportStatus;
      const matchesBranch =
        auditReportBranch === ALL_BRANCHES_OPTION ? true :
          auditReportBranch === SYSTEM_WIDE_BRANCH_OPTION ? getLogBranchId(log) === '' :
            getLogBranchId(log) === auditReportBranch;

      return matchesDate && matchesModule && matchesRole && matchesStatus && matchesBranch;
    });
  };

  const openAuditExportModal = () => {
    const range = getAuditPresetRange('thisMonth');
    const selectedReportModule = selectedModules.length === 1 ? selectedModules[0] : 'All Modules';
    setAuditReportPreset('thisMonth');
    setAuditReportStartDate(range.startDate);
    setAuditReportEndDate(range.endDate);
    setAuditReportBranch(ALL_BRANCHES_OPTION);
    setAuditReportModule(selectedReportModule);
    setAuditReportRole(roleFilter);
    setAuditReportStatus(statusFilter);
    setAuditReportSections({ summary: true, details: true });
    setAuditExportError('');
    setAuditExportModalOpen(true);
  };

  const handleAuditPresetChange = (preset: AuditReportPreset) => {
    setAuditReportPreset(preset);
    if (preset === 'custom') return;
    const range = getAuditPresetRange(preset);
    setAuditReportStartDate(range.startDate);
    setAuditReportEndDate(range.endDate);
  };

  const handleAuditReportDateChange = (type: 'start' | 'end', value: string) => {
    setAuditReportPreset('custom');
    if (type === 'start') {
      setAuditReportStartDate(value);
    } else {
      setAuditReportEndDate(value);
    }
  };

  const toggleAuditReportSection = (sectionKey: AuditReportSectionKey) => {
    setAuditReportSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleAllAuditReportSections = () => {
    const nextValue = !allAuditReportSectionsSelected;
    setAuditReportSections({ summary: nextValue, details: nextValue });
  };

  const handleExportAuditPdf = async () => {
    if (!canExportAuditReport) return;
    setAuditExportError('');

    if (!auditReportStartDate || !auditReportEndDate) {
      setAuditExportError('Select a valid start and end date.');
      return;
    }
    if (new Date(`${auditReportStartDate}T00:00:00`) > new Date(`${auditReportEndDate}T00:00:00`)) {
      setAuditExportError('Start date cannot be later than end date.');
      return;
    }
    if (!Object.values(auditReportSections).some(Boolean)) {
      setAuditExportError('Select at least one report section.');
      return;
    }

    const reportLogs = getAuditLogsForReport();
    if (reportLogs.length === 0) {
      setAuditExportError('There are no audit logs to export with the selected filters.');
      return;
    }

    setExportingAuditReport(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = ((autoTableModule as any).default || (autoTableModule as any).autoTable) as (doc: any, options: any) => void;
      if (!autoTable) throw new Error('PDF export library is unavailable.');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const generatedAt = new Date().toLocaleString();
      const exportedBy = currentUser?.fullName || currentUser?.username || 'Admin';
      const exportedById = currentUser?.id || currentUser?.pk || 'N/A';
      const branchLabel = getAuditReportBranchLabel(auditReportBranch);
      const filterRows = [
        ['Date Range', formatReportDateRange(auditReportStartDate, auditReportEndDate), 'Branch', branchLabel],
        ['Module', auditReportModule, 'Role', auditReportRole],
        ['Status', auditReportStatus, 'Generated By', exportedBy],
        ['Sections', AUDIT_REPORT_SECTIONS.filter(section => auditReportSections[section.key]).map(section => section.label).join(', '), 'Rows Matched', String(reportLogs.length)]
      ];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('PetShield Audit Report', 40, 44);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated: ${generatedAt}`, 40, 64);
      doc.text(`Exported By: ${exportedBy}`, 220, 64);
      doc.text(`Range: ${formatReportDateRange(auditReportStartDate, auditReportEndDate)}`, 420, 64);
      doc.text(`Exporter Role: ${currentUser?.role || 'Admin'}`, 40, 82);
      doc.text(`Exporter ID: ${exportedById}`, 220, 82);

      let currentY = 104;
      autoTable(doc, {
        startY: currentY,
        head: [['Filters Applied', '', '', '']],
        body: filterRows,
        theme: 'grid',
        margin: { left: 40, right: 40 },
        styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 74, fontStyle: 'bold' },
          1: { cellWidth: 265 },
          2: { cellWidth: 74, fontStyle: 'bold' },
          3: { cellWidth: 337 }
        }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 90) + 22;

      if (auditReportSections.summary) {
        const summaryRows = [
          ['Total Events', String(reportLogs.length)],
          ['Successful', String(reportLogs.filter(log => log.status === 'Success').length)],
          ['Warnings', String(reportLogs.filter(log => log.status === 'Warning').length)],
          ['Failed', String(reportLogs.filter(log => log.status === 'Failed').length)],
          ['System-wide Events', String(reportLogs.filter(log => getLogBranchId(log) === '').length)]
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['Metric', 'Value']],
          body: summaryRows,
          theme: 'grid',
          margin: { left: 40, right: 40 },
          styles: { fontSize: 8, cellPadding: 5 },
          headStyles: { fillColor: [61, 103, 238], textColor: 255, fontStyle: 'bold' },
        });
        currentY = ((doc as any).lastAutoTable?.finalY || currentY + 90) + 18;

        const breakdownTables = [
          { title: 'Totals by Module', rows: countBy(reportLogs, log => log.module) },
          { title: 'Totals by Role', rows: countBy(reportLogs, log => log.role) },
          { title: 'Totals by Status', rows: countBy(reportLogs, log => log.status) },
          { title: 'Totals by Branch', rows: countBy(reportLogs, getLogBranchName) }
        ];

        for (const table of breakdownTables) {
          if (currentY > pageHeight - 110) {
            doc.addPage();
            currentY = 48;
          }
          autoTable(doc, {
            startY: currentY,
            head: [[table.title, 'Count']],
            body: table.rows.length ? table.rows : [['No data', '0']],
            theme: 'grid',
            margin: { left: 40, right: 40 },
            styles: { fontSize: 8, cellPadding: 5 },
            headStyles: { fillColor: [61, 103, 238], textColor: 255, fontStyle: 'bold' },
          });
          currentY = ((doc as any).lastAutoTable?.finalY || currentY + 70) + 18;
        }
      }

      if (auditReportSections.details) {
        if (currentY > pageHeight - 130) {
          doc.addPage();
          currentY = 48;
        }
        autoTable(doc, {
          startY: currentY,
          head: [['Date & Time', 'Module', 'Event', 'Actor', 'Role', 'Branch', 'Target', 'Status', 'Summary']],
          body: reportLogs.map((log) => [
            formatAuditReportDate(log.dateTime),
            log.module,
            log.event,
            log.actor,
            log.role,
            getLogBranchName(log),
            log.target,
            log.status,
            log.summary
          ]),
          theme: 'grid',
          margin: { left: 40, right: 40 },
          styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [61, 103, 238], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 72 },
            2: { cellWidth: 86 },
            3: { cellWidth: 80 },
            4: { cellWidth: 64 },
            5: { cellWidth: 82 },
            6: { cellWidth: 86 },
            7: { cellWidth: 48 },
            8: { cellWidth: 190 }
          }
        });
      }

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let reportPage = 1; reportPage <= pageCount; reportPage += 1) {
        doc.setPage(reportPage);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Confidential audit report', 40, pageHeight - 24);
        doc.text(`Page ${reportPage} of ${pageCount}`, pageWidth - 95, pageHeight - 24);
      }

      doc.save(buildAuditReportFilename(auditReportStartDate, auditReportEndDate));
      recordSettingsAuditLog({
        module: 'Audit',
        event: 'Audit Report Exported',
        target: 'Audit Report',
        targetType: 'audit_report',
        targetId: `${auditReportStartDate}:${auditReportEndDate}`,
        summary: `${exportedBy} exported an audit PDF report for ${branchLabel} with ${reportLogs.length} matching event(s).`,
        status: 'Success',
        branchId: auditReportBranch === ALL_BRANCHES_OPTION || auditReportBranch === SYSTEM_WIDE_BRANCH_OPTION ? null : auditReportBranch
      }, currentUser);
      setAuditExportModalOpen(false);
    } catch (error) {
      console.error('Audit PDF export failed:', error);
      setAuditExportError(error instanceof Error ? error.message : 'Unable to export the audit report.');
    } finally {
      setExportingAuditReport(false);
    }
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
              {canExportAuditReport && (
                <button
                  type="button"
                  className="export-btn auditExportPdfBtn"
                  onClick={openAuditExportModal}
                  disabled={exportingAuditReport}
                >
                  <IoDownloadOutline size={16} />
                  <span>Export</span>
                  <IoChevronDownOutline size={12} />
                </button>
              )}
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
                      <th style={{ width: '16%' }}>Module</th>
                      <th style={{ width: '14%' }}>Event</th>
                      <th style={{ width: '14%' }}>Actor</th>
                      <th style={{ width: '11%', textAlign: 'center' }}>Role</th>
                      <th style={{ width: '13%' }}>Branch</th>
                      <th style={{ width: '13%' }}>Target</th>
                      <th style={{ width: '12%' }}>Date & Time</th>
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
                            <td className="tableFont">{getLogBranchName(log)}</td>
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
                        <td colSpan={8} className="noData">
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
                            <div className="auditMobileInfoItem">
                              <label>Branch</label>
                              <span>{getLogBranchName(log)}</span>
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

      {auditExportModalOpen && (
        <div className="analytics-export-modal-overlay" onClick={() => !exportingAuditReport && setAuditExportModalOpen(false)}>
          <div className="analytics-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="analytics-export-modal-header">
              <div>
                <h2>Export Audit Report</h2>
                <span>{formatReportDateRange(auditReportStartDate, auditReportEndDate)}</span>
              </div>
              <button
                type="button"
                className="analytics-export-modal-close"
                onClick={() => setAuditExportModalOpen(false)}
                disabled={exportingAuditReport}
                aria-label="Close export modal"
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            <div className="analytics-export-modal-body">
              <div className="analytics-export-field-group">
                <label>File Type</label>
                <div className="analytics-export-format-toggle audit-single-format">
                  <button type="button" className="active">
                    <IoDocumentTextOutline size={16} />
                    PDF Report
                  </button>
                </div>
              </div>

              <div className="analytics-export-field-group">
                <label>Date Range</label>
                <div className="analytics-export-preset-grid">
                  {AUDIT_REPORT_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={auditReportPreset === preset.key ? 'active' : ''}
                      onClick={() => handleAuditPresetChange(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-export-date-grid">
                <div className="analytics-export-field-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={auditReportStartDate}
                    onChange={(event) => handleAuditReportDateChange('start', event.target.value)}
                  />
                </div>
                <div className="analytics-export-field-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={auditReportEndDate}
                    onChange={(event) => handleAuditReportDateChange('end', event.target.value)}
                  />
                </div>
              </div>

              <div className="analytics-export-field-group">
                <label>Branch</label>
                <select value={auditReportBranch} onChange={(event) => setAuditReportBranch(event.target.value)}>
                  <option value={ALL_BRANCHES_OPTION}>{ALL_BRANCHES_OPTION}</option>
                  <option value={SYSTEM_WIDE_BRANCH_OPTION}>{SYSTEM_WIDE_BRANCH_OPTION}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div className="audit-export-filter-grid">
                <div className="analytics-export-field-group">
                  <label>Module</label>
                  <select value={auditReportModule} onChange={(event) => setAuditReportModule(event.target.value)}>
                    {MODULE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="analytics-export-field-group">
                  <label>Role</label>
                  <select value={auditReportRole} onChange={(event) => setAuditReportRole(event.target.value)}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="analytics-export-field-group">
                  <label>Status</label>
                  <select value={auditReportStatus} onChange={(event) => setAuditReportStatus(event.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="analytics-export-field-group">
                <div className="analytics-export-sections-header">
                  <label>Report Sections</label>
                  <label className="analytics-export-select-all">
                    <input
                      type="checkbox"
                      checked={allAuditReportSectionsSelected}
                      onChange={toggleAllAuditReportSections}
                    />
                    <span>Select All</span>
                  </label>
                </div>
                <div className="analytics-export-section-grid">
                  {AUDIT_REPORT_SECTIONS.map((section) => (
                    <label key={section.key} className="analytics-export-section-option">
                      <input
                        type="checkbox"
                        checked={auditReportSections[section.key]}
                        onChange={() => toggleAuditReportSection(section.key)}
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {auditExportError && (
                <div className="analytics-export-error">
                  <IoAlertCircleOutline size={14} />
                  <span>{auditExportError}</span>
                </div>
              )}
            </div>

            <div className="analytics-export-modal-footer">
              <button
                type="button"
                className="analytics-export-secondary"
                onClick={() => setAuditExportModalOpen(false)}
                disabled={exportingAuditReport}
              >
                Cancel
              </button>
              <button
                type="button"
                className="analytics-export-primary"
                onClick={handleExportAuditPdf}
                disabled={exportingAuditReport}
              >
                <IoDownloadOutline size={16} />
                {exportingAuditReport ? 'Preparing Report...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

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
