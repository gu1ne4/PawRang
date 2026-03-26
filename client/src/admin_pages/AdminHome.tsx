import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../reusable_components/NavBar';
import { supabase } from '../supabaseClient'; 
import { createClient } from '@supabase/supabase-js';

// Icons
import './AdminStyles.css'; 
import { MdNotificationsNone } from "react-icons/md";

import { 
  IoPeopleOutline, 
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
} from 'react-icons/io5';

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

type Role = 'Admin' | 'Veterinarian' | 'Receptionist' | 'Moderator';
type Status = 'Active' | 'Disabled';

const AdminHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI State
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Pagination
  const [page, setPage] = useState<number>(0);
  const itemsPerPage = 8;

  // Form States 
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [newUsername, setNewUsername] = useState<string>(''); // Kept for Edit Modal
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newContact, setNewContact] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<Role>('Admin');
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
      const { data, error } = await supabase
        .from('employee_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
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

  const generateRandomPassword = (length: number = 12): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const resetForm = (): void => {
    setNewUsername('');
    setNewFirstName('');
    setNewLastName('');
    setNewContact('');
    setNewEmail('');
    setNewRole('Admin');
    setNewStatus('Active');
    setUserImage(null);
    setUserImageBase64(null);
    setEditingId(null);
  };

  const handleLogoutPress = (): void => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      await supabase.auth.signOut();
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
          newContact !== (originalUser.contact_number || '') ||
          newEmail !== (originalUser.email || '') ||
          newRole !== (originalUser.role || 'Admin') ||
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
    setNewContact(user.contact_number || '');
    setNewEmail(user.email || '');
    setNewRole((user.role as Role) || 'Admin');
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

  // CREATE ACCOUNT LOGIC (Updated for Dummy Username)
  const handleSavePress = async (): Promise<void> => {
    // Removed newUsername validation
    if (!newFirstName || !newLastName || !newContact || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill in all required fields.');
      return;
    }

    showAlert('confirm', 'Create Account', 'Are you sure you want to register this new employee?', async () => {
      
      // Auto-generate a dummy password and username
      const generatedPassword = generateRandomPassword();
      const dummyUsername = `temp_${newFirstName.toLowerCase()}${Math.floor(Math.random() * 10000)}`;
      
      try {
        const supabaseAdminAuth = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
          email: newEmail,
          password: generatedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/update-account` 
          }
        });

        if (authError) throw authError;

        const { error: dbError } = await supabase
          .from('employee_accounts')
          .insert([{
            id: authData.user?.id, 
            username: dummyUsername, // Saving the dummy username
            first_name: newFirstName.trim(), 
            last_name: newLastName.trim(),   
            contact_number: newContact,
            email: newEmail,
            role: newRole,
            status: newStatus,
            employee_image: userImageBase64,
            is_initial_login: true
          }]);

        if (dbError) throw dbError;

        setAddAccountVisible(false);
        showAlert('success', 'Success', 'Account Created! A setup link has been emailed to the employee to configure their username and password.', () => {
          fetchAccounts();
          resetForm();
        });

      } catch (error: any) {
        showAlert('error', 'Registration Failed', error.message || 'Failed to create account.');
      }
    }, true);
  };

  // UPDATE ACCOUNT LOGIC
  const handleUpdateAccount = async (): Promise<void> => {
    if (!newUsername || !newFirstName || !newLastName || !newContact || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill in all required fields.');
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
          status: newStatus,
        };

        if (userImageBase64) {
          updateData.employee_image = userImageBase64;
        }

        const { error } = await supabase
          .from('employee_accounts')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;

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

  const noMatchFilters = status === "defaultStatus" && role === "defaultRole";

  const filteredUsers = accounts.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const uName = (user.username || fullName).toLowerCase();
    const uEmail = (user.email || '').toLowerCase();
    const uStatus = user.status || 'Active';
    const uRole = user.role || '';

    const matchesSearch = uName.includes(searchQuery.toLowerCase()) || uEmail.includes(searchQuery.toLowerCase());
    const matchesStatus = status !== "defaultStatus" ? uStatus === status : true;
    const matchesRole = role !== "defaultRole" ? uRole === role : true;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="biContainer">
        <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer" style={{paddingLeft: '30px'}}>
            <IoPeopleOutline size={23} className="blueIcon" />
            <span className="blueText">Account Overview / Employees</span>
          </div>
          <div className="subTopContainer notificationContainer" style={{padding: 17}}>
            <button className="iconButton" onClick={fetchAccounts}>
              <MdNotificationsNone size={25} className="blueIcon" />
            </button>
          </div>
        </div>

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

                  <button
                    onClick={() => {
                      setStatus("defaultStatus");
                      setRole("defaultRole");
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
                          <td>{user.role}</td>
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
                      <td colSpan={7} className="noData">
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
                <span className="paginationInfo">{page + 1} of {totalPages === 0 ? 1 : totalPages}</span>
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
          <div className="modalContainer">
            <div className="modalHeader">
              <h2>Create Account</h2>
            </div>
            <div className="imageUploadSection">
              <button className="uploadBtn" onClick={pickImage}>
                {userImage ? (
                  <img src={userImage} alt="User" className="uploadedImage" />
                ) : (
                  <div className="uploadPlaceholder">
                    <IoImageOutline size={18} color='#3d67ee'/>
                    <span>Upload Image</span>
                  </div>
                )}
                <div className="cameraIcon">
                  <IoCamera size={16} />
                </div>
              </button>
            </div>
            <div className="modalForm">
              
              {/* Left Column */}
              <div className="formColumn">
                <div className="formGroup">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter First Name" 
                    maxLength={30} 
                    value={newFirstName} 
                    onChange={(e) => setNewFirstName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                    className="formInput" 
                  />
                </div>
                <div className="formGroup">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter Last Name" 
                    maxLength={30} 
                    value={newLastName} 
                    onChange={(e) => setNewLastName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
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
                      if (cleaned.length > 4) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                      if (cleaned.length > 7) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
                      setNewContact(formatted);
                    }} 
                    className="formInput" 
                  />
                </div>
              </div>
              
              {/* Right Column */}
              <div className="formColumn">
                <div className="formGroup">
                  <label>E-Mail</label>
                  <input type="email" placeholder="Enter E-Mail" maxLength={60} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="formInput" />
                </div>
                <div className="formGroup">
                  <label>Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="formSelect">
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>
                <div className="formGroup">
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="cancelBtn" onClick={() => handleCancel('create')} style={{ flex: 1 }}>Cancel</button>
                    <button className="submitBtn gradientBtn" onClick={handleSavePress} style={{ flex: 1 }}>Create Account</button>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {editAccountVisible && (
        <div className="modalOverlay">
          <div className="modalContainer">
            <div className="modalHeader">
              <h2>Edit Account</h2>
            </div>
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
            <div className="modalForm">
              <div className="formColumn">
                <div className="formGroup">
                  <label>Username</label>
                  <input type="text" placeholder="Enter Username" maxLength={30} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="formInput" />
                </div>

                <div className="formGroup">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter First Name" 
                    maxLength={30} 
                    value={newFirstName} 
                    onChange={(e) => setNewFirstName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                    className="formInput" 
                  />
                </div>
                <div className="formGroup">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter Last Name" 
                    maxLength={30} 
                    value={newLastName} 
                    onChange={(e) => setNewLastName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                    className="formInput" 
                  />
                </div>

                <div className="formGroup">
                  <button className="cancelBtn" onClick={() => handleCancel('edit')}>Cancel</button>
                </div>
              </div>
              
              <div className="formColumn">
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
                      if (cleaned.length > 4) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                      if (cleaned.length > 7) formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
                      setNewContact(formatted);
                    }} 
                    className="formInput" 
                  />
                </div>
                <div className="formGroup">
                  <label>E-Mail</label>
                  <input type="email" placeholder="Enter E-Mail" maxLength={60} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="formInput" />
                </div>
                <div className="formGroup">
                  <label>Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="formSelect">
                    <option value="Admin">Admin</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
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
                <div className="formGroup">
                  <button className="submitBtn gradientBtn" onClick={handleUpdateAccount}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ACCOUNT MODAL */}
      {/* VIEW ACCOUNT MODAL */}
      {viewAccountVisible && (
        <div className="modalOverlay" onClick={() => setViewAccountVisible(false)}>
          <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Account Details</h2>
            </div>
            
            <div className="imageUploadSection">
              <div className="uploadBtn" style={{ cursor: 'default', border: 'none', background: 'transparent' }}>
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
                    <IoPersonCircleOutline size={90} color="#3d67ee" style={{ margin: '-10px' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="modalForm">
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
                    value={(selectedAccount as User).contact_number || ''} 
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
                    value={(selectedAccount as User).role || ''} 
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
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
              <button className="cancelBtn" style={{ width: '100%', maxWidth: '200px' }} onClick={() => setViewAccountVisible(false)}>
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