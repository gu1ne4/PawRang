import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoSearchSharp, IoFilterSharp, IoCloseCircleSharp,
  IoImageOutline, IoCamera, IoEye, IoPersonCircleOutline
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';

// Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';

// --- TYPESCRIPT INTERFACES ---
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
  
  // Highlighting the correct Sidebar Item
  const isActive = location.pathname === '/UserAccounts'; 

  // ==========================================
  //  STATE MANAGEMENT
  // ==========================================
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // ✅ API URL (Web)
  const API_URL = 'http://localhost:5000';

  // UI State
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [editAccountVisible, setEditAccountVisible] = useState(false);
  const [viewAccountVisible, setViewAccountVisible] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(true); // Default open since we are inside it
  const [searchHovered, setSearchHovered] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  // Pagination
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;

  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(false);

  // Form Data
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>({});
  const [newUsername, setNewUsername] = useState(''); 
  const [newFullName, setNewFullName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStatus, setNewStatus] = useState('Active'); 
  const [userImage, setUserImage] = useState<string | null>(null); 
  const [userImageBase64, setUserImageBase64] = useState<string | null>(null); 
  const [status, setStatus] = useState("defaultStatus");
  
  // Status toggle tracking
  const [statusToggleAccount, setStatusToggleAccount] = useState<any>(null);

  // Reference for hidden file input (Image Upload)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  //  HELPERS
  // ==========================================

  const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setModalVisible(true);
  };

  // Replace useFocusEffect with useEffect depending on location.pathname
  useEffect(() => {
    const loadUser = () => {
      try {
        const session = localStorage.getItem('userSession');
        if (session) {
          setCurrentUser(JSON.parse(session));
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Failed to load user session", error);
      }
    };
    loadUser();
  }, [location.pathname]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/patients`);
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to fetch patient data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setNewUsername(''); 
    setNewFullName(''); 
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
      hasChanges = !!(newFullName || newContact || newEmail || userImage);
    } else if (mode === 'edit') {
      const original = accounts.find(a => a.pk === editingId);
      if (original) {
        if (newUsername !== original.username || 
            newFullName !== (original.fullName || original.fullname) ||
            newContact !== (original.contactNumber || original.contactnumber) ||
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
    const nextStatus = e.target.checked ? 'Active' : 'Disabled';
    const messageJSX = (
      <span>
        Are you sure you want to <strong style={{color: nextStatus === 'Active' ? 'green' : 'red'}}>{nextStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE'}</strong> this account?
      </span>
    );
    showAlert('confirm', 'Confirm Status Change', messageJSX, () => { setNewStatus(nextStatus); }, true);
  };

  const handleStatusToggleFromTable = (account: any, e: React.ChangeEvent<HTMLInputElement>) => {
    const nextStatus = e.target.checked ? 'Active' : 'Disabled';
    const action = nextStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE';
    const accountName = account.fullName || account.fullname || account.username;
    
    const messageJSX = (
      <div>
        <p style={{marginBottom: '8px'}}>
          Are you sure you want to <strong style={{color: nextStatus === 'Active' ? 'green' : 'red'}}>{action}</strong> this account?
        </p>
        <p style={{fontStyle: 'italic', color: '#666'}}>
          Account: {accountName}
        </p>
      </div>
    );
    
    setStatusToggleAccount({ ...account, newStatus: nextStatus });
    
    showAlert('confirm', 'Confirm Status Change', messageJSX, () => {
      updateAccountStatus(account.pk, nextStatus);
    }, true);
  };

  const updateAccountStatus = async (accountId: number, newStatus: string) => {
    setTogglingStatus(true);
    try {
      const account = accounts.find(a => a.pk === accountId);
      if (!account) {
        showAlert('error', 'Error', 'Account not found');
        setTogglingStatus(false);
        return;
      }
      
      const updateData = {
        username: account.username,
        fullname: account.fullName || account.fullname,
        contactnumber: account.contactNumber || account.contactnumber,
        email: account.email,
        status: newStatus,
        userimage: account.userimage || null
      };
      
      const res = await fetch(`${API_URL}/patients/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        showAlert('success', 'Success', `Account has been ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully!`, () => {
          fetchAccounts(); 
        });
      } else {
        showAlert('error', 'Update Failed', responseData.error || 'Failed to update account status');
      }
    } catch (error) {
      showAlert('error', 'Network Error', 'Could not connect to the server.');
    } finally {
      setTogglingStatus(false);
      setStatusToggleAccount(null);
    }
  };

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
        console.error("Logout audit failed:", error);
      }
      localStorage.removeItem('userSession'); 
      setCurrentUser(null);
      navigate('/Login'); 
    }, true);
  };

  // Image Picking Logic for Web
  const triggerImagePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        setUserImage(resultString); // Full data URI for preview
        // Extract just the base64 part for the backend
        setUserImageBase64(resultString.split(',')[1]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccount = async () => {
    if (!newFullName || !newContact || !newEmail) {
      showAlert('error', 'Missing Information', 'Please fill in Full Name, Contact, and E-Mail.'); return;
    }
    if (newFullName.length < 5) { showAlert('error', 'Invalid Input', 'Full Name must be at least 5 characters.'); return; }
    if (newContact.length < 7) { showAlert('error', 'Invalid Input', 'Contact Number must be at least 7 digits.'); return; }
    if (newEmail.length < 6) { showAlert('error', 'Invalid Input', 'Email must be at least 6 characters.'); return; }

    const isDuplicate = accounts.some(acc => acc.email.toLowerCase() === newEmail.toLowerCase());
    if (isDuplicate) { showAlert('error', 'Duplicate Entry', 'This email is already registered.'); return; }

    const dateCreated = new Date().toLocaleDateString('en-US'); 

    try {
      const res = await fetch(`${API_URL}/patient-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName,
          contactNumber: newContact,
          email: newEmail,
          userImage: userImageBase64,
          status: newStatus,
          dateCreated: dateCreated
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAddAccountVisible(false);
        showAlert('success', 'Success', 'Patient Account Created Successfully!', () => { fetchAccounts(); resetForm(); });
      } else {
        showAlert('error', 'Failed', data.error || 'Registration failed');
      }
    } catch (e) { showAlert('error', 'Network Error', 'Could not connect to the server.'); }
  };

  const openEditModal = (user: any) => {
    setEditingId(user.pk);
    setNewUsername(user.username);
    setNewFullName(user.fullName || user.fullname);
    setNewContact((user.contactNumber || user.contactnumber || '').toString());
    setNewEmail(user.email);
    setNewStatus(user.status);
    
    const img = user.userImage || user.userimage;
    setUserImage(img);
    setUserImageBase64(null); 
    setEditAccountVisible(true);
  };

  const handleUpdateAccount = async () => {
    if (newFullName.length < 5) { showAlert('error', 'Invalid Input', 'Full Name must be at least 5 characters.'); return; }
    if (newContact.length < 7) { showAlert('error', 'Invalid Input', 'Contact Number must be at least 7 digits.'); return; }
    if (newEmail.length < 6) { showAlert('error', 'Invalid Input', 'Email must be at least 6 characters.'); return; }

    const isDuplicate = accounts.some(acc => 
      acc.pk !== editingId && acc.email.toLowerCase() === newEmail.toLowerCase()
    );
    if (isDuplicate) { showAlert('error', 'Duplicate Entry', 'This email is already in use by another patient.'); return; }

    try {
      const res = await fetch(`${API_URL}/patients/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          fullName: newFullName,
          contactNumber: newContact,
          email: newEmail,
          status: newStatus,
          userImage: userImageBase64
        }),
      });

      if (res.ok) {
        setEditAccountVisible(false);
        showAlert('success', 'Success', 'Patient Updated Successfully!', () => { fetchAccounts(); resetForm(); });
      } else {
        showAlert('error', 'Update Failed', 'Failed to update patient information.');
      }
    } catch (e) { showAlert('error', 'Network Error', 'Could not connect to the server.'); }
  };

  const handleViewDetails = (user: any) => {
    setSelectedAccount(user);
    setViewAccountVisible(true);
  };

  const filteredUsers = accounts.filter(u => {
    const name = (u.fullName || u.fullname || u.username || '').toLowerCase();
    const mail = (u.email || '').toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || mail.includes(searchQuery.toLowerCase());
    const matchesStatus = status !== "defaultStatus" ? u.status === status : true;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // ==========================================
  //  RENDER
  // ==========================================
  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

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
                      filteredUsers.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map(u => (
                        <tr key={u.pk || u.id || Math.random()}>
                          <td>
                              <div className="userCell">
                              <img src={u.userImage ? u.userImage : defaultUserImg} className="userAvatar" alt="avatar" />
                              <span className="tableFont">{u.fullName || u.fullname || u.username}</span>
                              </div>
                          </td>
                          <td style={{textAlign: 'center'}} className="tableFont">{u.contactNumber || u.contactnumber}</td>
                          <td style={{textAlign: 'center'}} className="tableFont">{u.email}</td>
                          <td style={{textAlign: 'center'}}>
                              <div className={`statusBadge ${u.status === 'Active' ? 'activeBadge' : 'inactiveBadge'}`}>
                                  <span className={`statusText ${u.status === 'Active' ? 'activeText' : ''}`}>{u.status}</span>
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
                                  checked={u.status === 'Active'} 
                                  onChange={(e) => handleStatusToggleFromTable(u, e)}
                                  disabled={togglingStatus && statusToggleAccount?.pk === u.pk}
                                />
                                <span className="slider"></span>
                              </label>
                              {togglingStatus && statusToggleAccount?.pk === u.pk && (
                                <div className="spinner" style={{width: '15px', height: '15px', marginLeft: '5px', borderWidth: '2px'}}></div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                ) : (
                  <tr><td colSpan={6} className="noData">No patients found</td></tr>
                )}
                </tbody>
              </table>

              {/* Web Pagination */}
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

      {/* Hidden File Input for Image Uploading */}
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
                        <label>Full Name</label>
                        <input 
                          type="text"
                          className="formInput" 
                          value={newFullName} 
                          onChange={(e) => setNewFullName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                          placeholder="Enter Full Name" 
                          maxLength={60}
                        />
                     </div>
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
                  </div>
                  <div className="formColumn">
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

      {/* EDIT PATIENT MODAL */}
      {editAccountVisible && (
        <div className="modalOverlay">
            <div className="modalContainer">
               <div className="modalHeader"><h2>Edit Patient Account</h2></div>
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
                        <label>Username</label>
                        <input type="text" className="formInput" value={newUsername} disabled style={{backgroundColor: '#f5f5f5', color: '#888'}} />
                     </div>
                     <div className="formGroup">
                        <label>Full Name</label>
                        <input 
                          type="text"
                          className="formInput" 
                          value={newFullName} 
                          onChange={(e) => setNewFullName(e.target.value.replace(/[^a-zA-Z ,.'-]/g, ''))} 
                          placeholder="Enter Full Name" 
                          maxLength={60}
                        />
                     </div>
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
                  </div>
                  <div className="formColumn">
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
                     <div className="formGroup" style={{ marginTop: '20px' }}>
                        <label style={{ marginBottom: '15px' }}>Account Status</label>
                        <div className="statusToggle">
                           <label className="switch">
                             <input type="checkbox" checked={newStatus === 'Active'} onChange={handleStatusToggle} />
                             <span className="slider"></span>
                           </label>
                           <span className={newStatus === 'Active' ? 'statusActive' : 'statusInactive'}> {newStatus} </span>
                        </div>
                     </div>
                  </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', gap: '15px' }}>
                  <button className="cancelBtn" onClick={() => handleCancel('edit')}>Cancel</button>
                  <button className="submitBtn gradientBtn" onClick={handleUpdateAccount}>Save Changes</button>
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
                <div className="detailGroup"><label>Full Name</label><div className="detailValue">{selectedAccount.fullName || selectedAccount.fullname}</div></div>
                <div className="detailGroup"><label>Contact Number</label><div className="detailValue">{selectedAccount.contactNumber || selectedAccount.contactnumber}</div></div>
                <div className="detailGroup"><label>Account Creation Date</label><div className="detailValue">{selectedAccount.dateCreated || selectedAccount.datecreated || 'N/A'}</div></div>
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
