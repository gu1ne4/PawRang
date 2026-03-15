import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import './AdminStyles.css'; // Make sure this path is correct!

// Icons (you can use react-icons or any icon library)
import { 
  IoHomeOutline, 
  IoPeopleOutline, 
  IoPersonOutline, 
  IoMedkitOutline,
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoTodayOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoSearchSharp,
  IoFilterSharp,
  IoCloseCircleSharp,
  IoPersonAdd,
  IoEye,
  IoPencilSharp,
  IoImageOutline,
  IoCamera,
  IoPersonCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoAlertCircleOutline,
  IoChevronUpOutline,
  IoChevronDownOutline
} from 'react-icons/io5';

interface User {
  pk?: number;
  id?: number;
  username: string;
  fullName?: string;
  fullname?: string;
  contactNumber?: string;
  contactnumber?: string;
  employeeID?: string;
  employeeid?: string;
  email: string;
  role: string;
  department?: string;
  departmend?: string;
  status: string;
  userImage?: string;
  userimage?: string;
  dateCreated?: string;
  datecreated?: string;
}

interface CurrentUser {
  id?: number;
  pk?: number;
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

type Role = 'Admin' | 'Veterinarian' | 'Receptionist' | 'User' | 'Moderator';
type Department = 'General Practice' | 'Surgery' | 'Internal Medicine' | 'Dentistry' | 'Administrative Services' | 'Marketing';
type Status = 'Active' | 'Disabled';

const API_URL = 'http://localhost:5000';

const AdminHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/accounts';

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);
  const [searchHovered, setSearchHovered] = useState<boolean>(false);
  const [filterHovered, setFilterHovered] = useState<boolean>(false);

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
  const [department, setDepartment] = useState<string>("defaultDept");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 8;

  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newContact, setNewContact] = useState<string>('');
  const [newEmpID, setNewEmpID] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<Role>('Admin');
  const [newDept, setNewDept] = useState<Department>('Marketing');
  const [newStatus, setNewStatus] = useState<Status>('Active');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null);

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

  // Load current user from localStorage
  const loadCurrentUser = async (): Promise<void> => {
    try {
      const session = localStorage.getItem('userSession');
      if (session) {
        const user = JSON.parse(session);
        console.log('Parsed user data:', user);
        setCurrentUser(user);
      }
    } catch (error) {
      console.log('Error loading user session', error);
    }
  };

  // Fetch accounts
  const fetchAccounts = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/accounts`);
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch account data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    loadCurrentUser();
  }, []);

  const generateRandomPassword = (length: number = 10): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const resetForm = (): void => {
    setNewUsername('');
    setNewFullName('');
    setNewContact('');
    setNewEmpID('');
    setNewEmail('');
    setNewRole('Admin');
    setNewDept('Marketing');
    setNewStatus('Active');
    setUserImage(null);
    setUserImageBase64(null);
    setEditingId(null);
  };

  // Logout Handler
  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      try {
        if (currentUser && (currentUser.id || currentUser.pk)) {
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
        console.log("Logout audit failed:", error);
      }

      localStorage.removeItem('userSession');
      navigate('/login');
    }, true);
  };

  // Cancel Handler
  const handleCancel = (mode: 'create' | 'edit'): void => {
    let hasUnsavedChanges = false;
    if (mode === 'create') {
      hasUnsavedChanges = !!newUsername || !!newFullName || !!newContact || !!newEmpID || !!newEmail || !!userImage;
    } else if (mode === 'edit') {
      const original = accounts.find(a => (a.pk === editingId || a.id === editingId));
      if (original) {
        const orgName = original.fullName || original.fullname || '';
        const orgContact = (original.contactNumber || original.contactnumber || '').toString();
        const orgEmpID = (original.employeeID || original.employeeid || '').toString();
        
        if (
          newUsername !== original.username ||
          newFullName !== orgName ||
          newContact !== orgContact ||
          newEmpID !== orgEmpID ||
          newEmail !== original.email ||
          userImage !== (original.userImage || original.userimage)
        ) {
          hasUnsavedChanges = true;
        }
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

  // Image Picker (simplified for web)
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
          setUserImageBase64(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Open Edit Modal
  const openEditModal = (user: User): void => {
    setEditingId(user.pk || user.id || null);
    setNewUsername(user.username || '');
    setNewFullName(user.fullName || user.fullname || '');
    setNewContact((user.contactNumber || user.contactnumber || '').toString());
    setNewEmpID((user.employeeID || user.employeeid || '').toString());
    setNewEmail(user.email || '');

    const validRoles: Role[] = ['Admin', 'User', 'Moderator', 'Veterinarian', 'Receptionist'];
    const dbRole = user.role || 'Admin';
    const matchedRole = validRoles.find(r => r.toLowerCase() === dbRole.toLowerCase()) || 'Admin';
    setNewRole(matchedRole as Role);

    setNewDept((user.department || user.departmend || 'Marketing') as Department);
    setNewStatus((user.status || 'Active') as Status);

    const img = user.userImage || user.userimage;
    setUserImage(img || null);
    setUserImageBase64(null);

    setEditAccountVisible(true);
  };

  // View Details
  const handleViewDetails = (user: User): void => {
    setSelectedAccount(user);
    setViewAccountVisible(true);
  };

  // Create Account
  const handleSavePress = async (): Promise<void> => {
    // Validation
    if (!newUsername || !newFullName || !newContact || !newEmpID || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (newUsername.length < 4) {
      showAlert('error', 'Invalid Input', 'Username must be at least 4 characters.');
      return;
    }
    if (newFullName.length < 5) {
      showAlert('error', 'Invalid Input', 'Full Name must be at least 5 characters.');
      return;
    }
    if (newContact.length < 13) {
      showAlert('error', 'Invalid Input', 'Contact Number must be valid (0000-000-0000).');
      return;
    }
    if (newEmpID.length < 5) {
      showAlert('error', 'Invalid Input', 'Employee ID must be at least 5 digits.');
      return;
    }
    if (newEmail.length < 6) {
      showAlert('error', 'Invalid Input', 'Email must be at least 6 characters.');
      return;
    }

    // Email uniqueness
    const emailExists = accounts.some(acc => 
      (acc.email || '').toLowerCase() === newEmail.trim().toLowerCase()
    );
    
    if (emailExists) {
      showAlert('error', 'Email In Use', 'This email address is already associated with another account.');
      return;
    }

    // Duplicate check
    const isDuplicate = accounts.some(acc => {
      const accUsername = acc.username || '';
      const accEmployeeID = String(acc.employeeID || acc.employeeid || '');
      
      return (
        accUsername.toLowerCase() === newUsername.toLowerCase() ||
        accEmployeeID === newEmpID.toString()
      );
    });
    
    if (isDuplicate) {
      showAlert('error', 'Duplicate Entry', 'Username or Employee ID already exists.');
      return;
    }

    // Confirmation & API call
    showAlert('confirm', 'Create Account', 'Are you sure you want to register this new account?', async () => {
      const today = new Date();
      const dateCreated = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      const generatedPassword = generateRandomPassword();

      try {
        const res = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: newUsername,
            password: generatedPassword,
            fullname: newFullName,
            contactnumber: newContact,
            email: newEmail,
            role: newRole,
            department: newDept,
            employeeid: newEmpID,
            userImage: userImageBase64,
            status: newStatus,
            dateCreated: dateCreated
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setAddAccountVisible(false);
          showAlert('success', 'Success', 'Account Registered Successfully!', () => {
            fetchAccounts();
            resetForm();
          });
        } else {
          const errorMessage = (data.error && data.error.includes('Email')) 
            ? 'This email address is already in use.' 
            : (data.error || 'Failed to create account.');
          
          showAlert('error', 'Registration Failed', errorMessage);
        }
      } catch (error) {
        showAlert('error', 'Network Error', 'Could not connect to the server.');
      }
    }, true);
  };

  // Update Account
  const handleUpdateAccount = async (): Promise<void> => {
    // Validation
    if (newUsername.length < 4) {
      showAlert('error', 'Invalid Input', 'Username must be at least 4 characters.');
      return;
    }
    if (newFullName.length < 5) {
      showAlert('error', 'Invalid Input', 'Full Name must be at least 5 characters.');
      return;
    }
    if (newContact.length < 13) {
      showAlert('error', 'Invalid Input', 'Contact Number must be valid (0000-000-0000).');
      return;
    }
    if (newEmpID.length < 5) {
      showAlert('error', 'Invalid Input', 'Employee ID must be at least 5 digits.');
      return;
    }
    if (newEmail.length < 6) {
      showAlert('error', 'Invalid Input', 'Email must be at least 6 characters.');
      return;
    }

    // Duplicate check
    const isDuplicate = accounts.some(acc => 
      (acc.pk !== editingId && acc.id !== editingId) && 
      (
        (acc.username || '').toLowerCase() === (newUsername || '').toLowerCase() || 
        String(acc.employeeID || acc.employeeid || '') === String(newEmpID || '')
      )
    );

    if (isDuplicate) {
      showAlert('error', 'Duplicate Entry', 'Username or Employee ID already exists.');
      return;
    }

    // Confirmation
    showAlert('confirm', 'Save Changes', 'Are you sure you want to save changes to this account?', async () => {
      try {
        const res = await fetch(`${API_URL}/accounts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: newUsername,
            fullname: newFullName,
            contactnumber: newContact,
            email: newEmail,
            role: newRole,
            department: newDept,
            employeeid: newEmpID,
            status: newStatus,
            userImage: userImageBase64
          }),
        });

        if (res.ok) {
          setEditAccountVisible(false);
          showAlert('success', 'Success', 'Account Updated Successfully!', () => {
            fetchAccounts();
            resetForm();
          });
        } else {
          showAlert('error', 'Update Failed', 'Failed to update account information.');
        }
      } catch (error) {
        showAlert('error', 'Network Error', 'Could not connect to the server.');
      }
    }, true);
  };

  // Filter Logic
  const noMatchFilters = status === "defaultStatus" && role === "defaultRole" && department === "defaultDept";

  const filteredUsers = accounts.filter(user => {
    const uName = (user.fullName || user.fullname || user.username || '').toLowerCase();
    const uEmail = (user.email || '').toLowerCase();
    const uDept = (user.department || user.departmend || '').toLowerCase();
    const uStatus = user.status || 'Active';
    const uRole = user.role || '';

    const matchesSearch = uName.includes(searchQuery.toLowerCase()) || uEmail.includes(searchQuery.toLowerCase());

    const matchesStatus = status !== "defaultStatus" ? uStatus === status : true;
    const matchesRole = role !== "defaultRole" ? uRole === role : true;
    const matchesDept = department !== "defaultDept" ? uDept.includes(department.toLowerCase()) : true;

    return matchesSearch && matchesStatus && matchesRole && matchesDept;
  });

  // Pagination
  const paginatedUsers = filteredUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="biContainer">
        <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      {/* Body */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer" style={{paddingLeft: '30px'}}>
            <IoPeopleOutline size={23} className="blueIcon" />
            <span className="blueText">Account Overview / Employees</span>
          </div>
          <div className="subTopContainer notificationContainer">
            <button className="iconButton" onClick={fetchAccounts}>
              <IoPeopleOutline size={21} className="blueIcon" />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="tableContainer">
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
                    <option value="Receptionist">Receptionist</option>
                  </select>

                  <select 
                    value={department} 
                    onChange={(e) => {setDepartment(e.target.value); setPage(0);}}
                    className="filterSelect wide"
                  >
                    <option value="defaultDept">Department</option>
                    <option value="General Practice">General Practice</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Administrative Services">Administrative Services</option>
                  </select>

                  <button
                    onClick={() => {
                      setStatus("defaultStatus");
                      setRole("defaultRole");
                      setDepartment("defaultDept");
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
                    <th style={{flex: 2}}>Department</th>
                    <th style={{flex: 2}}>Contact Number</th>
                    <th style={{flex: 2.5}}>E-Mail</th>
                    <th style={{flex: 1.5}}>Status</th>
                    <th style={{flex: 1}}>View Details</th>
                    <th style={{flex: 1}}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map(user => {
                      const uStatus = user.status || 'Active';
                      const uImage = user.userImage || user.userimage;
                      const uName = user.username;
                      const uContact = user.contactNumber || user.contactnumber;
                      const uDept = user.department || user.departmend;

                      return (
                        <tr key={user.pk || user.id || Math.random()}>
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
                          <td>{user.role}</td>
                          <td>{uDept}</td>
                          <td>{uContact}</td>
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

              <div className="pagination">
                <button 
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="paginationBtn"
                >
                  Previous
                </button>
                <span className="paginationInfo">{page + 1} of {totalPages}</span>
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

      {/* Add Account Modal */}
      {addAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer">
            <div className="modalHeader">
              <h2>Create Account</h2>
            </div>

            {/* Upload Image */}
            <div className="imageUploadSection">
              <button className="uploadBtn" onClick={pickImage}>
                {userImage ? (
                  <img src={userImage} alt="User" className="uploadedImage" />
                ) : (
                  <div className="uploadPlaceholder">
                    <IoImageOutline size={18} />
                    <span>Upload Image</span>
                  </div>
                )}
                <div className="cameraIcon">
                  <IoCamera size={16} />
                </div>
              </button>
            </div>

            {/* Form */}
            <div className="modalForm">
              <div className="formColumn">
                <div className="formGroup">
                  <label>Username</label>
                  <input 
                    type="text"
                    placeholder="Enter Username"
                    maxLength={30}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Full Name</label>
                  <input 
                    type="text"
                    placeholder="Enter Full Name"
                    maxLength={60}
                    value={newFullName}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z ,.'-]/g, '');
                      setNewFullName(cleaned);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Contact Number</label>
                  <input 
                    type="text"
                    placeholder="0000-000-0000"
                    maxLength={13}
                    value={newContact}
                    onChange={(e) => {
                      let cleaned = e.target.value.replace(/\D/g, '');
                      if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);

                      let formatted = cleaned;
                      if (cleaned.length > 4) {
                        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                      }
                      if (cleaned.length > 7) {
                        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
                      }
                      
                      setNewContact(formatted);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Employee ID</label>
                  <input 
                    type="text"
                    placeholder="Enter Employee ID"
                    maxLength={15}
                    value={newEmpID}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      setNewEmpID(cleaned);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <button 
                    className="cancelBtn"
                    onClick={() => handleCancel('create')}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="formColumn">
                <div className="formGroup">
                  <label>E-Mail</label>
                  <input 
                    type="email"
                    placeholder="Enter E-Mail"
                    maxLength={60}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Role</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="formSelect"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Department</label>
                  <select 
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as Department)}
                    className="formSelect"
                  >
                    <option value="General Practice">General Practice</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Administrative Services">Administrative Services</option>
                  </select>
                </div>

                <div className="formGroup">
                  <button 
                    className="submitBtn gradientBtn"
                    onClick={handleSavePress}
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer">
            <div className="modalHeader">
              <h2>Edit Account</h2>
            </div>

            {/* Upload Image */}
            <div className="imageUploadSection">
              <button className="uploadBtn" onClick={pickImage}>
                {userImage ? (
                  <img src={userImage} alt="User" className="uploadedImage" />
                ) : (
                  <div className="uploadPlaceholder">
                    <IoImageOutline size={18} />
                    <span>Upload Image</span>
                  </div>
                )}
                <div className="cameraIcon">
                  <IoCamera size={16} />
                </div>
              </button>
            </div>

            {/* Form */}
            <div className="modalForm">
              <div className="formColumn">
                <div className="formGroup">
                  <label>Username</label>
                  <input 
                    type="text"
                    placeholder="Enter Username"
                    maxLength={30}
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Full Name</label>
                  <input 
                    type="text"
                    placeholder="Enter Full Name"
                    maxLength={60}
                    value={newFullName}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z ,.'-]/g, '');
                      setNewFullName(cleaned);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Contact Number</label>
                  <input 
                    type="text"
                    placeholder="0000-000-0000"
                    maxLength={13}
                    value={newContact}
                    onChange={(e) => {
                      let cleaned = e.target.value.replace(/\D/g, '');
                      if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);

                      let formatted = cleaned;
                      if (cleaned.length > 4) {
                        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                      }
                      if (cleaned.length > 7) {
                        formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
                      }
                      
                      setNewContact(formatted);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Employee ID</label>
                  <input 
                    type="text"
                    placeholder="Enter Employee ID"
                    maxLength={15}
                    value={newEmpID}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      setNewEmpID(cleaned);
                    }}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <button 
                    className="cancelBtn"
                    onClick={() => handleCancel('edit')}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="formColumn">
                <div className="formGroup">
                  <label>E-Mail</label>
                  <input 
                    type="email"
                    placeholder="Enter E-Mail"
                    maxLength={60}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="formInput"
                  />
                </div>

                <div className="formGroup">
                  <label>Role</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="formSelect"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Department</label>
                  <select 
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as Department)}
                    className="formSelect"
                  >
                    <option value="General Practice">General Practice</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Administrative Services">Administrative Services</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Account Status</label>
                  <div className="statusToggle">
                    <label className="switch">
                      <input 
                        type="checkbox"
                        checked={newStatus === 'Active'}
                        onChange={(e) => handleStatusToggle(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={newStatus === 'Active' ? 'statusActive' : 'statusInactive'}>
                      {newStatus}
                    </span>
                  </div>
                </div>

                <div className="formGroup">
                  <button 
                    className="submitBtn gradientBtn"
                    onClick={handleUpdateAccount}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Account Modal */}
      {viewAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer">
            <div className="modalHeader">
              <h2>Account Details</h2>
            </div>

            {/* Profile Image */}
            <div className="imageUploadSection">
              {(selectedAccount as User).userImage || (selectedAccount as User).userimage ? (
                <img 
                  src={(selectedAccount as User).userImage || (selectedAccount as User).userimage} 
                  alt="User"
                  className="viewAvatar"
                />
              ) : (
                <IoPersonCircleOutline size={100} className="blueIcon" />
              )}
            </div>

            {/* Details */}
            <div className="modalForm">
              <div className="formColumn">
                <div className="detailGroup">
                  <label>Full Name</label>
                  <div className="detailValue">{(selectedAccount as User).fullName || (selectedAccount as User).fullname}</div>
                </div>

                <div className="detailGroup">
                  <label>Contact Number</label>
                  <div className="detailValue">{(selectedAccount as User).contactNumber || (selectedAccount as User).contactnumber}</div>
                </div>

                <div className="detailGroup">
                  <label>Employee ID</label>
                  <div className="detailValue">{(selectedAccount as User).employeeID || (selectedAccount as User).employeeid}</div>
                </div>

                <div className="detailGroup">
                  <label>Account Creation Date</label>
                  <div className="detailValue">{(selectedAccount as User).dateCreated || (selectedAccount as User).datecreated || 'N/A'}</div>
                </div>
              </div>

              <div className="formColumn">
                <div className="detailGroup">
                  <label>E-Mail</label>
                  <div className="detailValue">{(selectedAccount as User).email}</div>
                </div>

                <div className="detailGroup">
                  <label>Role</label>
                  <div className="detailValue">{(selectedAccount as User).role}</div>
                </div>

                <div className="detailGroup">
                  <label>Department</label>
                  <div className="detailValue">{(selectedAccount as User).department || (selectedAccount as User).departmend}</div>
                </div>

                <div className="detailGroup">
                  <label>Status</label>
                  <div className={`statusBadge ${(selectedAccount as User).status === 'Active' ? 'activeBadge' : 'inactiveBadge'}`}>
                    <span className={(selectedAccount as User).status === 'Active' ? 'activeText' : ''}>
                      {(selectedAccount as User).status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="modalFooter">
              <button 
                className="cancelBtn wide"
                onClick={() => setViewAccountVisible(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Alert Modal */}
      {modalVisible && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertIcon">
              {modalConfig.type === 'success' && <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />}
              {modalConfig.type === 'error' && <IoCloseCircleOutline size={55} color="#d93025" />}
              {modalConfig.type !== 'success' && modalConfig.type !== 'error' && <IoAlertCircleOutline size={55} color="#3d67ee" />}
            </div>
            
            <h3 className="alertTitle">{modalConfig.title}</h3>
            
            <div className="alertMessage">
              {typeof modalConfig.message === 'string' ? modalConfig.message : modalConfig.message}
            </div>
            
            <div className="alertActions">
              {modalConfig.showCancel && (
                <button 
                  onClick={() => setModalVisible(false)}
                  className="alertBtn cancelAlertBtn"
                >
                  Cancel
                </button>
              )}
              
              <button 
                onClick={() => {
                  setModalVisible(false);
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
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