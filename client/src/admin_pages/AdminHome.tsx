import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import API_URL from '../API';

// Icons
import './AdminStyles.css'; 
import { MdNotificationsNone } from "react-icons/md";
import { RiListSettingsLine } from "react-icons/ri";

import { 
  IoPeopleOutline, 
  IoSearchSharp,
  IoFilterSharp,
  IoCloseCircleSharp,
  IoPersonAdd,
  IoEye,
  IoPencilSharp,
  IoPersonOutline,
  IoCallOutline,
  IoMailOutline,
  IoBriefcaseOutline,
  IoLocationOutline,
  IoImageOutline,
  IoCamera,
  IoPersonCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import Notifications from '../reusable_components/Notifications';
import pawRangLogomarkWhite from '../assets/PawRang Logomark White.png';
import branchLP from '../assets/branchLP.jpg';
import branchTaguig from '../assets/branchTaguig.jpg';

interface User {
  id?: string; 
  username: string;
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  email: string;
  role: string;
  status: string;
  employee_image?: string; 
  created_at?: string;
  branch_id?: number | string | null;
  branch_name?: string;
  branchName?: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
  address?: string;
}

interface CurrentUser {
  id?: string;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  showCancel: boolean;
}

type Role = 'Admin' | 'Veterinarian' | 'Clinic Staff' | 'Moderator';
type Status = 'Active' | 'Disabled';
type AccountSortOption = 'nameAZ' | 'nameZA' | 'roleAZ' | 'emailAZ' | 'statusAZ' | 'newest';
type EmployeeFormErrors = Partial<Record<'firstName' | 'lastName' | 'contact' | 'email' | 'role' | 'branch', string>>;

const ACCOUNT_SORT_OPTIONS: Array<{ value: AccountSortOption; label: string }> = [
  { value: 'nameAZ', label: 'Name A-Z' },
  { value: 'nameZA', label: 'Name Z-A' },
  { value: 'roleAZ', label: 'Role A-Z' },
  { value: 'emailAZ', label: 'Email A-Z' },
  { value: 'statusAZ', label: 'Status A-Z' },
  { value: 'newest', label: 'Newest First' },
];

const ROWS_PER_PAGE_OPTIONS = [8, 12, 16, 24];
const BOTH_BRANCHES_VALUE = 'both-branches';

const formatPhilippineContactNumber = (value: string): string => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return '';

  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  return `+63 ${parts.join(' ')}`;
};

const isCompletePhilippineContactNumber = (value: string): boolean => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 && digits.startsWith('9');
};

const displayEmployeeRole = (value?: string): Role | string => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('reception') || normalized.includes('clinical') || normalized.includes('clinic staff')) return 'Clinic Staff';
  return value || 'Admin';
};

const getEmployeeBranchId = (user?: User): string =>
  String(user?.branch_id ?? '');

const isAdminRole = (value?: string): boolean =>
  (value || '').trim().toLowerCase() === 'admin';

const normalizeBranchText = (value?: string): string =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const getBranchName = (branch?: Branch): string =>
  normalizeBranchText(branch?.branch_name);

const isBothBranchesBranch = (branch?: Branch): boolean => {
  const name = getBranchName(branch);
  return name.includes('both') || name.includes('main') || name.includes('all branches');
};

const isBothBranchesLabel = (value?: string): boolean => {
  const name = normalizeBranchText(value);
  return name.includes('both') || name.includes('main') || name.includes('all branches');
};

const AdminHome: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<AccountSortOption>('nameAZ');
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);

  // Modal States
  const [addAccountVisible, setAddAccountVisible] = useState<boolean>(false);
  const [editAccountVisible, setEditAccountVisible] = useState<boolean>(false);
  const [viewAccountVisible, setViewAccountVisible] = useState<boolean>(false);
  const [selectedAccount, setSelectedAccount] = useState<User | {}>({});

  // Unified Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    showCancel: false
  });

  // Filter States
  const [status, setStatus] = useState<string>("defaultStatus");
  const [role, setRole] = useState<string>("defaultRole");
  const [branchFilter, setBranchFilter] = useState<string>("defaultBranch");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = rowsPerPage;

  // Form States 
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [newUsername, setNewUsername] = useState<string>(''); // Kept for Edit Modal
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newContact, setNewContact] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<Role>('Clinic Staff');
  const [newBranchId, setNewBranchId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<Status>('Active');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<EmployeeFormErrors>({});

  // Helper Functions
  const showAlert = (
    type: ModalConfig['type'], 
    title: string, 
    message: string | React.ReactNode, 
    onConfirm?: () => void, 
    showCancel: boolean = false
  ) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  const loadCurrentUser = async (): Promise<void> => {
    try {
      const session = localStorage.getItem('userSession');
      
      if (session) {
        setCurrentUser(JSON.parse(session));
      } else {
        // 🛑 TEMPORARILY DISABLED: The Bouncer is asleep
        // navigate('/login', { replace: true });
        console.log("No session found, but letting you stay for testing.");
      }
      
    } catch (error) {
      console.log('Error loading user session', error);
      // 🛑 TEMPORARILY DISABLED: The Bouncer is asleep
      // navigate('/login', { replace: true });
    }
  };

  const fetchAccounts = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/accounts`);
      const data = await response.json().catch(() => ([]));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account data.');
      }

      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch account data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/branches`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to fetch branches.');
      setBranches(Array.isArray(data.branches) ? data.branches : []);
    } catch (error) {
      console.error(error);
      setBranches([]);
    }
  };

  const getBranchForUser = (user?: User): Branch | undefined => {
    const branchId = getEmployeeBranchId(user);
    return branches.find(branch => String(branch.branch_id) === branchId);
  };

  const getBranchLabelForUser = (user?: User): string =>
    user?.branch_name || user?.branchName || getBranchForUser(user)?.branch_name || 'PetShield Veterinary Clinic & Grooming Services';

  const bothBranchesBranch = branches.find(isBothBranchesBranch);

  const isBothBranchesBranchId = (branchId: string): boolean =>
    isBothBranchesBranch(branches.find(branch => String(branch.branch_id) === branchId));

  const getEmployeeFormBranchId = (user?: User): string =>
    isAdminRole(user?.role) && isBothBranchesBranch(getBranchForUser(user))
      ? BOTH_BRANCHES_VALUE
      : getEmployeeBranchId(user);

  const getEmployeeDisplayRole = (user: User): string => {
    const roleLabel = displayEmployeeRole(user.role);
    if (
      roleLabel === 'Admin' &&
      (isBothBranchesBranch(getBranchForUser(user)) || isBothBranchesLabel(user.branch_name || user.branchName))
    ) {
      return 'Admin (Main)';
    }
    return roleLabel;
  };

  const getEmployeeBranchLabel = (user: User): string =>
    isAdminRole(user.role) && isBothBranchesBranch(getBranchForUser(user))
      ? 'Both Branches'
      : getShortBranchLabel(user.branch_name || user.branchName || getBranchForUser(user)?.branch_name);

  const getShortBranchLabel = (value?: string): string => {
    const normalized = normalizeBranchText(value);
    if (normalized.includes('both') || normalized.includes('main') || normalized.includes('all branches')) return 'Both Branches';
    if (normalized.includes('taguig')) return 'Taguig';
    if (normalized.includes('las') || normalized.includes('pinas') || normalized.includes('bf resort')) return 'Las Piñas';
    return value || 'N/A';
  };

  const getPayloadBranchId = (): number =>
    newBranchId === BOTH_BRANCHES_VALUE ? Number(bothBranchesBranch?.branch_id || 0) : Number(newBranchId);

  const isBothBranchesSelected = (branchId: string): boolean =>
    branchId === BOTH_BRANCHES_VALUE || isBothBranchesBranchId(branchId);

  const getBranchImageForBranchId = (branchId?: string | number | null, branchLabel?: string): string => {
    const branch = branches.find(item => String(item.branch_id) === String(branchId || ''));
    const name = normalizeBranchText(branchLabel) || getBranchName(branch);
    if (name.includes('taguig')) return branchTaguig;
    if (name.includes('las') || name.includes('pinas') || name.includes('bf resort')) return branchLP;
    return branchTaguig;
  };

  const getBranchPanelStyle = (branchId?: string | number | null, branchLabel?: string): React.CSSProperties => ({
    backgroundImage: `linear-gradient(180deg, rgba(16, 26, 71, 0.02), rgba(17, 24, 39, 0.20)), url("${getBranchImageForBranchId(branchId, branchLabel)}")`,
  });

  const handleRowsPerPageChange = (value: number): void => {
    setRowsPerPage(value);
    setPage(0);
  };

  useEffect(() => {
    fetchAccounts();
    fetchBranches();
    loadCurrentUser();
  }, []);

  const resetForm = (): void => {
    setNewUsername('');
    setNewFirstName('');
    setNewLastName('');
    setNewContact('');
    setNewEmail('');
    setNewRole('Clinic Staff');
    setNewBranchId('');
    setNewStatus('Active');
    setUserImage(null);
    setUserImageBase64(null);
    setEditingId(null);
    setFormErrors({});
  };

  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        await fetch(`${API_URL}/logout`, { method: 'POST' });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
      localStorage.removeItem('userSession');
      
      // Add { replace: true } right here!
      navigate('/login', { replace: true }); 
    }, true);
  };

  const handleCancel = (mode: 'create' | 'edit'): void => {
    let hasUnsavedChanges = false;

    if (mode === 'create') {
      // If creating, just check if they typed anything at all
      hasUnsavedChanges = !!newUsername || !!newFirstName || !!newLastName || !!newContact || !!newEmail || !!userImage;
    } else if (mode === 'edit') {
      // If editing, find the original user data and compare it to the text boxes
      const originalUser = accounts.find(u => u.id === editingId);
      
      if (originalUser) {
        hasUnsavedChanges = 
          newUsername !== (originalUser.username || '') ||
          newFirstName !== (originalUser.first_name || '') ||
          newLastName !== (originalUser.last_name || '') ||
          newContact !== formatPhilippineContactNumber(originalUser.contact_number || '') ||
          newEmail !== (originalUser.email || '') ||
          newRole !== displayEmployeeRole(originalUser.role || 'Admin') ||
          newBranchId !== getEmployeeFormBranchId(originalUser) ||
          newStatus !== (originalUser.status || 'Active');
      }
    }

    if (hasUnsavedChanges) {
      showAlert('confirm', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to discard them?', () => {
        setAddAccountVisible(false);
        setEditAccountVisible(false);
        resetForm();
      }, true);
    } else {
      setAddAccountVisible(false);
      setEditAccountVisible(false);
      resetForm();
    }
  };

  const handleStatusToggle = (value: boolean): void => {
    const nextStatus = value ? 'Active' : 'Disabled';
    const messageJSX = (
      <span>
        Are you sure you want to <span style={{fontWeight: 'bold', color: nextStatus === 'Active' ? 'green' : 'red'}}>{nextStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE'}</span> this account?
      </span>
    );
    showAlert('confirm', 'Confirm Status Change', messageJSX, () => {
      setNewStatus(nextStatus as Status);
    }, true);
  };

  const pickImage = async (): Promise<void> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setUserImage(base64);
          setUserImageBase64(base64.split(',')[1]); 
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const openEditModal = (user: User): void => {
    setEditingId(user.id || null);
    setNewUsername(user.username || '');
    setNewFirstName(user.first_name || '');
    setNewLastName(user.last_name || '');
    setNewContact(formatPhilippineContactNumber(user.contact_number || ''));
    setNewEmail(user.email || '');
    setNewRole(displayEmployeeRole(user.role) as Role);
    setNewBranchId(getEmployeeFormBranchId(user));
    setNewStatus((user.status as Status) || 'Active');
    
    let img = user.employee_image;
    if (img && !img.startsWith('data:image')) img = `data:image/jpeg;base64,${img}`;
    setUserImage(img || null);
    
    setEditAccountVisible(true);
  };

  const handleViewDetails = (user: User): void => {
    setSelectedAccount(user);
    setViewAccountVisible(true);
  };

  const validateEmployeeForm = (mode: 'create' | 'edit'): boolean => {
    const nextErrors: EmployeeFormErrors = {};
    if (!newFirstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!newLastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!newContact.trim()) nextErrors.contact = 'Contact number is required.';
    else if (!isCompletePhilippineContactNumber(newContact)) nextErrors.contact = 'Enter a valid PH mobile number, e.g. +63 912 345 6789.';
    if (!newEmail.trim()) nextErrors.email = 'Email is required.';
    if (!newRole) nextErrors.role = 'Role is required.';
    if (!newBranchId) nextErrors.branch = 'Branch selection is required.';
    if (newBranchId === BOTH_BRANCHES_VALUE && !bothBranchesBranch) {
      nextErrors.branch = 'Both Branches must exist in the branches table before saving.';
    }
    if (mode === 'edit' && !newUsername.trim()) {
      setFormErrors(nextErrors);
      showAlert('error', 'Missing Information', 'Please fill in all required fields.');
      return false;
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // CREATE ACCOUNT LOGIC (Updated for Dummy Username)
  const handleSavePress = async (): Promise<void> => {
    if (!validateEmployeeForm('create')) {
      return;
    }

    showAlert('confirm', 'Create Account', 'Are you sure you want to register this new employee?', async () => {
      
      // Auto-generate a dummy password and username
      try {
        const response = await fetch(`${API_URL}/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: newFirstName.trim(),
            last_name: newLastName.trim(),
            contact_number: newContact,
            email: newEmail,
            role: newRole,
            branch_id: getPayloadBranchId(),
            status: newStatus,
            employee_image: userImageBase64,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to create account.');

        setAddAccountVisible(false);
        showAlert(
          'success',
          'Success',
          <span>
            Account created successfully.
            <br />
            A setup link has been sent to <strong>{result.account?.email}</strong>.
            <br />
            The employee must use that email link to create their username and password before they can log in.
          </span>,
          () => {
            fetchAccounts();
            resetForm();
          }
        );

      } catch (error: any) {
        showAlert('error', 'Registration Failed', error.message || 'Failed to create account.');
      }
    }, true);
  };

  // UPDATE ACCOUNT LOGIC
  const handleUpdateAccount = async (): Promise<void> => {
    if (!validateEmployeeForm('edit')) {
      return;
    }

    showAlert('confirm', 'Save Changes', 'Are you sure you want to save changes to this account?', async () => {
      try {
        const updateData: any = {
          username: newUsername,
          first_name: newFirstName.trim(), 
          last_name: newLastName.trim(),   
          contact_number: newContact,
          email: newEmail,
          role: newRole,
          branch_id: getPayloadBranchId(),
          status: newStatus,
        };

        if (userImageBase64) {
          updateData.employee_image = userImageBase64;
        }

        const response = await fetch(`${API_URL}/accounts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update account information.');

        setEditAccountVisible(false);
        showAlert('success', 'Success', 'Account Updated Successfully!', () => {
          fetchAccounts();
          resetForm();
        });
      } catch (error: any) {
        showAlert('error', 'Update Failed', error.message || 'Failed to update account information.');
      }
    }, true);
  };

  const noMatchFilters = status === "defaultStatus" && role === "defaultRole" && branchFilter === "defaultBranch";

  const filteredUsers = accounts.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const uName = (user.username || fullName).toLowerCase();
    const uEmail = (user.email || '').toLowerCase();
    const uStatus = user.status || 'Active';
    const uRole = user.role || '';
    const uBranch = getEmployeeBranchLabel(user);

    const matchesSearch = uName.includes(searchQuery.toLowerCase()) || uEmail.includes(searchQuery.toLowerCase());
    const matchesStatus = status !== "defaultStatus" ? uStatus === status : true;
    const matchesRole = role !== "defaultRole" ? displayEmployeeRole(uRole) === role : true;
    const matchesBranch = branchFilter !== "defaultBranch" ? uBranch === branchFilter : true;

    return matchesSearch && matchesStatus && matchesRole && matchesBranch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const nameA = (a.username || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
    const nameB = (b.username || `${b.first_name || ''} ${b.last_name || ''}`).toLowerCase();
    switch (sortOption) {
      case 'nameZA':
        return nameB.localeCompare(nameA);
      case 'roleAZ':
        return getEmployeeDisplayRole(a).localeCompare(getEmployeeDisplayRole(b));
      case 'emailAZ':
        return (a.email || '').localeCompare(b.email || '');
      case 'statusAZ':
        return (a.status || 'Active').localeCompare(b.status || 'Active');
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'nameAZ':
      default:
        return nameA.localeCompare(nameB);
    }
  });

  const paginatedUsers = sortedUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  return (
    <div className="biContainer">
        <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      <div className="bodyContainer accountOverviewBodyContainer">
        <div className="topContainer accountOverviewTopContainer">
          <div className="subTopContainer accountOverviewSubTopContainer">
            <IoPeopleOutline size={23} className="blueIcon" />
            <span className="blueText">Account Overview / Employees</span>
          </div>
          <div className="subTopContainer notificationContainer accountOverviewNotificationContainer">
            <Notifications 
              buttonClassName="invIconButton"
              iconClassName="invBlueIcon"
              onViewAll={() => {
                // Handle view all notifications
                console.log('View all notifications');
              }}
              onNotificationClick={(notification) => {
                // Handle individual notification click
                if (notification.link) {
                  navigate(notification.link);
                }
              }}
            />
          </div>
        </div>

        <div className="tableContainer accountOverviewTableContainer">
          <div className="tableToolbar">
            <div className="searchFilterSection">
              <div className="toolbarItem">
                <button 
                  className="iconButton"
                  onMouseEnter={() => setSearchHovered(true)}
                  onMouseLeave={() => setSearchHovered(false)}
                  onClick={() => setSearchVisible(!searchVisible)}
                >
                  <IoSearchSharp size={25} className={searchVisible ? "iconActive" : "iconDefault"} />
                </button>
                {searchHovered && <div className="tooltip">Search</div>}
              </div>

              {searchVisible && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setPage(0);}}
                  className="searchInput"
                  maxLength={60}
                />
              )}

              <div className="toolbarItem">
                <button 
                  className="iconButton"
                  onMouseEnter={() => setFilterHovered(true)}
                  onMouseLeave={() => setFilterHovered(false)}
                  onClick={() => setFilterVisible(!filterVisible)}
                >
                  <IoFilterSharp size={25} className={filterVisible ? "iconActive" : "iconDefault"} />
                </button>
                {filterHovered && <div className="tooltip">Filter</div>}
              </div>
              
              {filterVisible && (
                <div className="filterSection">
                  <select 
                    value={status} 
                    onChange={(e) => {setStatus(e.target.value); setPage(0);}}
                    className="filterSelect"
                  >
                    <option value="defaultStatus">Status</option>
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>

                  <select 
                    value={role} 
                    onChange={(e) => {setRole(e.target.value); setPage(0);}}
                    className="filterSelect"
                  >
                    <option value="defaultRole">Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Clinic Staff">Clinic Staff</option>
                  </select>

                  <select
                    value={branchFilter}
                    onChange={(e) => { setBranchFilter(e.target.value); setPage(0); }}
                    className="filterSelect"
                  >
                    <option value="defaultBranch">Branch</option>
                    <option value="Both Branches">Both Branches</option>
                    <option value="Las Piñas">Las Piñas</option>
                    <option value="Taguig">Taguig</option>
                  </select>

                  <button
                    onClick={() => {
                      setStatus("defaultStatus");
                      setRole("defaultRole");
                      setBranchFilter("defaultBranch");
                      setSearchQuery("");
                      setPage(0);
                    }}
                    className="clearFilterBtn"
                  >
                    <IoCloseCircleSharp size={15} />
                    <span>Clear Filters</span>
                  </button>
                </div>
              )}
              <div className="accountSettingsDropdownContainer">
                <div className="toolbarItem">
                  <button
                    className="iconButton"
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    aria-label="Account table settings"
                  >
                    <RiListSettingsLine size={23} className={showSettingsDropdown ? "iconActive" : "iconDefault"} />
                  </button>
                </div>
                {showSettingsDropdown && (
                  <div className="accountSettingsDropdown">
                    <div className="accountSettingsSection">
                      <label>Sort By</label>
                      <select
                        value={sortOption}
                        onChange={(e) => { setSortOption(e.target.value as AccountSortOption); setPage(0); }}
                        className="accountSettingsSelect"
                      >
                        {ACCOUNT_SORT_OPTIONS.map(option => (
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
                        {ROWS_PER_PAGE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option} per page</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="actionSection">
              <button className="blackBtn" onClick={() => { resetForm(); setAddAccountVisible(true); }}>
                <IoPersonAdd /> Add Account
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loadingContainer">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="tableWrapper">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{flex: 3}}>Name</th>
                    <th style={{flex: 1.1}}>Role</th>
                    <th style={{flex: 1.4}}>Branch</th>
                    <th style={{flex: 2}}>Contact Number</th>
                    <th style={{flex: 2.5}}>E-Mail</th>
                    <th style={{flex: 1.5}}>Status</th>
                    <th style={{flex: 1}}>View</th>
                    <th style={{flex: 1}}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map(user => {
                      const uStatus = user.status || 'Active';
                      const uName = user.username;
                      const uContact = user.contact_number;
                      
                      let uImage = user.employee_image;
                      if (uImage && !uImage.startsWith('data:image')) {
                          uImage = `data:image/jpeg;base64,${uImage}`;
                      }

                      return (
                        <tr key={user.id || Math.random()}>
                          <td>
                            <div className="userCell">
                              <img 
                                src={uImage || '../assets/userImg.jpg'} 
                                alt={uName}
                                className="userAvatar"
                              />
                              <span>{uName}</span>
                            </div>
                          </td>
                          <td>{getEmployeeDisplayRole(user)}</td>
                          <td>{getEmployeeBranchLabel(user)}</td>
                          <td>{formatPhilippineContactNumber(uContact || '') || uContact}</td>
                          <td>{user.email}</td>
                          <td>
                            <div className={`statusBadge ${uStatus === 'Active' ? 'activeBadge' : 'inactiveBadge'}`}>
                              <span className={uStatus === 'Active' ? 'activeText' : ''}>{uStatus}</span>
                            </div>
                          </td>
                          <td>
                            <button className="iconButton" onClick={() => handleViewDetails(user)}>
                              <IoEye size={15} className="blueIcon" />
                            </button>
                          </td>
                          <td>
                            <button className="iconButton" onClick={() => openEditModal(user)}>
                              <IoPencilSharp size={15} className="blueIcon" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="noData">
                        {noMatchFilters ? "Showing all users (no filters applied)" : "No users found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pagination accountPagination">
                <button 
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="paginationBtn"
                >
                  Previous
                </button>
                <span className="paginationInfo">
                  Showing {sortedUsers.length === 0 ? 0 : page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, sortedUsers.length)} of {sortedUsers.length} items
                </span>
                <button 
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="paginationBtn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD ACCOUNT MODAL */}
      {addAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer accountProfileModal">
            <div className="modalHeader accountModalHeader">
              <div>
                <h2>Create Employee Account</h2>
                <p>Add staff access details and profile information.</p>
              </div>
              <button className="accountModalClose" onClick={() => handleCancel('create')} aria-label="Close create employee modal">
                <IoCloseCircleSharp size={22} />
              </button>
            </div>
            <div className="imageUploadSection">
              <div className="accountVisualPanelContent">
                <div className="accountPoweredBy">
                  <span>Powered by</span>
                  <img src={pawRangLogomarkWhite} alt="PawRang" />
                </div>
                <div className="accountVisualTitle">PetShield Veterinary Clinic &amp; Grooming Services</div>
              </div>
            </div>
            <div className="modalForm">
              <div className="formGroup accountPhotoGroup">
                <label>Employee Photo</label>
                <div className="accountAvatarField">
                  <button className="uploadBtn" onClick={pickImage}>
                    {userImage ? (
                      <img src={userImage} alt="User" className="uploadedImage" />
                    ) : (
                      <div className="uploadPlaceholder">
                        <IoImageOutline size={16} />
                        <span>Upload</span>
                      </div>
                    )}
                    <div className="cameraIcon">
                      <IoCamera size={13} />
                    </div>
                  </button>
                  <div>
                    <h3>Profile Photo</h3>
                    <p>Optional staff image.</p>
                  </div>
                </div>
              </div>
              
              {/* Left Column */}
              <div className="formColumn">
                <div className="formGroup">
                  <label>First Name</label>
                  <div className="inputWithIcon">
                    <IoPersonOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="Enter First Name" 
                      maxLength={30} 
                      value={newFirstName} 
                      onChange={(e) => {
                        setNewFirstName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''));
                        setFormErrors(prev => ({ ...prev, firstName: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.firstName && <p className="fieldError">{formErrors.firstName}</p>}
                </div>
                <div className="formGroup">
                  <label>Last Name</label>
                  <div className="inputWithIcon">
                    <IoPersonOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="Enter Last Name" 
                      maxLength={30} 
                      value={newLastName} 
                      onChange={(e) => {
                        setNewLastName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''));
                        setFormErrors(prev => ({ ...prev, lastName: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.lastName && <p className="fieldError">{formErrors.lastName}</p>}
                </div>
                <div className="formGroup">
                  <label>Contact Number</label>
                  <div className="inputWithIcon">
                    <IoCallOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="+63 912 345 6789" 
                      maxLength={17} 
                      value={newContact} 
                      onChange={(e) => {
                        setNewContact(formatPhilippineContactNumber(e.target.value));
                        setFormErrors(prev => ({ ...prev, contact: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.contact && <p className="fieldError">{formErrors.contact}</p>}
                </div>
              </div>
              
              {/* Right Column */}
              <div className="formColumn">
                <div className="formGroup">
                  <label>E-Mail</label>
                  <div className="inputWithIcon">
                    <IoMailOutline className="fieldIcon" size={17} />
                    <input type="email" placeholder="Enter E-Mail" maxLength={60} value={newEmail} onChange={(e) => {
                      setNewEmail(e.target.value);
                      setFormErrors(prev => ({ ...prev, email: undefined }));
                    }} className="formInput" />
                  </div>
                  {formErrors.email && <p className="fieldError">{formErrors.email}</p>}
                </div>
                <div className="formGroup">
                  <label>Role</label>
                  <div className="inputWithIcon">
                    <IoBriefcaseOutline className="fieldIcon" size={17} />
                    <select value={newRole} onChange={(e) => {
                      const nextRole = e.target.value as Role;
                      setNewRole(nextRole);
                      setNewBranchId((current) => (
                        nextRole === 'Admin'
                          ? (current || BOTH_BRANCHES_VALUE)
                          : (isBothBranchesSelected(current) ? '' : current)
                      ));
                      setFormErrors(prev => ({ ...prev, role: undefined }));
                    }} className="formSelect">
                      <option value="Admin">Admin</option>
                      <option value="Veterinarian">Veterinarian</option>
                      <option value="Clinic Staff">Clinic Staff</option>
                    </select>
                  </div>
                  {formErrors.role && <p className="fieldError">{formErrors.role}</p>}
                </div>
                <div className="formGroup">
                  <label>Branch</label>
                  <div className="inputWithIcon">
                    <IoLocationOutline className="fieldIcon" size={17} />
                    <select value={newBranchId} onChange={(e) => {
                      setNewBranchId(e.target.value);
                      setFormErrors(prev => ({ ...prev, branch: undefined }));
                    }} className="formSelect">
                      <option value="">Select Branch</option>
                      {newRole === 'Admin' && <option value={BOTH_BRANCHES_VALUE}>Both Branches</option>}
                      {branches.map(branch => (
                        isBothBranchesBranch(branch) ? null : (
                          <option key={branch.branch_id} value={branch.branch_id}>{getShortBranchLabel(branch.branch_name)}</option>
                        )
                      ))}
                    </select>
                  </div>
                  {formErrors.branch && <p className="fieldError">{formErrors.branch}</p>}
                </div>
              </div>
              
            </div>
            <div className="modalFooter accountModalFooter">
              <button className="cancelBtn" onClick={() => handleCancel('create')}>Cancel</button>
              <button className="submitBtn gradientBtn" onClick={handleSavePress}>Create Account</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {editAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer accountProfileModal">
            <div className="modalHeader accountModalHeader">
              <div>
                <h2>Edit Employee Account</h2>
                <p>Update staff details, role assignment, and account status.</p>
              </div>
              <button className="accountModalClose" onClick={() => handleCancel('edit')} aria-label="Close edit employee modal">
                <IoCloseCircleSharp size={22} />
              </button>
            </div>
            <div className="imageUploadSection" style={getBranchPanelStyle(newBranchId)}>
              <div className="accountVisualPanelContent">
                <div className="accountPoweredBy">
                  <span>Powered by</span>
                  <img src={pawRangLogomarkWhite} alt="PawRang" />
                </div>
                <div className="accountVisualTitle">PetShield Veterinary Clinic &amp; Grooming Services</div>
              </div>
            </div>
            <div className="modalForm">
              <div className="formGroup accountPhotoGroup">
                <label>Employee Photo</label>
                <div className="accountAvatarField">
                  <button className="uploadBtn" onClick={pickImage}>
                    {userImage ? (
                      <img src={userImage} alt="User" className="uploadedImage" />
                    ) : (
                      <div className="uploadPlaceholder">
                        <IoImageOutline size={16} />
                        <span>Upload</span>
                      </div>
                    )}
                    <div className="cameraIcon">
                      <IoCamera size={13} />
                    </div>
                  </button>
                  <div>
                    <h3>Profile Photo</h3>
                    <p>Optional staff image.</p>
                  </div>
                </div>
              </div>
              <div className="formColumn">
                <div className="formGroup">
                  <label>Username</label>
                  <div className="inputWithIcon">
                    <IoPersonOutline className="fieldIcon" size={17} />
                    <input type="text" placeholder="Enter Username" maxLength={30} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="formInput" />
                  </div>
                </div>

                <div className="formGroup">
                  <label>First Name</label>
                  <div className="inputWithIcon">
                    <IoPersonOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="Enter First Name" 
                      maxLength={30} 
                      value={newFirstName} 
                      onChange={(e) => {
                        setNewFirstName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''));
                        setFormErrors(prev => ({ ...prev, firstName: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.firstName && <p className="fieldError">{formErrors.firstName}</p>}
                </div>
                <div className="formGroup">
                  <label>Last Name</label>
                  <div className="inputWithIcon">
                    <IoPersonOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="Enter Last Name" 
                      maxLength={30} 
                      value={newLastName} 
                      onChange={(e) => {
                        setNewLastName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''));
                        setFormErrors(prev => ({ ...prev, lastName: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.lastName && <p className="fieldError">{formErrors.lastName}</p>}
                </div>

              </div>
              
              <div className="formColumn">
                <div className="formGroup">
                  <label>Contact Number</label>
                  <div className="inputWithIcon">
                    <IoCallOutline className="fieldIcon" size={17} />
                    <input 
                      type="text" 
                      placeholder="+63 912 345 6789" 
                      maxLength={17} 
                      value={newContact} 
                      onChange={(e) => {
                        setNewContact(formatPhilippineContactNumber(e.target.value));
                        setFormErrors(prev => ({ ...prev, contact: undefined }));
                      }} 
                      className="formInput" 
                    />
                  </div>
                  {formErrors.contact && <p className="fieldError">{formErrors.contact}</p>}
                </div>
                <div className="formGroup">
                  <label>E-Mail</label>
                  <div className="inputWithIcon">
                    <IoMailOutline className="fieldIcon" size={17} />
                    <input type="email" placeholder="Enter E-Mail" maxLength={60} value={newEmail} onChange={(e) => {
                      setNewEmail(e.target.value);
                      setFormErrors(prev => ({ ...prev, email: undefined }));
                    }} className="formInput" />
                  </div>
                  {formErrors.email && <p className="fieldError">{formErrors.email}</p>}
                </div>
                <div className="formGroup">
                  <label>Role</label>
                  <div className="inputWithIcon">
                    <IoBriefcaseOutline className="fieldIcon" size={17} />
                    <select value={newRole} onChange={(e) => {
                      const nextRole = e.target.value as Role;
                      setNewRole(nextRole);
                      setNewBranchId((current) => (
                        nextRole === 'Admin'
                          ? (current || BOTH_BRANCHES_VALUE)
                          : (isBothBranchesSelected(current) ? '' : current)
                      ));
                      setFormErrors(prev => ({ ...prev, role: undefined }));
                    }} className="formSelect">
                      <option value="Admin">Admin</option>
                      <option value="Veterinarian">Veterinarian</option>
                      <option value="Clinic Staff">Clinic Staff</option>
                    </select>
                  </div>
                  {formErrors.role && <p className="fieldError">{formErrors.role}</p>}
                </div>
                <div className="formGroup">
                  <label>Branch</label>
                  <div className="inputWithIcon">
                    <IoLocationOutline className="fieldIcon" size={17} />
                    <select value={newBranchId} onChange={(e) => {
                      setNewBranchId(e.target.value);
                      setFormErrors(prev => ({ ...prev, branch: undefined }));
                    }} className="formSelect">
                      <option value="">Select Branch</option>
                      {newRole === 'Admin' && <option value={BOTH_BRANCHES_VALUE}>Both Branches</option>}
                      {branches.map(branch => (
                        isBothBranchesBranch(branch) ? null : (
                          <option key={branch.branch_id} value={branch.branch_id}>{getShortBranchLabel(branch.branch_name)}</option>
                        )
                      ))}
                    </select>
                  </div>
                  {formErrors.branch && <p className="fieldError">{formErrors.branch}</p>}
                </div>
                <div className="formGroup">
                  <label>Account Status</label>
                  <div className="statusToggle">
                    <label className="switch">
                      <input type="checkbox" checked={newStatus === 'Active'} onChange={(e) => handleStatusToggle(e.target.checked)} />
                      <span className="slider"></span>
                    </label>
                    <span className={newStatus === 'Active' ? 'statusActive' : 'statusInactive'}>{newStatus}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modalFooter accountModalFooter">
              <button className="cancelBtn" onClick={() => handleCancel('edit')}>Cancel</button>
              <button className="submitBtn gradientBtn" onClick={handleUpdateAccount}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ACCOUNT MODAL */}
      {/* VIEW ACCOUNT MODAL */}
      {viewAccountVisible && (
        <div className="modalOverlay" onClick={() => setViewAccountVisible(false)}>
          <div className="modalContainer accountProfileModal accountViewModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader accountModalHeader">
              <div>
                <h2>Employee Account Details</h2>
                <p>Review staff identity, contact, and access status.</p>
              </div>
              <button className="accountModalClose" onClick={() => setViewAccountVisible(false)} aria-label="Close employee details modal">
                <IoCloseCircleSharp size={22} />
              </button>
            </div>
            
            <div
              className="imageUploadSection"
              style={getBranchPanelStyle(
                (selectedAccount as User).branch_id,
                getBranchLabelForUser(selectedAccount as User)
              )}
            >
              <div className="accountVisualPanelContent">
                <div className="accountPoweredBy">
                  <span>Powered by</span>
                  <img src={pawRangLogomarkWhite} alt="PawRang" />
                </div>
                <div className="accountVisualTitle">{getBranchLabelForUser(selectedAccount as User)}</div>
              </div>
            </div>

            <div className="modalForm accountDetailGrid">
              <div className="formGroup accountPhotoGroup">
                <label>Employee Photo</label>
                <div className="accountAvatarField">
                  <div className="uploadBtn" style={{ cursor: 'default' }}>
                    {((selectedAccount as User).employee_image) ? (
                      <img
                        src={((selectedAccount as User).employee_image?.startsWith('data:image')
                          ? (selectedAccount as User).employee_image
                          : `data:image/jpeg;base64,${(selectedAccount as User).employee_image}`)}
                        alt="Employee Avatar"
                        className="uploadedImage"
                      />
                    ) : (
                      <div className="uploadPlaceholder">
                        <IoPersonCircleOutline size={46} color="#3d67ee" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3>{`${(selectedAccount as User).first_name || ''} ${(selectedAccount as User).last_name || ''}`.trim() || 'Employee Profile'}</h3>
                    <p>{getEmployeeDisplayRole(selectedAccount as User)}</p>
                  </div>
                </div>
              </div>
              <div className="formColumn">
                <div className="formGroup">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="formInput" 
                    value={`${(selectedAccount as User).first_name || ''} ${(selectedAccount as User).last_name || ''}`.trim()} 
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
                <div className="formGroup">
                  <label>Contact Number</label>
                  <input 
                    type="text" 
                    className="formInput" 
                    value={formatPhilippineContactNumber((selectedAccount as User).contact_number || '') || (selectedAccount as User).contact_number || ''} 
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
                <div className="formGroup">
                  <label>Account Creation Date</label>
                  <input 
                    type="text" 
                    className="formInput" 
                    value={(selectedAccount as User).created_at ? new Date((selectedAccount as User).created_at as string).toLocaleDateString() : 'N/A'} 
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
                <div className="formGroup">
                  <label>Branch</label>
                  <input 
                    type="text" 
                    className="formInput" 
                    value={getEmployeeBranchLabel(selectedAccount as User)}
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
              </div>
              
              <div className="formColumn">
                <div className="formGroup">
                  <label>E-Mail</label>
                  <input 
                    type="email" 
                    className="formInput" 
                    value={(selectedAccount as User).email || ''} 
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
                <div className="formGroup">
                  <label>Role</label>
                  <input 
                    type="text" 
                    className="formInput" 
                    value={getEmployeeDisplayRole(selectedAccount as User)}
                    readOnly 
                    style={{ cursor: 'text' }} 
                  />
                </div>
                <div className="formGroup" style={{ marginTop: '10px' }}>
                  <label style={{ marginBottom: '12px', display: 'block' }}>Status</label>
                  <div className={`statusBadge ${(selectedAccount as User).status === 'Active' ? 'activeBadge' : 'inactiveBadge'}`} style={{ display: 'inline-flex', padding: '6px 16px' }}>
                    <span className={(selectedAccount as User).status === 'Active' ? 'activeText' : ''}>
                      {(selectedAccount as User).status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modalFooter accountModalFooter">
              <button className="cancelBtn" onClick={() => setViewAccountVisible(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED ALERT MODAL */}
      {modalVisible && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={55} color="#d93025" />}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            <h3 className="alertTitle">{modalConfig.title}</h3>
            <div className="alertMessage">{modalConfig.message}</div>
            <div className="alertActions">
              {modalConfig.showCancel && (
                <button onClick={() => setModalVisible(false)} className="alertBtn cancelAlertBtn">Cancel</button>
              )}
              <button 
                onClick={() => { setModalVisible(false); if (modalConfig.onConfirm) modalConfig.onConfirm(); }}
                className={`alertBtn confirmAlertBtn ${modalConfig.type === 'error' ? 'errorBtn' : ''}`}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
