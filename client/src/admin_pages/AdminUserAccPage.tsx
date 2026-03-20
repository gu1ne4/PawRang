import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Supabase imports
import { supabase } from '../supabaseClient'; 
import { createClient } from '@supabase/supabase-js';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoSearchSharp, IoFilterSharp, IoCloseCircleSharp,
  IoImageOutline, IoCamera, IoEye, IoPersonCircleOutline
} from 'react-icons/io5';

import './AdminStyles.css';

import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';

interface CurrentUser {
  id?: string | number;
  pk?: string | number;
  username?: string;
  fullName?: string;
  role?: string;
  userImage?: string;
}

interface ModalConfigType {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
}

export default function UserAccPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = location.pathname === '/UserAccounts'; 

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [editAccountVisible, setEditAccountVisible] = useState(false);
  const [viewAccountVisible, setViewAccountVisible] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(true); 
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  // Pagination
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;

  // Form Data
  const [editingId, setEditingId] = useState<string | null>(null); // Changed to string for Supabase UUIDs
  const [selectedAccount, setSelectedAccount] = useState<any>({});
  const [newUsername, setNewUsername] = useState(''); 
  const [newFirstName, setNewFirstName] = useState(''); // Split name for DB
  const [newLastName, setNewLastName] = useState('');   // Split name for DB
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStatus, setNewStatus] = useState('Active'); 
  const [userImage, setUserImage] = useState<string | null>(null); 
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null); 
  const [status, setStatus] = useState("defaultStatus");
  
  const [statusToggleAccount, setStatusToggleAccount] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) setCurrentUser(JSON.parse(session));
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, [location.pathname]);

  // ✨ SUPABASE: Fetch Patients
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_account')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error(error);
      showAlert('error', 'Error', error.message || 'Failed to fetch patient data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setNewUsername(''); 
    setNewFirstName(''); 
    setNewLastName(''); 
    setNewContact(''); 
    setNewEmail(''); 
    setNewStatus('Active');
    setUserImage(null); 
    setUserImageBase64(null); 
    setEditingId(null);
  };

  const handleCancel = (mode: 'create' | 'edit') => {
    let hasChanges = false;
    if (mode === 'create') {
      hasChanges = !!(newFirstName || newLastName || newContact || newEmail || userImage);
    } else if (mode === 'edit') {
      const original = accounts.find(a => a.id === editingId);
      if (original) {
        if (newUsername !== original.username || 
            newFirstName !== (original.firstName || '') ||
            newLastName !== (original.lastName || '') ||
            newContact !== (original.contact_number || '') ||
            newEmail !== original.email || 
            newStatus !== original.status) hasChanges = true;
      }
    }

    if (hasChanges) {
      showAlert('confirm', 'Unsaved Changes', 'You have unsaved changes. Are you sure you want to discard them?', () => {
        setAddAccountVisible(false); setEditAccountVisible(false); resetForm();
      }, true);
    } else {
      setAddAccountVisible(false); setEditAccountVisible(false); resetForm();
    }
  };

  const handleStatusToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextStatus = e.target.checked ? 'Active' : 'Inactive';
    const messageJSX = (
      <span>
        Are you sure you want to <strong style={{color: nextStatus === 'Active' ? 'green' : 'red'}}>{nextStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE'}</strong> this account?
      </span>
    );
    showAlert('confirm', 'Confirm Status Change', messageJSX, () => { setNewStatus(nextStatus); }, true);
  };

  const handleStatusToggleFromTable = (account: any, e: React.ChangeEvent<HTMLInputElement>) => {
    // 👇 Change to 'Inactive'
    const nextStatus = e.target.checked ? 'Active' : 'Disabled'; 
    const action = nextStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE';
    const accountName = `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.username;
    
    const messageJSX = (
      <div>
        <p style={{marginBottom: '8px'}}>
          Are you sure you want to <strong style={{color: nextStatus === 'Active' ? 'green' : 'red'}}>{action}</strong> this account?
        </p>
        <p style={{fontStyle: 'italic', color: '#666'}}>Account: {accountName}</p>
      </div>
    );
    
    setStatusToggleAccount({ ...account, newStatus: nextStatus });
    showAlert('confirm', 'Confirm Status Change', messageJSX, () => updateAccountStatus(account.id, nextStatus), true);
  };

  // ✨ SUPABASE: Update Status Quick Toggle
  // ✨ SUPABASE: Update Status Quick Toggle
  const updateAccountStatus = async (accountId: string, newStatus: string) => {
    setTogglingStatus(true);
    try {
      const { error } = await supabase
        .from('patient_account')
        // 👇 THE FIX: Force it to lowercase just for the database!
        .update({ status: newStatus.toLowerCase() }) 
        .eq('id', accountId);
      
      if (error) throw error;
      
      showAlert('success', 'Success', `Account has been ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully!`, () => {
        fetchAccounts(); 
      });
    } catch (error: any) {
      showAlert('error', 'Update Failed', error.message || 'Could not connect to the server.');
    } finally {
      setTogglingStatus(false);
      setStatusToggleAccount(null);
    }
  };

  const handleLogoutPress = () => {
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      await supabase.auth.signOut();
      localStorage.removeItem('userSession'); 
      setCurrentUser(null);
      navigate('/login', { replace: true }); 
    }, true);
  };

  const triggerImagePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        setUserImage(resultString); 
        setUserImageBase64(resultString.split(',')[1]); 
      };
      reader.readAsDataURL(file);
    }
  };

  // ✨ SUPABASE: Create Patient Account
  const handleSaveAccount = async () => {
    if (!newFirstName || !newLastName || !newContact || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill in First Name, Last Name, Contact, and E-Mail.'); return;
    }

    // Auto-generate a dummy password and username
    const generatedPassword = `TempPass${Math.floor(Math.random() * 10000)}!`;
    const dummyUsername = `user_${newFirstName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;

    try {
      // Use Admin Auth so the current Admin doesn't get logged out!
      const supabaseAdminAuth = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Create them in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
        email: newEmail,
        password: generatedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login` // Or wherever they should go
        }
      });

      if (authError) throw authError;

      // Insert their profile details into patient_account
      const { error: dbError } = await supabase
        .from('patient_account')
        .insert([{
          id: authData.user?.id, 
          username: dummyUsername, 
          firstName: newFirstName.trim(), 
          lastName: newLastName.trim(),  
          contact_number: newContact,
          email: newEmail,
          role: 'User',
          status: newStatus,
        }]);

      if (dbError) throw dbError;

      setAddAccountVisible(false);
      showAlert('success', 'Success', 'Patient Account Created! An email has been sent to them.', () => { 
        fetchAccounts(); 
        resetForm(); 
      });

    } catch (e: any) { 
      showAlert('error', 'Failed', e.message || 'Could not connect to the server.'); 
    }
  };

  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setNewUsername(user.username || '');
    setNewFirstName(user.firstName || '');
    setNewLastName(user.lastName || '');
    setNewContact((user.contact_number || '').toString());
    setNewEmail(user.email || '');
    setNewStatus(user.status || 'Active');
    
    // NOTE: If you add image support to patient_accounts, map it here
    setUserImage(null);
    setUserImageBase64(null); 
    setEditAccountVisible(true);
  };

  // ✨ SUPABASE: Update Patient Account
  const handleUpdateAccount = async () => {
    if (!newFirstName || !newLastName || !newContact || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill out all fields.'); return;
    }

    try {
      const { error } = await supabase
        .from('patient_account')
        .update({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          contact_number: newContact,
          email: newEmail,
          status: newStatus
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditAccountVisible(false);
      showAlert('success', 'Success', 'Patient Updated Successfully!', () => { fetchAccounts(); resetForm(); });
      
    } catch (e: any) { 
      showAlert('error', 'Update Failed', e.message || 'Could not connect to the server.'); 
    }
  };

  const handleViewDetails = (user: any) => {
    setSelectedAccount(user);
    setViewAccountVisible(true);
  };

  // ✨ Filtering logic updated for First/Last names
  const filteredUsers = accounts.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const name = (fullName || u.username || '').toLowerCase();
    const mail = (u.email || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || mail.includes(searchQuery.toLowerCase());
    const matchesStatus = status !== "defaultStatus" ? u.status === status : true;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="biContainer">
      
      {/* NAVBAR */}
      <div className="navbarContainer">
        <div className="navBody" style={{ background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)' }}>
          <div className="navTitle" style={{ gap: '10px' }}>
            <img src={logoImg} style={{ width: '25px', height: '25px', marginTop: '1px', objectFit: 'contain' }} alt="Logo" />
            <span className="brandFont">Agsikap</span>
          </div>
          
          <div className="glassContainer" style={{ paddingLeft: '8px' }}>
            <div className="navAccount" style={{ gap: '8px' }}>
              <img 
                src={(currentUser && currentUser.userImage) ? currentUser.userImage : defaultUserImg} 
                style={{ width: '35px', height: '35px', borderRadius: '25px', marginTop: '2px', objectFit: 'cover' }}
                alt="Profile"
              />
              <div>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                  {currentUser ? currentUser.username : "Loading..."}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
                  {currentUser ? currentUser.role : "..."}
                </div>
              </div>
            </div>
          </div>
          
          <span style={{ color: 'rgba(255, 255, 255, 0.83)', fontSize: '11px', fontStyle: 'italic', marginLeft: '5px', marginTop: '20px', display: 'block' }}>Overview</span>
          
          <div className="glassContainer scrollable-nav">
             <div style={{ marginTop: '8px' }}>
              <button className="navBtn" onClick={() => navigate('/Home')}>
                <IoHomeOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Home</span>
              </button>
            </div> 
            
            <div className={isActive ? "selectedGlass" : ""}>
              <button className="navBtn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                <IoPeopleOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Account Overview</span>
                {showAccountDropdown ? 
                  <IoChevronUpOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} /> : 
                  <IoChevronDownOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} />
                }
              </button>
                {showAccountDropdown && (
                <div style={{ marginLeft: '25px', marginTop: '5px' }}>
                    <div>
                    <button className="navBtn" onClick={() => navigate('/Accounts')}>
                        <IoPersonOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Employees</span>
                    </button>
                    </div>
                    <div className={isActive ? "subSelectedGlass" : ""} style={{ width: '100%' }}>
                    <button className="navBtn" onClick={() => navigate('/UserAccounts')}>
                        <IoMedkitOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                        <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Users / Patients</span>
                    </button>
                    </div>
                </div>
                )}
            </div>
            
            <div>
              <button className="navBtn" onClick={() => navigate('/Audit')}>
                <IoDocumentTextOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>System Audit</span>
              </button>
            </div>
            
            <div>
              <button className="navBtn" onClick={() => navigate('/Settings')}>
                <IoSettingsOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Settings</span>
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
            <div className="glassContainer" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <button className="navBtn" onClick={handleLogoutPress} style={{ marginBottom: 0 }}>
                <IoLogOutOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoMedkitOutline size={23} color="#3d67ee" style={{ marginTop: '4px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Account Overview / Patients</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={fetchAccounts}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="tableContainer">
          <div className="tableToolbar">
             <div className="searchFilterSection">
                <div className="toolbarItem" onMouseEnter={() => setSearchHovered(true)} onMouseLeave={() => setSearchHovered(false)}>
                    <button className="iconButton" onClick={() => setSearchVisible(!searchVisible)}>
                      <IoSearchSharp size={25} color={searchVisible ? "#afccf8" : "#3d67ee"} />
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
                
                <div className="toolbarItem" onMouseEnter={() => setFilterHovered(true)} onMouseLeave={() => setFilterHovered(false)}>
                    <button className="iconButton" onClick={() => setFilterVisible(!filterVisible)}>
                      <IoFilterSharp size={25} color={filterVisible ? "#afccf8" : "#3d67ee"} />
                    </button>
                    {filterHovered && <div className="tooltip">Filter</div>}
                </div>

                {filterVisible && (
                   <div className="filterSection">
                       <select 
                         value={status} 
                         className="filterSelect" 
                         onChange={(e) => {setStatus(e.target.value); setPage(0);}}
                       >
                          <option value="defaultStatus" style={{color: '#a8a8a8'}}>Status</option>
                          <option value="Active">Active</option>
                          <option value="Disabled">Disabled</option>
                       </select>
                       <button onClick={() => { setStatus("defaultStatus"); setSearchQuery(""); setPage(0); }} className="clearFilterBtn">
                          <IoCloseCircleSharp size={15} color="#ffffff" style={{ marginTop: '1px' }} />
                          <span>Clear Filters</span>
                       </button>
                   </div>
                )}
             </div>
             <div className="actionSection">
                <button className="blackBtn" onClick={() => setAddAccountVisible(true)}>+ Add Patient</button>
             </div>
          </div>

          {loading ? (
            <div className="loadingContainer"><div className="spinner"></div></div>
          ) : (
            <div className="tableWrapper">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th style={{width: '30%'}}>Name</th>
                    <th style={{textAlign: 'center', width: '20%'}}>Contact Number</th>
                    <th style={{textAlign: 'center', width: '20%'}}>E-Mail</th>
                    <th style={{textAlign: 'center', width: '10%'}}>Status</th>
                    <th style={{textAlign: 'center', width: '10%'}}>View</th>
                    <th style={{textAlign: 'center', width: '10%'}}>Active/Disable</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                      filteredUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map(u => {
                        // Display correct name from the database
                        const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                        
                        return (
                        <tr key={u.id || Math.random()}>
                          <td>
                              <div className="userCell">
                              <img src={defaultUserImg} className="userAvatar" alt="avatar" />
                              <span className="tableFont">{displayName}</span>
                              </div>
                          </td>
                          <td style={{textAlign: 'center'}} className="tableFont">{u.contact_number}</td>
                          <td style={{textAlign: 'center'}} className="tableFont">{u.email}</td>
                          <td style={{textAlign: 'center'}}>
                              <div className={`statusBadge ${u.status?.toLowerCase() === 'active' ? 'activeBadge' : 'inactiveBadge'}`}>
                                  <span className={`statusText ${u.status?.toLowerCase() === 'active' ? 'activeText' : ''}`}>
                                    {/* Capitalizes the first letter */}
                                    {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Active'}
                                  </span>
                              </div>
                          </td>
                          <td style={{textAlign: 'center'}}>
                              <button style={{background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => openEditModal(u)}>
                                <IoEye size={18} color="#3d67ee"/>
                              </button>
                          </td>
                          <td style={{textAlign: 'center'}}>
                            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                              <label className="switch" style={{ margin: 0 }}>
                                <input 
                                  type="checkbox" 
                                  // Fixes the toggle switch so it reads "active" properly
                                  checked={u.status?.toLowerCase() === 'active'} 
                                  onChange={(e) => handleStatusToggleFromTable(u, e)}
                                  disabled={togglingStatus && statusToggleAccount?.id === u.id}
                                />
                                <span className="slider"></span>
                              </label>
                              {togglingStatus && statusToggleAccount?.id === u.id && (
                                <div className="spinner" style={{width: '15px', height: '15px', marginLeft: '5px', borderWidth: '2px'}}></div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})
                ) : (
                  <tr><td colSpan={6} className="noData">No patients found</td></tr>
                )}
                </tbody>
              </table>

              {totalPages > 0 && (
                <div className="pagination">
                  <button className="paginationBtn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>
                  <span className="paginationInfo">Page {page + 1} of {totalPages}</span>
                  <button className="paginationBtn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        onChange={handleImageChange} 
      />

      {/* CREATE PATIENT MODAL */}
      {addAccountVisible && (
        <div className="modalOverlay">
            <div className="modalContainer">
               <div className="modalHeader"><h2>Create Patient Account</h2></div>
               <div className="imageUploadSection">
                  <button onClick={triggerImagePicker} className="uploadBtn">
                     {userImage ? (
                       <img src={userImage} className="uploadedImage" alt="Upload Preview" />
                     ) : (
                       <div className="uploadPlaceholder">
                         <IoImageOutline size={18} color="#3d67ee"/>
                         <span>Upload Image</span>
                       </div>
                     )}
                     <div className="cameraIcon"><IoCamera size={16} /></div>
                  </button>
               </div>
               <div className="modalForm">
                  <div className="formColumn">
                     <div className="formGroup">
                        <label>First Name</label>
                        <input 
                          type="text"
                          className="formInput" 
                          value={newFirstName} 
                          onChange={(e) => setNewFirstName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                          placeholder="Enter First Name" 
                          maxLength={30}
                        />
                     </div>
                     <div className="formGroup">
                        <label>Last Name</label>
                        <input 
                          type="text"
                          className="formInput" 
                          value={newLastName} 
                          onChange={(e) => setNewLastName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                          placeholder="Enter Last Name" 
                          maxLength={30}
                        />
                     </div>
                  </div>
                  <div className="formColumn">
                     <div className="formGroup">
                        <label>Contact Number</label>
                        <input 
                          type="text"
                          className="formInput" 
                          value={newContact} 
                          onChange={(e) => setNewContact(e.target.value.replace(/[^0-9-]/g, ''))} 
                          placeholder="Enter Contact" 
                          maxLength={15} 
                        />
                     </div>
                     <div className="formGroup">
                        <label>E-Mail</label>
                        <input 
                          type="email"
                          className="formInput" 
                          value={newEmail} 
                          onChange={(e) => setNewEmail(e.target.value)} 
                          placeholder="Enter E-mail" 
                          maxLength={60}
                        />
                     </div>
                  </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '15px' }}>
                  <button className="cancelBtn" onClick={() => handleCancel('create')}>Cancel</button>
                  <button className="submitBtn gradientBtn" onClick={handleSaveAccount}>Create Account</button>
               </div>
            </div>
        </div>
      )}

      {/* VIEW PATIENT MODAL */}
      {editAccountVisible && (
        <div className="modalOverlay">
            <div className="modalContainer">
               <div className="modalHeader"><h2>Account Details</h2></div>
               
               <div className="imageUploadSection">
                  <div className="uploadBtn" style={{ cursor: 'default', border: 'none', background: 'transparent' }}>
                     <img 
                       src={userImage ? userImage : defaultUserImg} 
                       className="uploadedImage" 
                       alt="Patient Avatar" 
                       style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }}
                     />
                  </div>
               </div>
               
               <div className="modalForm">
                  <div className="formColumn">
                     <div className="formGroup">
                        <label>Username</label>
                        <input type="text" className="formInput" value={newUsername} readOnly style={{ cursor: 'text' }} />
                     </div>
                     <div className="formGroup">
                        <label>First Name</label>
                        <input type="text" className="formInput" value={newFirstName} readOnly style={{ cursor: 'text' }} />
                     </div>
                     <div className="formGroup">
                        <label>Last Name</label>
                        <input type="text" className="formInput" value={newLastName} readOnly style={{ cursor: 'text' }} />
                     </div>
                  </div>
                  
                  <div className="formColumn">
                     <div className="formGroup">
                        <label>Contact Number</label>
                        <input type="text" className="formInput" value={newContact} readOnly style={{ cursor: 'text' }} />
                     </div>
                     <div className="formGroup">
                        <label>E-Mail</label>
                        <input type="email" className="formInput" value={newEmail} readOnly style={{ cursor: 'text' }} />
                     </div>
                     
                     <div className="formGroup" style={{ marginTop: '10px' }}>
                        <label style={{ marginBottom: '12px', display: 'block' }}>Status</label>
                        <div 
                          className={`statusBadge ${newStatus?.toLowerCase() === 'active' ? 'activeBadge' : 'inactiveBadge'}`} 
                          style={{ display: 'inline-flex', padding: '6px 16px' }}
                        >
                           <span className={newStatus?.toLowerCase() === 'active' ? 'activeText' : ''}>
                             {/* Capitalizes the first letter so 'active' becomes 'Active' */}
                             {newStatus ? newStatus.charAt(0).toUpperCase() + newStatus.slice(1) : 'Active'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                  <button className="cancelBtn" style={{ width: '100%', maxWidth: '200px' }} onClick={() => {
                    setEditAccountVisible(false);
                    resetForm();
                  }}>
                    Close
                  </button>
               </div>
            </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewAccountVisible && (
        <div className="modalOverlay" onClick={() => setViewAccountVisible(false)}>
          <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader"><h2>Patient Details</h2></div>
            <div className="imageUploadSection">
              {(selectedAccount.userImage || selectedAccount.userimage) ? (
                <img src={selectedAccount.userImage || selectedAccount.userimage} className="viewAvatar" alt="Patient Avatar" />
              ) : (
                <IoPersonCircleOutline size={100} color="#3d67ee" />
              )}
            </div>
            <div className="modalForm">
              <div className="formColumn">
                <div className="detailGroup">
                  <label>Full Name</label>
                  <div className="detailValue">
                    {`${selectedAccount.firstName || ''} ${selectedAccount.lastName || ''}`.trim() || selectedAccount.username}
                  </div>
                </div>
                <div className="detailGroup"><label>Contact Number</label><div className="detailValue">{selectedAccount.contact_number}</div></div>
                <div className="detailGroup"><label>Account Creation Date</label><div className="detailValue">{selectedAccount.created_at ? new Date(selectedAccount.created_at).toLocaleDateString() : 'N/A'}</div></div>
              </div>
              <div className="formColumn">
                <div className="detailGroup"><label>E-Mail</label><div className="detailValue">{selectedAccount.email}</div></div>
                <div className="detailGroup">
                  <label>Status</label>
                  <div className={`statusBadge ${selectedAccount.status === 'Active' ? 'activeBadge' : 'inactiveBadge'}`}>
                    <span className={`statusText ${selectedAccount.status === 'Active' ? 'activeText' : ''}`}>{selectedAccount.status || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modalFooter">
              <button className="cancelBtn wide" onClick={() => setViewAccountVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
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
                  <button className="alertBtn cancelAlertBtn" onClick={() => setModalVisible(false)}>Cancel</button>
                )}
                <button 
                  className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                  onClick={() => { setModalVisible(false); if (modalConfig.onConfirm) modalConfig.onConfirm(); }}
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