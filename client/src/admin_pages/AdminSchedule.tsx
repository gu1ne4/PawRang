import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // 🟢 Added Supabase import

// Reusable Navbar
import Navbar from '../reusable_components/NavBar'; 

// Web icons
import { 
  IoDocumentTextOutline, IoNotifications, IoAddCircle, IoFilterSharp, 
  IoCloseCircle, IoEyeOutline, IoClose, IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, IoAlertCircleOutline, IoMedical, IoArrowBack, 
  IoCalendarClearOutline, IoInformationCircle, IoChevronBack, IoChevronForward
} from 'react-icons/io5';

// Styles and Images
import './AdminStyles.css';
import defaultUserImg from '../assets/userImg.jpg';

// Imported Modals and Services
import AdminCancelAppointmentModal from './AdminCancelAppointmentModal'; 
import AdminRescheduleModal from './AdminRescheduleModal';               
import { availabilityService } from './availabilityService';             

// --- TYPESCRIPT INTERFACES ---
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

// ==========================================
//  0. CUSTOM CALENDAR COMPONENT (Matches React Native UI)
// ==========================================
// ==========================================
//  0. CUSTOM CALENDAR COMPONENT 
// ==========================================
const CustomCalendar = ({ selectedDate, onSelectDate, bookedDates }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    // 🟢 NEW: Get exact string for today's date
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];
        const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const yearStr = currentMonth.getFullYear();

        // Empty slots for the start of the month offset
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ width: '40px', height: '40px' }}></div>);
        }

        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
            
            const isSelected = selectedDate === fullDate;
            const isToday = fullDate === todayStr; // 🟢 NEW: Check if this day is today
            const hasAppointment = bookedDates[fullDate];

            // 🟢 NEW: Dynamic styling based on state (Matches your React Native Theme)
            let bgColor = 'transparent';
            let textColor = '#333';
            let fontWeight = '400';

            if (isSelected) {
                bgColor = '#3d67ee';     // Solid blue if user clicks it
                textColor = 'white';
                fontWeight = '600';
            } else if (isToday) {
                bgColor = '#f0f7ff';     // Light blue background for today
                textColor = '#3d67ee';   // Blue text for today
                fontWeight = '700';
            }

            days.push(
                <div 
                    key={i} 
                    onClick={() => onSelectDate(fullDate)}
                    style={{
                        width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        backgroundColor: bgColor,
                        color: textColor,
                        borderRadius: '50%', position: 'relative',
                        fontSize: '14px', fontWeight: fontWeight,
                        transition: 'all 0.2s ease'
                    }}
                >
                    {i}
                    {/* The tiny dot for booked appointments */}
                    {hasAppointment && (
                        <div style={{ 
                            width: '5px', height: '5px', 
                            backgroundColor: isSelected ? 'white' : '#3d67ee', 
                            borderRadius: '50%', position: 'absolute', bottom: '2px' 
                        }}></div>
                    )}
                </div>
            );
        }
        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div style={{ width: '100%', userSelect: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
                <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d67ee', display: 'flex', alignItems: 'center' }}>
                    <IoChevronBack size={18} />
                </button>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111' }}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d67ee', display: 'flex', alignItems: 'center' }}>
                    <IoChevronForward size={18} />
                </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '15px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: '600' }}>{day}</div>
                ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 5px', justifyItems: 'center', minHeight: '200px' }}>
                {renderDays()}
            </div>
        </div>
    );
};

// ==========================================
//  1. CREATE APPOINTMENT MODAL
// ==========================================
const CreateAppointmentModal = ({ visible, onClose, onSubmit }: any) => {
    // ... (Keep the exact same CreateAppointmentModal code from your previous version)
    // I am omitting the body of this specific modal in this snippet to save space, 
    // but leave it exactly as it was in your previous React code!
    if (!visible) return null;
    return (
        <div className="modalOverlay">
            {/* The form from the previous message goes here */}
            <div className="modalContainer" style={{ maxHeight: '90%', width: '95%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Create New Appointment</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><IoClose size={24} color="#333" /></button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>
                    {/* Add your form inputs back here */}
                    <i>Form fields hidden for snippet brevity. Restore your previous form here.</i>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  2. CONFIRMATION MODAL
// ==========================================
const ConfirmationModal = ({ visible, onClose, onConfirm, title, message, confirmText = 'Yes', cancelText = 'No', confirmColor = '#3d67ee', type = 'info' }: any) => {
    if (!visible) return null;
    const getIconProps = () => {
        switch(type) {
            case 'cancel': return { icon: <IoCloseCircle size={40} color="#d32f2f" />, bg: '#ffebee' };
            case 'complete': return { icon: <IoCheckmarkCircleOutline size={40} color="#2e7d32" />, bg: '#e8f5e9' };
            default: return { icon: <IoInformationCircle size={40} color="#3d67ee" />, bg: '#e3f2fd' };
        }
    };
    const { icon, bg } = getIconProps();
    const btnColor = type === 'cancel' ? '#d32f2f' : (type === 'complete' ? '#2e7d32' : confirmColor);

    return (
        <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '40%', maxWidth: '400px', padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignItems: 'center', paddingTop: '30px', paddingBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '35px', backgroundColor: bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
                </div>
                <div style={{ padding: '0 30px', textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '10px' }}>{title}</h2>
                    <p style={{ fontSize: '16px', color: '#666', lineHeight: '22px' }}>{message}</p>
                </div>
                <div style={{ display: 'flex', padding: '20px', borderTop: '1px solid #f0f0f0', marginTop: '20px', gap: '15px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', color: '#666', fontWeight: '600', cursor: 'pointer' }}>{cancelText}</button>
                    <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '12px', backgroundColor: btnColor, border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//  3. ASSIGN DOCTOR MODAL
// ==========================================
const AssignDoctorModal = ({ visible, onClose, appointment, doctors, onAssign }: any) => {
    // ... (Keep exact same AssignDoctorModal from previous version)
    if (!visible) return null;
    return <div className="modalOverlay"><div className="modalContainer">...</div></div>;
};

// ==========================================
//  4. TABLE VIEW COMPONENT
// ==========================================
const TableView = ({ onViewUser, loading, filteredAppointments, service, setService, doctorFilter, setDoctorFilter, doctors, userData, handleCreateAppointment }: any) => {
  return (
    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ fontSize: '25px', fontWeight: '700', margin: 0 }}>Booked Appointments</h2>
          <p style={{ fontSize: '14px', marginTop: '5px', color: '#888', margin: 0 }}>
            {loading ? 'Loading appointments...' : `Total appointments: ${filteredAppointments.length}`}
          </p>
        </div>
        
        <button onClick={handleCreateAppointment} className="blackBtn" style={{ backgroundColor: '#3d67ee', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IoAddCircle size={20} color="#fff" />
          <span>Create Appointment</span>
        </button>
      </div>
      
      {loading ? (
        <div className="loadingContainer"><div className="spinner"></div></div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '5px', marginTop: '20px', marginBottom: '20px' }}>
            <IoFilterSharp size={25} color="#3d67ee" style={{ marginRight: '10px' }} />
            
            <div style={{ marginRight: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Service</div>
              <select value={service} onChange={(e) => setService(e.target.value)} className="filterSelect" style={{ width: '150px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Services</option>
                <option value="Vaccination">Wellness & Vaccination</option>
                <option value="Check-up">Check-up or Consultation</option>
                <option value="Deworming">Deworming</option>
                <option value="Parasite Control">Parasite Control</option>
                <option value="Grooming">Grooming</option>
              </select>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Doctor</div>
              <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="filterSelect" style={{ width: '180px' }}>
                <option value="" style={{color: '#a8a8a8'}}>All Doctors</option>
                <option value="Not Assigned">Not Assigned</option>
                {doctors.map((doctor: any) => (
                  <option key={doctor.pk || doctor.id} value={doctor.fullName || doctor.name}>
                    {doctor.fullName || doctor.name} ({doctor.role || 'Doctor'})
                  </option>
                ))}
              </select>
            </div>
            
            {(service || doctorFilter) && (
              <button onClick={() => { setService(''); setDoctorFilter(''); }} style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                <IoCloseCircle size={18} color="#666" />
                <span style={{ marginLeft: '5px', fontSize: '12px', color: '#666' }}>Clear</span>
              </button>
            )}
          </div>

          <div className="tableWrapper" style={{ marginTop: '0' }}>
            <table className="dataTable">
                <thead>
                    <tr>
                        <th style={{ width: '20%' }}>Name</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Service</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Time & Date</th>
                        <th style={{ textAlign: 'center', width: '15%' }}>Status</th>
                        <th style={{ textAlign: 'center', width: '20%' }}>Doctor</th>
                        <th style={{ textAlign: 'right', width: '5%' }}>View</th>
                    </tr>
                </thead>
                <tbody>
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((user: any) => (
                    <tr key={user.id}>
                        <td className="tableFont">{user.name}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.service}</td>
                        <td className="tableFont" style={{ textAlign: 'center' }}>{user.date_time}</td>
                        <td style={{ textAlign: 'center' }}>
                            <div className="statusBadge" style={{
                                backgroundColor: user.status === 'pending' ? '#fff3e0' : (user.status === 'scheduled' ? '#e8f5e9' : '#ffebee'),
                                display: 'inline-block'
                            }}>
                                <span style={{
                                    fontSize: '11px', fontWeight: '600',
                                    color: user.status === 'pending' ? '#f57c00' : (user.status === 'scheduled' ? '#2e7d32' : '#d32f2f')
                                }}>
                                    {user.status ? user.status.toUpperCase() : 'SCHEDULED'}
                                </span>
                            </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '12px', color: user.doctor === 'Not Assigned' ? '#f57c00' : '#333' }}>{user.doctor}</span>
                                {user.doctor === 'Not Assigned' && <IoAlertCircleOutline size={14} color="#f57c00" style={{ marginLeft: '5px' }} />}
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <button onClick={() => onViewUser(user)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <IoEyeOutline size={18} color="#3d67ee" />
                            </button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="noData">
                            {userData.length === 0 ? 'No appointments found' : 'No appointments matching your filters'}
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//  5. USER DETAILS VIEW
// ==========================================
const UserDetailsView = ({ user, onBack, onCancel, onComplete, onAssignDoctor, onReschedule }: any) => {
    // ... (Keep exact same UserDetailsView from previous version)
    if (!user) return null;
    return <div style={{ backgroundColor: 'white', padding: '30px' }}>...</div>;
};

// ==========================================
//  6. MAIN COMPONENT (SCHEDULE)
// ==========================================
export default function Schedule() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [service, setService] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [bookedDates, setBookedDates] = useState<any>({});
    
    // LOGOUT POPUP STATE
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

    // Calendar state
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
    
    const [currentView, setCurrentView] = useState('table'); 
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<any>(null);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<any>(null);

    const [userData, setUserData] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<any>(null);
    const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState<any>(null);
    const [confirmationType, setConfirmationType] = useState('info');

    const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
      setModalConfig({ type, title, message, onConfirm, showCancel });
      setLogoutModalVisible(true);
    };

    // 🟢 SUPABASE LOGOUT FIX
    const handleLogoutPress = () => {
      showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
        try {
          // Direct Supabase call instead of the localhost API
          await supabase.auth.signOut();
        } catch (error) { 
            console.error("Logout failed:", error); 
        }
        localStorage.removeItem('userSession'); 
        setCurrentUser(null);
        navigate('/Login'); 
      }, true); 
    };

    useEffect(() => {
        const loadUser = () => {
          try {
            const session = localStorage.getItem('userSession');
            if (session) setCurrentUser(JSON.parse(session));
            else setCurrentUser(null);
          } catch (error) { console.error("Failed to load user session", error); }
        };
        loadUser();
    }, []);

    const filteredAppointments = userData.filter(appointment => {
      if (appointment.status === 'completed' || appointment.status === 'cancelled') return false;
      if (selectedCalendarDate && !appointment.date_time.includes(selectedCalendarDate)) return false; 
      const matchesService = service === '' || appointment.service === service;
      const matchesDoctor = doctorFilter === '' || appointment.doctor === doctorFilter;
      return matchesService && matchesDoctor;
    });

    const handleViewUser = (user: any) => {
        setSelectedUser(user);
        setSelectedAppointment(user); 
        setSelectedDoctor(user.assignedDoctor || '');
        setCurrentView('userDetails');
    };

    const openDoctorModal = (appointment: any) => {
        setSelectedAppointment(appointment);
        setShowDoctorModal(true);
    };
    
    const handleBackToList = () => {
        setCurrentView('table');
        setSelectedUser(null);
        setSelectedDoctor('');
    };

    const handleAssignDoctor = async (appointmentId: any, doctorId: any) => {
        try {
            const result = await availabilityService.assignDoctor(appointmentId, doctorId);
            const updatedUserData = userData.map(appointment => {
                if (appointment.id === appointmentId) {
                    const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                    return {
                        ...appointment,
                        doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                        assignedDoctor: doctorId
                    };
                }
                return appointment;
            });
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === appointmentId) {
                const doctor = doctors.find(d => (d.pk || d.id) === doctorId);
                setSelectedUser((prev: any) => ({
                    ...prev,
                    doctor: doctor ? doctor.fullName : 'Unknown Doctor',
                    assignedDoctor: doctorId
                }));
            }
            window.alert('Success: ' + (result.message || 'Doctor assigned successfully!'));
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to assign doctor'));
            throw error;
        }
    };

    const handleCancelAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForCancel(appointment);
        setShowCancelModal(true);
    };

    const handleCancelWithReason = async (cancellationData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; 
            const fullCancelData = { ...cancellationData, cancelled_by: currentUserId };
            const result = await availabilityService.cancelAppointmentWithReason(selectedAppointmentForCancel.id, fullCancelData);
            
            const updatedUserData = userData.filter(user => user.id !== selectedAppointmentForCancel.id);
            setUserData(updatedUserData);
            
            if (selectedUser && selectedUser.id === selectedAppointmentForCancel.id) {
                setCurrentView('table');
                setSelectedUser(null);
            }
            
            setShowCancelModal(false);
            setSelectedAppointmentForCancel(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to cancel appointment'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleRescheduleAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForReschedule(appointment);
        setShowRescheduleModal(true);
    };

    const handleRescheduleSubmit = async (rescheduleData: any) => {
        try {
            setLoading(true);
            const currentUserId = 1; 
            const fullRescheduleData = { ...rescheduleData, requested_by: currentUserId };
            const result = await availabilityService.createRescheduleRequest(selectedAppointmentForReschedule.id, fullRescheduleData);
            
            setShowRescheduleModal(false);
            setSelectedAppointmentForReschedule(null);
            return result;
        } catch (error: any) {
            window.alert('Error: ' + (error.message || 'Failed to create reschedule request'));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteAppointment = (appointment: any) => {
        if (!appointment || !appointment.id) { window.alert('Error: Invalid appointment data'); return; }
        setSelectedAppointmentForAction(appointment);
        setConfirmationType('complete');
        setConfirmationAction(() => async () => {
            try {
                setLoading(true);
                const result = await availabilityService.updateAppointmentStatus(appointment.id, 'completed');
                if (result) {
                    const updatedUserData = userData.filter(user => user.id !== appointment.id);
                    setUserData(updatedUserData);
                    if (selectedUser && selectedUser.id === appointment.id) {
                        setCurrentView('table');
                        setSelectedUser(null);
                    }
                    window.alert('Success: Appointment marked as completed and moved to history.');
                }
            } catch (error: any) {
                window.alert('Error: ' + (error.message || 'Failed to complete appointment.'));
            } finally {
                setLoading(false);
                setSelectedAppointmentForAction(null);
            }
        });
        setShowConfirmationModal(true);
    };

    const handleCreateAppointment = () => setShowCreateModal(true);

    const loadAppointments = async () => {
        setLoading(true);
        try {
            const appointments = await availabilityService.getAppointmentsForTable();
            setUserData(appointments);
            
            const booked: any = {};
            appointments.forEach((app: any) => {
                const dateTimeParts = app.date_time.split(' - ');
                if (dateTimeParts.length > 0) {
                    const dateStr = dateTimeParts[0];
                    const date = new Date(dateStr);
                    if(!isNaN(date.getTime())) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      booked[`${year}-${month}-${day}`] = true;
                    }
                }
            });
            setBookedDates(booked);
        } catch (error) {
            window.alert('Error: Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const loadDoctors = async () => {
        try {
            const doctorsList = await availabilityService.getDoctors();
            const formattedDoctors = doctorsList.map((doctor: any) => ({
                id: doctor.pk || doctor.id,
                pk: doctor.pk,
                fullName: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                name: doctor.fullname || doctor.fullName || doctor.name || 'Unknown',
                role: doctor.role || 'Veterinarian',
                department: doctor.department || 'General',
                userImage: doctor.userImage || doctor.userimage,
            }));
            setDoctors(formattedDoctors);
        } catch (error) {
            console.error('Failed to load doctors:', error);
        }
    };

    const handleSubmitAppointment = async (appointmentData: any) => {
        try {
            setShowCreateModal(false);
            setTimeout(() => { loadAppointments(); }, 1000);
        } catch (error) {
            setShowCreateModal(false);
            loadAppointments(); 
        }
    };

    useEffect(() => {
        loadAppointments();
        loadDoctors();
    }, []);

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setTimeout(() => { loadAppointments(); }, 300);
    };

    return (
        <div className="biContainer">
            
            <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

            {/* BODY CONTAINER */}
            <div className="bodyContainer">
                <div className="topContainer">
                    <div className="subTopContainer">
                        <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
                        <span className="blueText" style={{ marginLeft: '10px' }}>
                            {currentView === 'table' ? 'Appointments / Schedule' : 'Patient Details'}
                        </span>
                    </div>
                    <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={loadAppointments}>
                            <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
                        </button>
                    </div>
                </div>

                {/* TABLE/VIEW AREA WITH SIDEBAR */}
                <div className="tableContainer" style={{ flexDirection: 'row', gap: '20px', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
                    
                    {/* LEFT SIDEBAR (Calendar & Doctors) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '500px', maxWidth: '500px' }}>
                        
                        {/* 🟢 THE NEW CUSTOM CALENDAR */}
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                            <CustomCalendar 
                                selectedDate={selectedCalendarDate} 
                                onSelectDate={setSelectedCalendarDate} 
                                bookedDates={bookedDates} 
                            />
                        </div>

                       {/* Doctors List */}
                        {/* 👇 Added display: flex and minHeight: 0 to force the scrollbar to appear inside */}
                        {/* Doctors List */}
                        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', flex: 1, boxShadow: '0 0 18px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '5px', flexShrink: 0 }}>Doctors Available</h3>
                            
                            {/* 👇 Added className="doctors-scroll-container" here! */}
                            <div className="doctors-scroll-container" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {doctors.map((doctor, index) => (
                                    <div 
                                        key={doctor.id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            padding: '12px 0',
                                            // 👇 Adds the thin line separator between doctors, but hides it on the last one
                                            borderBottom: index === doctors.length - 1 ? 'none' : '1px solid #eee' 
                                        }}
                                    >
                                        <img src={doctor.userImage || defaultUserImg} style={{ width: '45px', height: '45px', borderRadius: '50%', marginRight: '12px', objectFit: 'cover' }} alt="Dr" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>{doctor.name}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{doctor.department}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
                        {currentView === 'table' ? (
                            <TableView 
                                onViewUser={handleViewUser}
                                loading={loading}
                                filteredAppointments={filteredAppointments}
                                service={service}
                                setService={setService}
                                doctorFilter={doctorFilter}
                                setDoctorFilter={setDoctorFilter}
                                doctors={doctors}
                                userData={userData}
                                handleCreateAppointment={handleCreateAppointment}
                            />
                        ) : (
                            <UserDetailsView 
                                user={selectedUser} 
                                onBack={handleBackToList}
                                onCancel={handleCancelAppointment}
                                onComplete={handleCompleteAppointment}
                                onAssignDoctor={openDoctorModal} 
                                onReschedule={handleRescheduleAppointment}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <AssignDoctorModal 
                visible={showDoctorModal}
                onClose={() => setShowDoctorModal(false)}
                appointment={selectedAppointment}
                doctors={doctors}
                onAssign={handleAssignDoctor}
            />

            <CreateAppointmentModal 
                visible={showCreateModal}
                onClose={handleCloseModal}
                onSubmit={handleSubmitAppointment}
            />

            <ConfirmationModal 
                visible={showConfirmationModal}
                onClose={() => {
                    setShowConfirmationModal(false);
                    setSelectedAppointmentForAction(null);
                }}
                onConfirm={confirmationAction}
                title={confirmationType === 'cancel' ? 'Cancel Appointment' : 'Complete Appointment'}
                message={confirmationType === 'cancel' 
                    ? 'Are you sure you want to cancel this appointment? This will move it to history.'
                    : 'Mark this appointment as completed? It will be moved to history.'
                }
                confirmText={confirmationType === 'cancel' ? 'Yes, Cancel' : 'Yes, Complete'}
                cancelText="No"
                type={confirmationType}
            />

            {showCancelModal && (
                <AdminCancelAppointmentModal 
                    visible={showCancelModal}
                    onClose={() => { setShowCancelModal(false); setSelectedAppointmentForCancel(null); }}
                    appointment={selectedAppointmentForCancel}
                    onSubmit={handleCancelWithReason}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

            {showRescheduleModal && (
                <AdminRescheduleModal 
                    visible={showRescheduleModal}
                    onClose={() => { setShowRescheduleModal(false); setSelectedAppointmentForReschedule(null); }}
                    appointment={selectedAppointmentForReschedule}
                    onSubmit={handleRescheduleSubmit}
                    currentUserId={1} // Replace with Auth ID
                />
            )}

            {logoutModalVisible && (
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
                                <button className="alertBtn cancelAlertBtn" onClick={() => setLogoutModalVisible(false)}>Cancel</button>
                            )}
                            <button 
                                className={`alertBtn ${modalConfig.type === 'error' ? 'errorBtn' : 'confirmAlertBtn'}`}
                                onClick={() => {
                                    setLogoutModalVisible(false);
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