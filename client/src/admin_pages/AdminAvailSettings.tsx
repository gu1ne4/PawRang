import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoChevronUp, IoChevronDown, IoTrashOutline, IoClose,
  IoChevronBack, IoChevronForward // 🟢 Restored Custom Calendar Icons
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';
import Navbar from '../reusable_components/NavBar';

// Using standard imports for Vite images
import logoImg from '../assets/AgsikapLogo-Temp.png';
import defaultUserImg from '../assets/userImg.jpg';
import { availabilityService } from './availabilityService';

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

// ==========================================
//  0. CUSTOM CALENDAR COMPONENT (Restored)
// ==========================================
const CustomCalendar = ({ selectedDate, onSelectDate, bookedDates = {}, availableDays = null, disablePastDates = false }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const todayDate = new Date();
    const minMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const maxMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);

    const canGoPrev = currentMonth > minMonth;
    const canGoNext = currentMonth < maxMonth;

    const nextMonth = () => { if (canGoNext) setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };
    const prevMonth = () => { if (canGoPrev) setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];
        const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const yearStr = currentMonth.getFullYear();

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ width: '40px', height: '40px' }}></div>);
        }

        const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = String(i).padStart(2, '0');
            const fullDate = `${yearStr}-${monthStr}-${dayStr}`;
            
            const dayOfWeek = new Date(yearStr, currentMonth.getMonth(), i).getDay();
            const dayName = dayNamesList[dayOfWeek];

            const isSelected = selectedDate === fullDate;
            const isToday = fullDate === todayStr; 
            const hasAppointment = bookedDates[fullDate];

            const isPast = disablePastDates && fullDate < todayStr;
            const isUnavailableDay = availableDays && availableDays[dayName] === false;
            const isDisabled = isPast || isUnavailableDay;

            let bgColor = 'transparent';
            let textColor = isDisabled ? '#d3d3d3' : '#333';
            let fontWeight = '400';
            let cursor = isDisabled ? 'not-allowed' : 'pointer';

            if (!isDisabled) {
                if (isSelected) {
                    bgColor = '#3d67ee';     
                    textColor = 'white';
                    fontWeight = '600';
                } else if (isToday) {
                    bgColor = '#f0f7ff';     
                    textColor = '#3d67ee';   
                    fontWeight = '700';
                }
            }

            days.push(
                <div 
                    key={i} 
                    onClick={() => !isDisabled && onSelectDate(isSelected ? '' : fullDate)}
                    style={{
                        width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: cursor,
                        backgroundColor: bgColor, color: textColor,
                        borderRadius: '50%', position: 'relative',
                        fontSize: '14px', fontWeight: fontWeight,
                        transition: 'all 0.2s ease', opacity: isDisabled ? 0.6 : 1
                    }}
                >
                    {i}
                    {hasAppointment && (
                        <div style={{ 
                            width: '5px', height: '5px', 
                            backgroundColor: isSelected ? 'white' : (isDisabled ? '#ccc' : '#3d67ee'), 
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
                <button onClick={prevMonth} type="button" disabled={!canGoPrev} style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'not-allowed', color: canGoPrev ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}><IoChevronBack size={18} /></button>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <button onClick={nextMonth} type="button" disabled={!canGoNext} style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed', color: canGoNext ? '#3d67ee' : '#ccc', display: 'flex', alignItems: 'center' }}><IoChevronForward size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '15px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: '600' }}>{day}</div>))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 5px', justifyItems: 'center', minHeight: '200px' }}>{renderDays()}</div>
        </div>
    );
};

// ==========================================
//  TIME SELECTOR COMPONENT
// ==========================================
const TimeSelector = ({ label, value, onChange }: any) => {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hours: 8, minutes: 0, isAM: true };
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return { hours: h > 12 ? h - 12 : h, minutes: m, isAM: h < 12 };
    }
    return { hours: 8, minutes: 0, isAM: true };
  };

  const initialTime = parseTime(value);
  const [hours, setHours] = useState(initialTime.hours);
  const [minutes, setMinutes] = useState(initialTime.minutes);
  const [isAM, setIsAM] = useState(initialTime.isAM);

  useEffect(() => {
    const newTime = parseTime(value);
    setHours(newTime.hours);
    setMinutes(newTime.minutes);
    setIsAM(newTime.isAM);
  }, [value]);

  const updateTime = (newHours: number, newMinutes: number, newIsAM: boolean) => {
    const displayTime = `${newHours}:${newMinutes.toString().padStart(2, '0')} ${newIsAM ? 'AM' : 'PM'}`;
    onChange(displayTime);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '10px' }}>
        
        {/* Hours */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { const newHours = hours === 12 ? 1 : hours + 1; setHours(newHours); updateTime(newHours, minutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronUp size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '18px', fontWeight: '600', margin: '5px 0' }}>{hours.toString().padStart(2, '0')}</span>
          <button onClick={() => { const newHours = hours === 1 ? 12 : hours - 1; setHours(newHours); updateTime(newHours, minutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronDown size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>HOURS</span>
        </div>

        <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 5px' }}>:</span>

        {/* Minutes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { const newMinutes = (minutes + 1) % 60; setMinutes(newMinutes); updateTime(hours, newMinutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronUp size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '18px', fontWeight: '600', margin: '5px 0' }}>{minutes.toString().padStart(2, '0')}</span>
          <button onClick={() => { const newMinutes = minutes === 0 ? 59 : minutes - 1; setMinutes(newMinutes); updateTime(hours, newMinutes, isAM); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IoChevronDown size={20} color="#3d67ee" />
          </button>
          <span style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>MINUTES</span>
        </div>

        {/* AM/PM */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <button onClick={() => { setIsAM(true); updateTime(hours, minutes, true); }} style={{ padding: '8px', backgroundColor: isAM ? '#3d67ee' : 'transparent', color: isAM ? 'white' : '#666', border: 'none', borderRadius: '5px', marginBottom: '5px', cursor: 'pointer', fontWeight: isAM ? 'bold' : 'normal', width: '100%' }}>
            AM
          </button>
          <button onClick={() => { setIsAM(false); updateTime(hours, minutes, false); }} style={{ padding: '8px', backgroundColor: !isAM ? '#3d67ee' : 'transparent', color: !isAM ? 'white' : '#666', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: !isAM ? 'bold' : 'normal', width: '100%' }}>
            PM
          </button>
        </div>
      </div>
      <div style={{ marginTop: '5px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Selected: {hours}:{minutes.toString().padStart(2, '0')} {isAM ? 'AM' : 'PM'}
      </div>
    </div>
  );
};

// 🟢 NEW: Helper to convert 12h time (9:00 AM) to 24h time (09:00:00) for Supabase
const formatTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
      return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    }
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    }
    return timeStr;
};

// Helper to format back to AM/PM for the UI
const formatToAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

// ==========================================
//  MAIN COMPONENT
// ==========================================
export default function AdminAvailSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/AvailSettings';

  const API_URL = 'http://localhost:5000';

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(true);

  // LOGOUT POPUP STATE
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfigType>({ type: 'info', title: '', message: '', onConfirm: null, showCancel: false });

  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<any>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [bookedDates, setBookedDates] = useState({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisible2, setModalVisible2] = useState(false);

  // Time slots storage
  const [timeSlotsByDay, setTimeSlotsByDay] = useState<any>({
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
  });

  const [currentEditingDay, setCurrentEditingDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [dayAvailability, setDayAvailability] = useState<any>({
    sunday: false, monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false
  });

  const [specialDates, setSpecialDates] = useState<any[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const DEFAULT_START_TIME = '8:00 AM';
  const DEFAULT_END_TIME = '9:00 AM';

  const showAlert = (type: 'info' | 'success' | 'error' | 'confirm', title: string, message: string | React.ReactNode, onConfirm: (() => void) | null = null, showCancel = false) => {
    setModalConfig({ type, title, message, onConfirm, showCancel });
    setLogoutModalVisible(true);
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
      } catch (error) { console.error("Logout audit failed:", error); }

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

  useEffect(() => {
    loadInitialData();
    loadAppointmentsForCalendar(); 
  }, []);

  const loadInitialData = async () => {
    try {
      const dayData = await availabilityService.getDayAvailability();
      setDayAvailability(dayData);
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const slotsByDay: any = { ...timeSlotsByDay };
      
      for (const day of days) {
        const slots = await availabilityService.getTimeSlotsForDay(day);
        slotsByDay[day] = slots.map((slot: any) => ({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          capacity: slot.capacity
        }));
      }
      setTimeSlotsByDay(slotsByDay);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadAppointmentsForCalendar = async () => {
    try {
      const appointments = await availabilityService.getAppointmentsForTable();
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
      console.error('Failed to load appointments for calendar:', error);
    }
  };

  const handleDayToggle = async (dayName: string) => {
    const dayKey = dayName.toLowerCase();
    const newValue = !dayAvailability[dayKey];
    
    setDayAvailability((prev: any) => ({ ...prev, [dayKey]: newValue }));
    
    try {
      await availabilityService.saveDayAvailability(dayKey, newValue);
    } catch (error) {
      setDayAvailability((prev: any) => ({ ...prev, [dayKey]: !newValue }));
      console.error('Failed to save day availability:', error);
    }
  };

  const openTimeSlotModalForDay = async (dayName: string) => {
    const dayKey = dayName.toLowerCase();
    setCurrentEditingDay(dayKey);
    setModalVisible(true);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
    setLoadingTimeSlots(true);
    
    try {
      const existingSlots = await availabilityService.getTimeSlotsForDay(dayKey);
      const formattedSlots = existingSlots.map((slot: any) => ({
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        capacity: slot.capacity
      }));
      setTimeSlotsByDay((prev: any) => ({ ...prev, [dayKey]: formattedSlots }));
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const addSlot = () => {
    if (!currentEditingDay || !startTime.trim() || !endTime.trim()) {
      window.alert('Please select both a start time and an end time.');
      return;
    }
    
    const convertToMinutes = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      return 0;
    };

    const startMinutes = convertToMinutes(startTime);
    const endMinutes = convertToMinutes(endTime);

    if (startMinutes >= endMinutes) {
        window.alert('Invalid Time: Start time must be before end time.');
        return;
    }
    
    const currentSlots = timeSlotsByDay[currentEditingDay] || [];
    const hasOverlap = currentSlots.some((slot: any) => {
      const slotStart = convertToMinutes(slot.startTime);
      const slotEnd = convertToMinutes(slot.endTime);
      return (startMinutes < slotEnd && endMinutes > slotStart);
    });

    if (hasOverlap) {
        window.alert('Overlap Error: This slot overlaps with an existing time slot.');
        return;
    }
    
    const newSlot = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      startTime: startTime,
      endTime: endTime,
      capacity: 1
    };
    
    setTimeSlotsByDay((prev: any) => {
      const currentSlots = prev[currentEditingDay] || [];
      const slotExists = currentSlots.some((slot: any) => slot.startTime === startTime && slot.endTime === endTime);
      if (slotExists) return prev;
      
      const updatedSlots = [...currentSlots, newSlot].sort((a, b) => convertToMinutes(a.startTime) - convertToMinutes(b.startTime));
      return { ...prev, [currentEditingDay]: updatedSlots };
    });
    
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
  };

  const addEvent = async () => {
    if (eventName && eventDate) {
      try {
        const newEvent = { name: eventName, date: eventDate };
        setSpecialDates([...specialDates, newEvent]);
        setEventName('');
        setEventDate('');
        setModalVisible2(false);
      } catch (error) {
        console.error('Failed to save special date:', error);
      }
    }
  };

  const deleteSlot = (slotId: any) => {
    if (!currentEditingDay) return;
    const slot = timeSlotsByDay[currentEditingDay].find((s: any) => s.id === slotId);
    if (!slot) return;
    
    setSlotToDelete(slot);
    setDeleteConfirmationVisible(true);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    const slotId = slotToDelete.id;
    
    try {
      if (slotId.toString().startsWith('temp-')) {
        setTimeSlotsByDay((prev: any) => ({
          ...prev,
          [currentEditingDay]: prev[currentEditingDay].filter((s: any) => s.id !== slotId)
        }));
      } else {
        await availabilityService.deleteTimeSlot(slotId);
        setTimeSlotsByDay((prev: any) => ({
          ...prev,
          [currentEditingDay]: prev[currentEditingDay].filter((s: any) => s.id !== slotId)
        }));
      }
      setDeleteConfirmationVisible(false);
      setSlotToDelete(null);
    } catch (error) {
      console.error('Failed to delete slot:', error);
    }
  };

  // 🟢 RESTORED: Fixed Database Save function with 24-hour conversion & Temp ID blocking
  const saveTimeSlotsToDatabase = async () => {
    if (!currentEditingDay) { setModalVisible(false); return; }
    
    try {
      const currentSlots = timeSlotsByDay[currentEditingDay] || [];
      const slotsToSave = currentSlots.map((slot: any) => {
        // Send snake_case and 24-hour time formatting to avoid Supabase 400 Errors
        const payload: any = {
          start_time: formatTo24Hour(slot.startTime),
          end_time: formatTo24Hour(slot.endTime),
          capacity: slot.capacity || 1
        };
        
        // Prevent 'temp-' generated IDs from crashing the database
        if (slot.id && !String(slot.id).startsWith('temp-')) {
          payload.id = slot.id;
        }
        
        return payload;
      });
      
      await availabilityService.saveTimeSlots(currentEditingDay, slotsToSave);
      
      setModalVisible(false);
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
      
      const updatedSlots = await availabilityService.getTimeSlotsForDay(currentEditingDay);
      const formattedSlots = updatedSlots.map((slot: any) => ({
        id: slot.id, 
        startTime: slot.start_time,
        endTime: slot.end_time,
        capacity: slot.capacity
      }));
      
      setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: formattedSlots }));
    } catch (error) {
      console.error('Failed to save time slots:', error);
    }
  };

  const cancelTimeSlotEditing = () => {
    if (currentEditingDay) {
      availabilityService.getTimeSlotsForDay(currentEditingDay)
        .then((existingSlots: any[]) => {
          const formattedSlots = existingSlots.map((slot: any) => ({
            id: slot.id, startTime: slot.start_time, endTime: slot.end_time, capacity: slot.capacity
          }));
          setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: formattedSlots }));
        })
        .catch((error: any) => {
          setTimeSlotsByDay((prev: any) => ({ ...prev, [currentEditingDay]: [] }));
        });
    }
    setModalVisible(false);
    setStartTime(DEFAULT_START_TIME);
    setEndTime(DEFAULT_END_TIME);
  };

  const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogoutPress} />

      {/* BODY CONTENT */}
      <div className="bodyContainer">
        <div className="topContainer">
          <div className="subTopContainer">
            <IoDocumentTextOutline size={20} color="#3d67ee" style={{ marginTop: '2px' }} />
            <span className="blueText" style={{ marginLeft: '10px' }}>Appointments / Availability Settings</span>
          </div>
          <div className="subTopContainer" style={{ justifyContent: 'center', flex: 0.5, marginLeft: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <IoNotifications size={21} color="#3d67ee" style={{ marginTop: '3px' }} />
            </button>
          </div>
        </div>

        {/* SETTINGS CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', marginTop: '30px', height: '85%' }}>
          
          {/* LEFT SIDE (Calendar & Events) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '300px' }}>
            
            {/* 🟢 RESTORED: Custom Calendar replaces standard date input */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#333' }}>Check Booked Dates</h3>
                <CustomCalendar 
                    selectedDate={selectedCalendarDate} 
                    onSelectDate={setSelectedCalendarDate} 
                    bookedDates={bookedDates} 
                    availableDays={dayAvailability} /* 🟢 NEW: Grays out toggled-off days! */
                />
                <div style={{ marginTop: '15px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                    <p>Use this reference tool to see which dates have active appointments before closing slots.</p>
                </div>
            </div>

            {/* Special Dates Section */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', flex: 1, boxShadow: '0 0 18px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>Special Dates</h3>
              
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: '15px' }}>
                <table className="dataTable" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>Event</th>
                            <th style={{ textAlign: 'right', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {specialDates.length === 0 ? (
                            <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: '#999', fontStyle: 'italic' }}>No special dates added.</td></tr>
                        ) : (
                            specialDates.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '10px 0', fontSize: '13px' }}>{item.name}</td>
                                    <td style={{ padding: '10px 0', fontSize: '13px', textAlign: 'right' }}>{item.date}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>

              <button 
                onClick={() => setModalVisible2(true)}
                className="gradientBtn submitBtn" 
                style={{ width: '100%', padding: '12px', margin: 0 }}
              >
                + Add Special Date
              </button>
            </div>
          </div>

          {/* RIGHT SIDE (Availability Toggles) */}
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', flex: 2, overflowY: 'auto', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Availability Settings</h2>
            <p style={{ fontSize: '14px', marginTop: '10px', color: '#888' }}>Manage available days, working hours, and appointment slots for vet bookings.</p>

            <div style={{ marginTop: '20px' }}>
              {DAYS_OF_WEEK.map((day) => (
                <React.Fragment key={day}>
                  <div style={{ display: 'flex', alignItems: 'center', opacity: dayAvailability[day] ? 1 : 0.6, padding: '15px 0' }}>
                    <label className="switch" style={{ margin: 0, marginRight: '20px' }}>
                      <input 
                        type="checkbox" 
                        checked={dayAvailability[day]} 
                        onChange={() => handleDayToggle(day)} 
                      />
                      <span className="slider"></span>
                    </label>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: dayAvailability[day] ? '#000' : '#666', width: '100px', textTransform: 'capitalize' }}>
                      {day}
                    </span>
                    
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                        onClick={() => dayAvailability[day] && openTimeSlotModalForDay(day)}
                        disabled={!dayAvailability[day]}
                        style={{
                            display: 'flex', alignItems: 'center', background: 'none', border: 'none', 
                            cursor: dayAvailability[day] ? 'pointer' : 'not-allowed',
                            color: dayAvailability[day] ? '#3d67ee' : '#999',
                            fontWeight: '600', fontSize: '15px'
                        }}
                        >
                        <span>Time Slot</span>
                        <IoTimeOutline size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </div>
                  </div>
                  {day !== 'saturday' && <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* TIME SLOTS EDITOR MODAL */}
        {modalVisible && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '70%', maxWidth: '800px', display: 'flex', flexDirection: 'column', padding: '30px', maxHeight: '85%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {currentEditingDay ? `Time Slots for ${currentEditingDay.charAt(0).toUpperCase() + currentEditingDay.slice(1)}` : 'Time Slots'}
                </h2>
                <button onClick={cancelTimeSlotEditing} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <IoClose size={24} color="#333" />
                </button>
              </div>

              {loadingTimeSlots ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', gap: '30px', flex: 1, overflow: 'hidden' }}>
                  
                  {/* Left Section: Time Inputs */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    <TimeSelector label="Start Time" value={startTime} onChange={setStartTime} />
                    <TimeSelector label="End Time" value={endTime} onChange={setEndTime} />
                    
                    <button onClick={addSlot} className="gradientBtn submitBtn" style={{ width: '100%', margin: 0, marginTop: '10px' }}>
                      + Add Slot
                    </button>
                  </div>

                  {/* Right Section: Slots Table */}
                  <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee', paddingLeft: '30px' }}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table className="dataTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Start</th>
                            <th style={{ textAlign: 'left' }}>End</th>
                            <th style={{ textAlign: 'center' }}>Capacity</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlotsByDay[currentEditingDay]?.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>No time slots configured</td></tr>
                          ) : (
                            timeSlotsByDay[currentEditingDay]?.map((item: any) => (
                              <tr key={item.id}>
                                <td>{formatToAMPM(item.startTime)}</td>
                                <td>{formatToAMPM(item.endTime)}</td>
                                <td style={{ textAlign: 'center' }}>{item.capacity || 1}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => deleteSlot(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <IoTrashOutline size={20} color="#d32f2f" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {currentEditingDay && timeSlotsByDay[currentEditingDay] && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '15px' }}>
                        {timeSlotsByDay[currentEditingDay].length} time slot(s) configured
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button onClick={cancelTimeSlotEditing} style={{ padding: '10px 25px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#d32f2f', fontWeight: '600' }}>Cancel</button>
                <button onClick={saveTimeSlotsToDatabase} style={{ padding: '10px 25px', backgroundColor: '#3d67ee', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600' }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* ADD SPECIAL DATE MODAL */}
        {modalVisible2 && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '30%', minWidth: '350px', padding: '30px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>Add Special Event</h2>
              
              <div className="formGroup">
                <input type="text" placeholder="Event Name" value={eventName} onChange={(e) => setEventName(e.target.value)} className="formInput" />
              </div>
              <div className="formGroup">
                <input type="date" placeholder="Event Date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="formInput" />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button onClick={() => setModalVisible2(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#d32f2f', fontWeight: '600' }}>Cancel</button>
                <button onClick={addEvent} style={{ flex: 1, padding: '10px', backgroundColor: '#3d67ee', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600' }}>+ Add Event</button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirmationVisible && (
          <div className="modalOverlay">
            <div className="modalContainer" style={{ width: '40%', maxWidth: '400px', padding: '30px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>Delete Time Slot</h2>
              <p style={{ fontSize: '16px', marginBottom: '25px', color: '#555' }}>
                Are you sure you want to delete {slotToDelete ? `${formatToAMPM(slotToDelete.startTime)} - ${formatToAMPM(slotToDelete.endTime)}` : 'this time slot'}?
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => { setDeleteConfirmationVisible(false); setSlotToDelete(null); }} style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#e0e0e0', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button onClick={confirmDeleteSlot} style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#d32f2f', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* LOGOUT/ALERT MODAL */}
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
                  onClick={() => { setLogoutModalVisible(false); if (modalConfig.onConfirm) modalConfig.onConfirm(); }} 
                >
                  {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}