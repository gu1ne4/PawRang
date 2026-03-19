import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import profileHeader from '../assets/ProfileHeader.png';
import petsPeeking from '../assets/PetsPeeking.png';
import ClientNavBar from '../reusable_components/ClientNavBar';
import { 
  IoPaw, 
  IoMedical, 
  IoCalendar, 
  IoDocumentText,
  IoEyeOutline,
  IoCloudUploadOutline,
  IoTrashOutline,
  IoPersonOutline,
  IoLogOutOutline,
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoCameraOutline,
  IoHappy,
  IoInformationCircleOutline,
  IoMedicalOutline,
  IoFolderOutline,
  IoCheckmarkCircle,
  IoAdd,
  IoPencil,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoSearchOutline,
  IoTimeOutline,
  IoLocationOutline,
  IoEllipse,
  IoBugOutline,
  IoFitnessOutline,
  IoHeartOutline,
  IoCutOutline,
  IoPricetagOutline,
  IoDocumentTextOutline
} from 'react-icons/io5';
import './UserStyles2.css'; // Changed from UserStyles2.css

// Types and Interfaces
interface MedicalInfo {
  medications72h: boolean;
  medicationDetails?: string;
  fleaPrevention: boolean;
  rabiesVaccination: boolean;
  pregnant: boolean;
  additionalNotes: string;
}

interface Appointment {
  id: number;
  service: string;
  petName: string;
  date: string;
  time: string;
  doctor: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  branch: string;
  price: string;
  petImage: string;
  medicalInfo: MedicalInfo;
}

interface User {
  fullname?: string;
  fullName?: string;
  username?: string;
  userImage?: string;
  userimage?: string;
}

interface AlertConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  onConfirm: (() => void) | null;
  showCancel: boolean;
  confirmText: string;
}

const UserAppointmentView: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  // Custom Alert Modal
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false,
    confirmText: 'OK'
  });

  // Modals state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<Appointment | null>(null);
  
  // Reschedule form state
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleUnderstoodChecked, setRescheduleUnderstoodChecked] = useState(false);
  const [rescheduleReasonError, setRescheduleReasonError] = useState('');
  
  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelUnderstoodChecked, setCancelUnderstoodChecked] = useState(false);
  const [cancelReasonError, setCancelReasonError] = useState('');
  
  // Filter and search
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Pending'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Minimum character requirement for reasons
  const MIN_REASON_CHARS = 10;

  // Mock data for appointments
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 1,
      service: 'Consultation & Check-Up',
      petName: 'Max',
      date: '2026-03-15',
      time: '9:00AM - 10:00AM',
      doctor: 'Dr. Sarah Johnson',
      status: 'Confirmed',
      branch: 'Las Piñas',
      price: '₱500',
      petImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'Pet is doing well, just regular checkup'
      }
    },
    {
      id: 2,
      service: 'Pet Grooming',
      petName: 'Luna',
      date: '2026-03-16',
      time: '10:00AM - 11:00AM',
      doctor: 'Not yet Assigned',
      status: 'Pending',
      branch: 'Taguig',
      price: '₱800',
      petImage: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'First time grooming, please be gentle'
      }
    },
    {
      id: 3,
      service: 'Dental Prophylaxis',
      petName: 'Charlie',
      date: '2026-03-18',
      time: '2:00PM - 3:00PM',
      doctor: 'Dr. Michael Chen',
      status: 'Confirmed',
      branch: 'Las Piñas',
      price: '₱800',
      petImage: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400',
      medicalInfo: {
        medications72h: true,
        medicationDetails: 'Antibiotics for tooth infection',
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'Has bad breath, might need extraction'
      }
    },
    {
      id: 4,
      service: 'Vaccinations',
      petName: 'Max',
      date: '2026-03-20',
      time: '11:00AM - 12:00PM',
      doctor: 'Dr. Emily Brown',
      status: 'Completed',
      branch: 'Las Piñas',
      price: '₱1,200',
      petImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: ''
      }
    },
    {
      id: 5,
      service: 'Laboratory Tests',
      petName: 'Luna',
      date: '2026-03-22',
      time: '1:00PM - 2:00PM',
      doctor: 'Not yet Assigned',
      status: 'Pending',
      branch: 'Taguig',
      price: '₱1,800',
      petImage: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'Fasting required before blood test'
      }
    },
    {
      id: 6,
      service: 'X-Ray',
      petName: 'Charlie',
      date: '2026-03-25',
      time: '3:00PM - 4:00PM',
      doctor: 'Dr. James Wilson',
      status: 'Confirmed',
      branch: 'Las Piñas',
      price: '₱1,500',
      petImage: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'Limping on right front leg'
      }
    },
    {
      id: 7,
      service: 'Pet Boarding',
      petName: 'Max',
      date: '2026-03-28',
      time: '8:00AM - 9:00AM',
      doctor: 'Not yet Assigned',
      status: 'Pending',
      branch: 'Taguig',
      price: '₱1,200/night',
      petImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: false,
        additionalNotes: 'Will bring own food and bed'
      }
    },
    {
      id: 8,
      service: 'Ultrasound',
      petName: 'Luna',
      date: '2026-03-30',
      time: '4:00PM - 5:00PM',
      doctor: 'Dr. Amanda Lee',
      status: 'Cancelled',
      branch: 'Las Piñas',
      price: '₱2,000',
      petImage: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400',
      medicalInfo: {
        medications72h: false,
        fleaPrevention: true,
        rabiesVaccination: true,
        pregnant: true,
        additionalNotes: 'Pregnancy checkup'
      }
    }
  ]);

  // Clinic hours (Monday to Friday)
  const clinicHours: Record<string, string[]> = {
    'Monday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
    'Tuesday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
    'Wednesday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
    'Thursday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
    'Friday': ['8:00AM - 9:00AM', '9:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM', '1:00PM - 2:00PM', '2:00PM - 3:00PM', '3:00PM - 4:00PM', '4:00PM - 5:00PM'],
    'Saturday': [],
    'Sunday': []
  };

  // Load user session
  // useEffect(() => {
  //   const loadUser = async () => {
  //     try {
  //       const session = localStorage.getItem('userSession');
  //       if (session) {
  //         setCurrentUser(JSON.parse(session));
  //       } else {
  //         setCurrentUser(null);
  //         navigate('/');
  //       }
  //     } catch (error) {
  //       console.error("Failed to load user session", error);
  //     }
  //   };
  //   loadUser();
  // }, [navigate]);

  // Helper functions
  const showAlert = (
    type: AlertConfig['type'],
    title: string,
    message: string | React.ReactNode,
    onConfirm: (() => void) | null = null,
    showCancel = false,
    confirmText = 'OK'
  ) => {
    setAlertConfig({ type, title, message, onConfirm, showCancel, confirmText });
    setCustomAlertVisible(true);
  };

  const handleProtectedAction = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      showAlert(
        'info',
        'Authentication Required',
        'You need to log in or sign up to access this feature.',
        () => navigate('/login'),
        true,
        'Go to Login'
      );
    }
  };

  const handleLogout = async () => {
    setDropdownVisible(false);
    showAlert('confirm', 'Log Out', 'Are you sure you want to log out?', async () => {
      localStorage.removeItem('userSession');
      setCurrentUser(null);
      navigate('/login');
    }, true, 'Log Out');
  };

  const handleViewProfile = () => {
    setDropdownVisible(false);
    navigate('/profile');
  };

  const handleMyPets = () => {
    setDropdownVisible(false);
    navigate('/pets');
  };

  const displayName = currentUser ? (currentUser.fullname || currentUser.fullName || currentUser.username || "User") : "";

  // Get today's date for calendar min date
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get max date (2 months from now)
  const getMaxDate = (): string => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get day name from date string
  const getDayName = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Get time slots based on day of week
  const getTimeSlotsForDate = (date: string | null): string[] => {
    if (!date) return [];
    const dayName = getDayName(date);
    return clinicHours[dayName] || [];
  };

  // Generate marked dates for calendar
  const getMarkedDates = (): Record<string, any> => {
    let markedDates: Record<string, any> = {};
    
    const startDate = new Date(getTodayDate());
    const endDate = new Date(getMaxDate());
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const dayName = getDayName(dateString);
      
      if (clinicHours[dayName] && clinicHours[dayName].length > 0) {
        markedDates[dateString] = {
          selected: newDate === dateString,
          selectedColor: '#ffffff',
          marked: true,
          dotColor: '#3d67ee',
        };
      }
    }
    
    return markedDates;
  };

  // Filter appointments
  const getFilteredAppointments = (): Appointment[] => {
    let filtered = appointments;
    
    if (activeFilter === 'Active') {
      filtered = filtered.filter(app => app.status === 'Confirmed');
    } else if (activeFilter === 'Pending') {
      filtered = filtered.filter(app => app.status === 'Pending');
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.service.toLowerCase().includes(query) ||
        app.petName.toLowerCase().includes(query) ||
        app.doctor.toLowerCase().includes(query) ||
        app.status.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Pagination
  const getCurrentPageItems = (): Appointment[] => {
    const filtered = getFilteredAppointments();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  const getTotalPages = (): number => {
    const filtered = getFilteredAppointments();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Handle filter change
  const handleFilterChange = (filter: 'All' | 'Active' | 'Pending') => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  // Handle cancel
  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelStep(1);
    setCancelReason('');
    setCancelUnderstoodChecked(false);
    setCancelReasonError('');
    setCancelModalVisible(true);
  };

  // Handle reschedule
  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleStep(1);
    setNewDate(null);
    setNewTime(null);
    setRescheduleReason('');
    setRescheduleUnderstoodChecked(false);
    setRescheduleReasonError('');
    setRescheduleModalVisible(true);
  };

  // Handle view details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedForDetails(appointment);
  };

  // Check if appointment is actionable
  const isActionable = (status: string): boolean => {
    return status === 'Pending' || status === 'Confirmed';
  };

  // Validate cancel reason
  const validateCancelReason = (): boolean => {
    if (cancelReason.trim().length < MIN_REASON_CHARS) {
      setCancelReasonError(`Reason must be at least ${MIN_REASON_CHARS} characters`);
      return false;
    }
    setCancelReasonError('');
    return true;
  };

  // Handle cancel next step
  const handleCancelNext = () => {
    if (cancelStep === 1) {
      if (validateCancelReason()) {
        setCancelStep(2);
      }
    }
  };

  // Handle cancel back
  const handleCancelBack = () => {
    if (cancelStep > 1) {
      setCancelStep(cancelStep - 1);
    }
  };

    // Confirm cancel
    const confirmCancel = () => {
    if (!selectedAppointment) return;
    
    const updatedAppointments = appointments.map(app => 
        app.id === selectedAppointment.id ? {...app, status: 'Cancelled' as const} : app
    );
    setAppointments(updatedAppointments);
    
    if (selectedForDetails && selectedForDetails.id === selectedAppointment.id) {
        setSelectedForDetails({...selectedAppointment, status: 'Cancelled' as const});
    }
    
    showAlert('success', 'Success', 'Appointment cancelled successfully');
    
    setCancelModalVisible(false);
    setSelectedAppointment(null);
    };

  // Validate reschedule reason
  const validateRescheduleReason = (): boolean => {
    if (rescheduleReason.trim().length < MIN_REASON_CHARS) {
      setRescheduleReasonError(`Reason must be at least ${MIN_REASON_CHARS} characters`);
      return false;
    }
    setRescheduleReasonError('');
    return true;
  };

  // Handle reschedule next step
  const handleRescheduleNext = () => {
    if (rescheduleStep === 1) {
      if (newDate && newTime) {
        setRescheduleStep(2);
      } else {
        showAlert('info', 'Incomplete', 'Please select both date and time');
      }
    } else if (rescheduleStep === 2) {
      if (validateRescheduleReason()) {
        setRescheduleStep(3);
      }
    }
  };

  // Handle reschedule back
  const handleRescheduleBack = () => {
    if (rescheduleStep > 1) {
      setRescheduleStep(rescheduleStep - 1);
    }
  };

// Confirm reschedule
const confirmReschedule = () => {
  if (!selectedAppointment) return;
  
  const updatedAppointments = appointments.map(app => {
    if (app.id === selectedAppointment.id) {
      const newStatus = app.status === 'Confirmed' ? 'Pending' : app.status;
      
      return {
        ...app, 
        date: newDate || app.date,
        time: newTime || app.time,
        status: newStatus as 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled',
        doctor: newStatus === 'Pending' ? 'Not yet Assigned' : app.doctor
      };
    }
    return app;
  });
  
  setAppointments(updatedAppointments);
  
  if (selectedForDetails && selectedForDetails.id === selectedAppointment.id) {
    const newStatus = selectedAppointment.status === 'Confirmed' ? 'Pending' : selectedAppointment.status;
    setSelectedForDetails({
      ...selectedAppointment, 
      date: newDate || selectedAppointment.date,
      time: newTime || selectedAppointment.time,
      status: newStatus as 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled',
      doctor: newStatus === 'Pending' ? 'Not yet Assigned' : selectedAppointment.doctor
    });
  }
  
  showAlert('success', 'Success', 'Reschedule request submitted for review');
  setRescheduleModalVisible(false);
  setSelectedAppointment(null);
};

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'Confirmed': return '#00aa00';
      case 'Pending': return '#ffaa00';
      case 'Completed': return '#3d67ee';
      case 'Cancelled': return '#ee3d5a';
      default: return '#666';
    }
  };

  const currentItems = getCurrentPageItems();
  const totalPages = getTotalPages();
  const timeSlots = getTimeSlotsForDate(newDate);

  return (
    <div className="app-view-root"> {/* Changed from appointment-view-container */}
      {/* Custom Alert Modal */}
      {customAlertVisible && (
        <div className="app-modal-overlay" onClick={() => setCustomAlertVisible(false)}> {/* Changed from modal-overlay */}
          <div className="app-modal-base" onClick={e => e.stopPropagation()}> {/* Changed from modal-content */}
            {alertConfig.type === 'success' ? (
              <IoCheckmarkCircleOutline size={55} color="#2e9e0c" />
            ) : alertConfig.type === 'error' ? (
              <IoCloseCircleOutline size={55} color="#d93025" />
            ) : (
              <IoAlertCircleOutline size={55} color="#3d67ee" />
            )}
            
            <h3 className="app-modal-title">{alertConfig.title}</h3> {/* Changed from modal-title */}
            
            {typeof alertConfig.message === 'string' ? (
              <p className="app-modal-message">{alertConfig.message}</p> 
            ) : (
              <div className="app-modal-message">{alertConfig.message}</div> 
            )}
            
            <div className="app-modal-actions"> {/* Changed from modal-actions */}
              {alertConfig.showCancel && (
                <button 
                  className="app-modal-btn app-modal-btn-cancel" 
                  onClick={() => setCustomAlertVisible(false)}
                >
                  Cancel
                </button>
              )}
              
              <button 
                className={`app-modal-btn app-modal-btn-confirm ${alertConfig.type === 'error' ? 'app-modal-btn-error' : ''}`} 
                onClick={() => {
                  setCustomAlertVisible(false);
                  if (alertConfig.onConfirm) alertConfig.onConfirm();
                }}
              >
                {alertConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientNavBar 
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewProfile={handleViewProfile}
        onMyPets={handleMyPets}
        showAlert={showAlert}
      />


      {/* Main Content */}
      <div className="app-main-layout"> {/* Changed from appointments-main-content */}
        {/* Left Panel - Appointments List */}
        <div className="app-list-panel"> {/* Changed from appointments-list-panel */}
          <div className="app-list-header"> {/* Changed from appointments-header */}
            <h2>Your Appointments</h2>
          </div>

          {/* Search Bar */}
          <div className="app-search-wrapper"> {/* Changed from search-container */}
            <IoSearchOutline size={20} color="#3d67ee" />
            <input
              type="text"
              className="app-search-field" 
              placeholder="Search by service, pet, doctor, or status..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery.length > 0 && (
              <button className="app-search-clear" onClick={() => handleSearch('')}> {/* Changed from clear-search-btn */}
                <IoClose size={20} color="#999" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="app-filter-bar"> {/* Changed from filter-tabs */}
            {(['All', 'Active', 'Pending'] as const).map((filter) => (
              <button
                key={filter}
                className={`app-filter-option ${activeFilter === filter ? 'active' : ''}`} 
                onClick={() => handleFilterChange(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Appointments Table */}
          <div className="app-table-container"> {/* Changed from appointments-table */}
            <div className="app-table-head"> {/* Changed from table-header */}
              <div className="app-table-head-cell" style={{flex: 1.2}}>Service</div> {/* Changed from header-cell */}
              <div className="app-table-head-cell" style={{flex: 1}}>Pet Name</div>
              <div className="app-table-head-cell" style={{flex: 1.5}}>Date & Time</div>
              <div className="app-table-head-cell" style={{flex: 1.2}}>Doctor</div>
              <div className="app-table-head-cell" style={{flex: 0.9}}>Status</div>
            </div>

            <div className="app-table-body"> {/* Changed from table-body */}
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <div
                    key={item.id}
                    className={`app-table-row ${selectedForDetails?.id === item.id ? 'selected' : ''}`} 
                    onClick={() => handleViewDetails(item)}
                  >
                    <div className="app-table-cell" style={{flex: 1.2}} title={item.service}> {/* Changed from table-cell */}
                      {item.service}
                    </div>
                    <div className="app-table-cell" style={{flex: 1}}>{item.petName}</div>
                    <div className="app-table-cell" style={{flex: 1.5}}>
                      <div>{formatDate(item.date)}</div>
                      <div className="app-time-cell">{item.time}</div> {/* Changed from time-cell */}
                    </div>
                    <div className="app-table-cell" style={{flex: 1.2}}>
                      <span className={item.doctor === 'Not yet Assigned' ? 'app-italic-text' : ''}> {/* Changed from italic */}
                        {item.doctor}
                      </span>
                    </div>
                    <div className="app-table-cell" style={{flex: 0.9}}>
                      <span 
                        className="app-status-pill"
                        style={{
                          backgroundColor: getStatusColor(item.status) + '20',
                          color: getStatusColor(item.status)
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="app-empty-state"> {/* Changed from empty-state */}
                  <IoCalendar size={50} color="#ccc" />
                  <p>No appointments found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="app-pagination-bar"> {/* Changed from pagination */}
                <button
                  className="app-page-btn" 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <IoChevronDown size={20} className="app-rotate-90" /> {/* Changed from rotate-90 */}
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`app-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => goToPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  className="app-page-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <IoChevronDown size={20} className="app-rotate-270" /> {/* Changed from rotate-270 */}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Details View */}
        <div className="app-details-panel"> {/* Changed from appointments-details-panel */}
          <div className="app-details-title"> {/* Changed from details-header */}
            <h3>Appointment Details</h3>
          </div>
          
          <div className="app-details-scroll"> {/* Changed from details-content */}
            {selectedForDetails ? (
              <>
                {/* Pet Header */}
                <div className="app-pet-summary"> {/* Changed from pet-details-header */}
                  <img 
                    src={selectedForDetails.petImage}
                    alt={selectedForDetails.petName}
                    className="app-pet-thumb" 
                  />
                  <div className="app-pet-name-badge"> {/* Changed from pet-detail-title */}
                    <h4>{selectedForDetails.petName}</h4>
                    <p>{selectedForDetails.service}</p>
                  </div>
                </div>

                {/* Service and Price */}
                <div className="app-info-row"> {/* Changed from detail-row */}
                  <IoCutOutline size={18} color="#3d67ee" />
                  <span className="app-info-label">Service:</span> {/* Changed from detail-label */}
                  <span className="app-info-value">{selectedForDetails.service}</span> {/* Changed from detail-value */}
                </div>

                <div className="app-info-row">
                  <IoPricetagOutline size={18} color="#3d67ee" />
                  <span className="app-info-label">Price:</span>
                  <span className="app-info-value price">{selectedForDetails.price}</span> {/* Changed from detail-value price */}
                </div>

                {/* Appointment Details */}
                <div className="app-info-row">
                  <IoCalendar size={18} color="#3d67ee" />
                  <span className="app-info-label">Date:</span>
                  <span className="app-info-value">{formatDate(selectedForDetails.date)}</span>
                </div>

                <div className="app-info-row">
                  <IoTimeOutline size={18} color="#3d67ee" />
                  <span className="app-info-label">Time:</span>
                  <span className="app-info-value">{selectedForDetails.time}</span>
                </div>

                <div className="app-info-row">
                  <IoPersonOutline size={18} color="#3d67ee" />
                  <span className="app-info-label">Doctor:</span>
                  <span className={`app-info-value ${selectedForDetails.doctor === 'Not yet Assigned' ? 'app-italic-text' : ''}`}>
                    {selectedForDetails.doctor}
                  </span>
                </div>

                <div className="app-info-row">
                  <IoLocationOutline size={18} color="#3d67ee" />
                  <span className="app-info-label">Branch:</span>
                  <span className="app-info-value">{selectedForDetails.branch}</span>
                </div>

                <div className="app-info-row">
                  <IoEllipse size={18} color={getStatusColor(selectedForDetails.status)} />
                  <span className="app-info-label">Status:</span>
                  <span 
                    className="app-status-pill"
                    style={{
                      backgroundColor: getStatusColor(selectedForDetails.status) + '20',
                      color: getStatusColor(selectedForDetails.status)
                    }}
                  >
                    {selectedForDetails.status}
                  </span>
                </div>

                {/* Medical Information */}
                <div className="app-medical-block"> {/* Changed from medical-info-section */}
                  <h4>Medical Information</h4>
                  
                  <div className="app-medical-item"> {/* Changed from medical-detail-row */}
                    <IoMedicalOutline size={16} color="#666" />
                    <span className="app-medical-tag">Medications (72h):</span> {/* Changed from medical-label */}
                    <span className={`app-medical-status ${selectedForDetails.medicalInfo?.medications72h ? 'warning' : 'success'}`}> {/* Changed from medical-value */}
                      {selectedForDetails.medicalInfo?.medications72h ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  {selectedForDetails.medicalInfo?.medications72h && selectedForDetails.medicalInfo?.medicationDetails && (
                    <div className="app-medical-note"> {/* Changed from medical-note */}
                      {selectedForDetails.medicalInfo.medicationDetails}
                    </div>
                  )}
                  
                  <div className="app-medical-item">
                    <IoBugOutline size={16} color="#666" />
                    <span className="app-medical-tag">Flea/Tick Prevention:</span>
                    <span className={`app-medical-status ${selectedForDetails.medicalInfo?.fleaPrevention ? 'success' : 'warning'}`}>
                      {selectedForDetails.medicalInfo?.fleaPrevention ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="app-medical-item">
                    <IoFitnessOutline size={16} color="#666" />
                    <span className="app-medical-tag">Rabies+4in1:</span>
                    <span className={`app-medical-status ${selectedForDetails.medicalInfo?.rabiesVaccination ? 'success' : 'warning'}`}>
                      {selectedForDetails.medicalInfo?.rabiesVaccination ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="app-medical-item">
                    <IoHeartOutline size={16} color="#666" />
                    <span className="app-medical-tag">Pregnant:</span>
                    <span className={`app-medical-status ${selectedForDetails.medicalInfo?.pregnant ? 'warning' : 'success'}`}>
                      {selectedForDetails.medicalInfo?.pregnant ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedForDetails.medicalInfo?.additionalNotes && (
                  <div className="app-notes-block"> {/* Changed from additional-notes */}
                    <h4>Additional Notes</h4>
                    <p>{selectedForDetails.medicalInfo.additionalNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="app-empty-details"> {/* Changed from no-selection */}
                <IoDocumentTextOutline size={60} color="#ccc" />
                <p>Select an appointment to view details</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {selectedForDetails && isActionable(selectedForDetails.status) && (
            <div className="app-action-bar"> {/* Changed from action-buttons-row */}
              <button
                className="app-action-btn cancel" 
                onClick={() => handleCancel(selectedForDetails)}
              >
                <IoClose size={18} color="white" />
                <span>Cancel</span>
              </button>
              
              <button
                className="app-action-btn reschedule" 
                onClick={() => handleReschedule(selectedForDetails)}
              >
                <IoCalendar size={18} color="white" />
                <span>Reschedule</span>
              </button>
            </div>
          )}
        </div>
      </div>

        {/* Cancel Modal */}
        {cancelModalVisible && selectedAppointment && (
        <div className="app-modal-overlay" onClick={() => setCancelModalVisible(false)}> {/* Changed from modal-overlay */}
            <div className="app-modal-base app-modal-wide app-cancel-modal" onClick={e => e.stopPropagation()}> {/* Changed from modal-content wide cancel-modal */}
            <button className="app-modal-close" onClick={() => setCancelModalVisible(false)}> {/* Changed from modal-close-btn */}
                <IoClose size={24} color="#999" />
            </button>
            
            <div className="app-cancel-header"> {/* Changed from cancel-modal-header */}
                <div className="app-cancel-icon"> {/* Changed from cancel-icon-wrapper */}
                <IoCloseCircleOutline size={40} color="#ee3d5a" />
                </div>
                <h2>Cancel Appointment</h2>
                <p className="app-step-subtitle">Please follow the steps to cancel your appointment</p> {/* Changed from modal-subtitle */}
            </div>
            

            <div className="app-modal-body"> {/* Changed from modal-body */}
                {cancelStep === 1 && (
                <div className="cancel-reason-step">
                    <div className="app-step-guide"> {/* Changed from step-description */}
                    <h3>Reason for Cancellation</h3>
                    <p>Please provide a reason for cancelling your appointment. This helps us improve our service.</p>
                    </div>
                    
                    <div className="app-input-group"> {/* Changed from form-group */}
                    <label htmlFor="cancelReason" className="app-field-label required"> {/* Changed from form-label required */}
                        Cancellation Reason
                    </label>
                    <textarea
                        id="cancelReason"
                        className={`app-textarea-field ${cancelReasonError ? 'error' : ''}`} 
                        placeholder="e.g., Emergency, Change of plans, Pet not feeling well, etc."
                        value={cancelReason}
                        onChange={(e) => {
                        setCancelReason(e.target.value);
                        if (cancelReasonError) setCancelReasonError('');
                        }}
                        rows={5}
                    />
                    <div className="app-input-footer"> {/* Changed from input-footer */}
                        {cancelReasonError ? (
                        <span className="error-message">
                            <IoAlertCircleOutline size={14} />
                            {cancelReasonError}
                        </span>
                        ) : (
                        <span className="app-char-indicator"> {/* Changed from char-counter */}
                            <IoDocumentTextOutline size={14} />
                            {cancelReason.length}/{MIN_REASON_CHARS} characters
                        </span>
                        )}
                    </div>
                    </div>

                    <div className="app-info-banner"> {/* Changed from info-message */}
                    <IoInformationCircleOutline size={18} color="#3d67ee" />
                    <span>Your reason will be reviewed by our team to help us improve our services.</span>
                    </div>
                </div>
                )}
                
                {cancelStep === 2 && (
                <div className="cancel-confirm-step">
                    <div className="app-step-guide">
                    <h3>Review Cancellation Details</h3>
                    <p>Please review the details below before confirming cancellation.</p>
                    </div>
                    
                    {/* Appointment Summary Card */}
                    <div className="app-summary-card"> {/* Changed from appointment-summary-card */}
                    <div className="app-card-header"> {/* Changed from summary-card-header */}
                        <IoCalendar size={18} color="#3d67ee" />
                        <h4>Appointment Details</h4>
                    </div>
                    
                    <div className="app-card-body"> {/* Changed from summary-card-body */}
                        <div className="app-summary-line"> {/* Changed from summary-row */}
                        <span className="app-summary-tag">Pet Name:</span> {/* Changed from summary-label */}
                        <span className="app-summary-data">{selectedAppointment?.petName}</span> {/* Changed from summary-value */}
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Service:</span>
                        <span className="app-summary-data">{selectedAppointment?.service}</span>
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Price:</span>
                        <span className="app-summary-data price">₱{selectedAppointment?.price}</span> {/* Changed from summary-value price */}
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Date:</span>
                        <span className="app-summary-data">{selectedAppointment ? formatDate(selectedAppointment.date) : ''}</span>
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Time:</span>
                        <span className="app-summary-data">{selectedAppointment?.time}</span>
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Doctor:</span>
                        <span className="app-summary-data">{selectedAppointment?.doctor}</span>
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Branch:</span>
                        <span className="app-summary-data">{selectedAppointment?.branch}</span>
                        </div>
                    </div>
                    </div>

                    {/* Reason Summary */}
                    {cancelReason && (
                    <div className="app-reason-card"> {/* Changed from reason-summary-card */}
                        <div className="app-card-header">
                        <IoDocumentTextOutline size={18} color="#ee3d5a" />
                        <h4>Cancellation Reason</h4>
                        </div>
                        <div className="app-card-body">
                        <p className="app-quote-text">"{cancelReason}"</p> {/* Changed from reason-text */}
                        </div>
                    </div>
                    )}
                    
                    {/* Warning Box */}
                    <div className="app-warning-box"> {/* Changed from warning-box */}
                    <div className="app-warning-header"> {/* Changed from warning-header */}
                        <IoAlertCircleOutline size={20} color="#b71c1c" />
                        <h4>⚠️ Non-Refundable</h4>
                    </div>
                    <p>Cancelling this appointment means:</p>
                    <ul>
                        <li>Any payments made are non-refundable</li>
                        <li>The appointment slot will be released to other patients</li>
                        <li>This action cannot be undone</li>
                    </ul>
                    </div>
                    
                    {/* Checkbox */}
                    <label className="app-checkbox-wrapper"> {/* Changed from checkbox-container */}
                    <input
                        type="checkbox"
                        checked={cancelUnderstoodChecked}
                        onChange={() => setCancelUnderstoodChecked(!cancelUnderstoodChecked)}
                    />
                    <span className="app-checkbox-label"> {/* Changed from checkbox-text */}
                        I understand that this cancellation is non-refundable and cannot be undone
                    </span>
                    </label>
                </div>
                )}
            </div> {/* Close app-modal-body */}
            
            <div className="app-modal-bottom"> {/* Changed from modal-footer */}
                <div className="app-modal-footer-actions"> {/* Changed from modal-actions-row */}
                {cancelStep > 1 ? (
                    <button className="app-btn-outline" onClick={handleCancelBack}> {/* Changed from btn-outline */}
                    <IoChevronDown className="app-rotate-90" size={16} />
                    Back
                    </button>
                ) : (
                    <button className="app-btn-outline" onClick={() => setCancelModalVisible(false)}>
                    <IoClose size={16} />
                    Close
                    </button>
                )}
                
                {cancelStep < 2 ? (
                    <button 
                    className="app-btn-primary cancel" 
                    onClick={handleCancelNext}
                    disabled={!cancelReason || cancelReason.length < MIN_REASON_CHARS}
                    >
                    Next
                    <IoChevronDown className="app-rotate-270" size={16} />
                    </button>
                ) : (
                    <button 
                    className={`app-btn-primary cancel ${!cancelUnderstoodChecked ? 'disabled' : ''}`}
                    onClick={confirmCancel}
                    disabled={!cancelUnderstoodChecked}
                    >
                    <IoCloseCircleOutline size={18} />
                    Confirm Cancellation
                    </button>
                )}
                </div>
            </div>
            </div> {/* Close app-modal-base */}
        </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleModalVisible && selectedAppointment && (
        <div className="app-modal-overlay" onClick={() => setRescheduleModalVisible(false)}> {/* Changed from modal-overlay */}
            <div className="app-modal-base app-modal-wide app-reschedule-modal" onClick={e => e.stopPropagation()}> {/* Changed from modal-content wide reschedule-modal */}
            <button className="app-modal-close" onClick={() => setRescheduleModalVisible(false)}> {/* Changed from modal-close-btn */}
                <IoClose size={24} color="#999" />
            </button>
            
            <div className="app-reschedule-header"> {/* Changed from reschedule-modal-header */}
                <div className="app-reschedule-icon"> {/* Changed from reschedule-icon-wrapper */}
                <IoCalendar size={40} color="#3d67ee" />
                </div>
                <h2>Reschedule Appointment</h2>
                <p className="app-step-subtitle">Follow the steps to reschedule your appointment</p> {/* Changed from modal-subtitle */}
            </div>
            
            <div className="app-modal-body"> {/* Changed from modal-body */}
                {rescheduleStep === 1 && (
                <div className="datetime-step">
                    <div className="app-step-guide"> {/* Changed from step-description */}
                    <h3>Select New Date & Time</h3>
                    <p>Choose your preferred date and time slot for the appointment.</p>
                    </div>
                    
                    {/* Calendar */}
                    <div className="app-calendar-panel"> {/* Changed from calendar-section */}
                    <div className="app-calendar-nav"> {/* Changed from calendar-header */}
                        <button className="app-calendar-nav-btn"> {/* Changed from calendar-nav-btn */}
                        <IoChevronDown className="app-rotate-90" size={18} />
                        </button>
                        <span className="app-calendar-month">March 2026</span> {/* Changed from calendar-month-year */}
                        <button className="app-calendar-nav-btn">
                        <IoChevronDown className="app-rotate-270" size={18} />
                        </button>
                    </div>
                    
                    <div className="app-calendar-weekdays"> {/* Changed from calendar-weekdays */}
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="app-weekday-label">{day}</div> 
                        ))}
                    </div>
                    
                    <div className="app-calendar-days"> {/* Changed from calendar-grid */}
                        {[...Array(31)].map((_, i) => {
                        const day = i + 1;
                        const dateStr = `2026-03-${String(day).padStart(2, '0')}`;
                        const isAvailable = day >= 15 && day <= 30 && day % 7 !== 0 && day % 7 !== 6;
                        const isSelected = newDate === dateStr;
                        const isToday = day === 18; // Example
                        
                        return (
                            <button
                            key={i}
                            className={`app-day-cell ${isAvailable ? 'available' : 'unavailable'} 
                                ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`} 
                            onClick={() => isAvailable && setNewDate(dateStr)}
                            disabled={!isAvailable}
                            >
                            {day}
                            </button>
                        );
                        })}
                    </div>
                    </div>
                    
                    {/* Time Slots */}
                    {newDate && (
                    <div className="app-time-panel"> {/* Changed from time-slots-section */}
                        <div className="app-time-header"> {/* Changed from time-slots-header */}
                        <IoTimeOutline size={18} color="#3d67ee" />
                        <h4>Available Time Slots for {formatDate(newDate)}</h4>
                        </div>
                        <div className="app-time-grid"> {/* Changed from time-slots-grid */}
                        {timeSlots.length > 0 ? (
                            timeSlots.map((time, index) => (
                            <button
                                key={index}
                                className={`app-time-option ${newTime === time ? 'selected' : ''}`} 
                                onClick={() => setNewTime(time)}
                            >
                                <IoTimeOutline size={14} />
                                <span>{time}</span>
                            </button>
                            ))
                        ) : (
                            <div className="app-no-slots"> {/* Changed from no-slots-message */}
                            <IoAlertCircleOutline size={24} color="#999" />
                            <p>No available time slots for this date</p>
                            </div>
                        )}
                        </div>
                    </div>
                    )}
                </div>
                )}
                
                {rescheduleStep === 2 && (
                <div className="reason-step">
                    <div className="app-step-guide">
                    <h3>Reason for Rescheduling</h3>
                    <p>Please let us know why you need to reschedule your appointment.</p>
                    </div>
                    
                    <div className="app-input-group">
                    <label htmlFor="rescheduleReason" className="app-field-label required">
                        Reschedule Reason
                    </label>
                    <textarea
                        id="rescheduleReason"
                        className={`app-textarea-field ${rescheduleReasonError ? 'error' : ''}`}
                        placeholder="e.g., Work conflict, Pet not feeling well, Emergency, etc."
                        value={rescheduleReason}
                        onChange={(e) => {
                        setRescheduleReason(e.target.value);
                        if (rescheduleReasonError) setRescheduleReasonError('');
                        }}
                        rows={5}
                    />
                    <div className="app-input-footer">
                        {rescheduleReasonError ? (
                        <span className="error-message">
                            <IoAlertCircleOutline size={14} />
                            {rescheduleReasonError}
                        </span>
                        ) : (
                        <span className="app-char-indicator">
                            <IoDocumentTextOutline size={14} />
                            {rescheduleReason.length}/{MIN_REASON_CHARS} characters
                        </span>
                        )}
                    </div>
                    </div>
                </div>
                )}
                
                {rescheduleStep === 3 && (
                <div className="reschedule-confirm-step">
                    <div className="app-step-guide">
                    <h3>Review Reschedule Request</h3>
                    <p>Please review all details before submitting your request.</p>
                    </div>
                    
                    {/* Original Appointment Card */}
                    <div className="app-summary-card original"> {/* Changed from appointment-summary-card original */}
                    <div className="app-card-header">
                        <IoCalendar size={18} color="#ee3d5a" />
                        <h4>Original Appointment</h4>
                    </div>
                    <div className="app-card-body">
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Date:</span>
                        <span className="app-summary-data">{formatDate(selectedAppointment.date)}</span>
                        </div>
                        <div className="app-summary-line">
                        <span className="app-summary-tag">Time:</span>
                        <span className="app-summary-data">{selectedAppointment.time}</span>
                        </div>
                    </div>
                    </div>
                    
                    {/* New Appointment Card */}
                    {newDate && newTime && (
                    <div className="app-summary-card new"> {/* Changed from appointment-summary-card new */}
                        <div className="app-card-header">
                        <IoCalendar size={18} color="#00aa00" />
                        <h4>New Requested Schedule</h4>
                        </div>
                        <div className="app-card-body">
                        <div className="app-summary-line">
                            <span className="app-summary-tag">Date:</span>
                            <span className="app-summary-data highlight">{formatDate(newDate)}</span> {/* Changed from summary-value highlight */}
                        </div>
                        <div className="app-summary-line">
                            <span className="app-summary-tag">Time:</span>
                            <span className="app-summary-data highlight">{newTime}</span>
                        </div>
                        </div>
                        {selectedAppointment.status === 'Confirmed' && (
                        <div className="app-status-note"> {/* Changed from status-note */}
                            <IoInformationCircleOutline size={16} />
                            <span>This appointment will be set to Pending for re-approval</span>
                        </div>
                        )}
                    </div>
                    )}
                    
                    {/* Reason Summary */}
                    {rescheduleReason && (
                    <div className="app-reason-card"> {/* Changed from reason-summary-card */}
                        <div className="app-card-header">
                        <IoDocumentTextOutline size={18} color="#3d67ee" />
                        <h4>Reschedule Reason</h4>
                        </div>
                        <div className="app-card-body">
                        <p className="app-quote-text">"{rescheduleReason}"</p> {/* Changed from reason-text */}
                        </div>
                    </div>
                    )}
                    
                    {/* Info Box */}
                    <div className="app-info-box"> {/* Changed from info-box */}
                    <div className="app-info-header"> {/* Changed from info-header */}
                        <IoTimeOutline size={20} color="#856404" />
                        <h4>⏳ Under Review</h4>
                    </div>
                    <p>Your reschedule request will be reviewed and will take about 1-2 days to process.</p>
                    <p>You will receive an email notification once your request has been approved.</p>
                    </div>
                    
                    {/* Checkbox */}
                    <label className="app-checkbox-wrapper"> {/* Changed from checkbox-container */}
                    <input
                        type="checkbox"
                        checked={rescheduleUnderstoodChecked}
                        onChange={() => setRescheduleUnderstoodChecked(!rescheduleUnderstoodChecked)}
                    />
                    <span className="app-checkbox-label"> {/* Changed from checkbox-text */}
                        I understand that this reschedule request will be reviewed and may take 1-2 days for approval
                    </span>
                    </label>
                </div>
                )}
            </div> {/* Close app-modal-body */}
            
            <div className="app-modal-bottom"> {/* Changed from modal-footer */}
                <div className="app-modal-footer-actions"> {/* Changed from modal-actions-row */}
                {rescheduleStep > 1 ? (
                    <button className="app-btn-outline" onClick={handleRescheduleBack}>
                    <IoChevronDown className="app-rotate-90" size={16} />
                    Back
                    </button>
                ) : (
                    <button className="app-btn-outline" onClick={() => setRescheduleModalVisible(false)}>
                    <IoClose size={16} />
                    Cancel
                    </button>
                )}
                
                {rescheduleStep < 3 ? (
                    <button 
                    className="app-btn-primary"
                    onClick={handleRescheduleNext}
                    disabled={
                        (rescheduleStep === 1 && (!newDate || !newTime)) ||
                        (rescheduleStep === 2 && (!rescheduleReason || rescheduleReason.length < MIN_REASON_CHARS))
                    }
                    >
                    Next
                    <IoChevronDown className="app-rotate-270" size={16} />
                    </button>
                ) : (
                    <button 
                    className={`app-btn-primary ${!rescheduleUnderstoodChecked ? 'disabled' : ''}`}
                    onClick={confirmReschedule}
                    disabled={!rescheduleUnderstoodChecked}
                    >
                    <IoCalendar size={18} />
                    Submit Request
                    </button>
                )}
                </div>
            </div>
            </div> {/* Close app-modal-base */}
        </div> 
        )}
    </div> // Close app-view-root
  );
};

export default UserAppointmentView;