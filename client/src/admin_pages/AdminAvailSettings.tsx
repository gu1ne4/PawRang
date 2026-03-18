import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Web icons equivalent to Ionicons
import { 
  IoHomeOutline, IoPeopleOutline, IoChevronDownOutline, IoChevronUpOutline,
  IoPersonOutline, IoMedkitOutline, IoCalendarClearOutline, IoCalendarOutline,
  IoTodayOutline, IoTimeOutline, IoDocumentTextOutline, IoSettingsOutline,
  IoLogOutOutline, IoNotifications, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoAlertCircleOutline, IoChevronUp, IoChevronDown, IoTrashOutline, IoClose
} from 'react-icons/io5';

// Import your merged CSS file
import './AdminStyles.css';

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
//  TIME SELECTOR COMPONENT (Converted for Web)
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
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState(true); // Default open for this section

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
    setStartTime('');
    setEndTime('');
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
    if (!currentEditingDay || !startTime.trim() || !endTime.trim()) return;
    
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
    
    setStartTime('');
    setEndTime('');
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

  const saveTimeSlotsToDatabase = async () => {
    if (!currentEditingDay) { setModalVisible(false); return; }
    
    try {
      const currentSlots = timeSlotsByDay[currentEditingDay] || [];
      const slotsToSave = currentSlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity || 1
      }));
      
      await availabilityService.saveTimeSlots(currentEditingDay, slotsToSave);
      
      setModalVisible(false);
      setStartTime('');
      setEndTime('');
      
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
    setStartTime('');
    setEndTime('');
  };

  const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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

          {/* NAVIGATION MENU */}
          <div className="glassContainer scrollable-nav">
            <div style={{ marginTop: '8px' }}>
              <button className="navBtn" onClick={() => navigate('/Home')}>
                <IoHomeOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Home</span>
              </button>
            </div>

            <div>
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
                  <div>
                    <button className="navBtn" onClick={() => navigate('/UserAccounts')}>
                      <IoMedkitOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                      <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Users / Patients</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <button className="navBtn" onClick={() => setShowAppointmentsDropdown(!showAppointmentsDropdown)}>
                <IoCalendarClearOutline size={15} color="#fffefe" style={{ marginTop: '2px' }}/>
                <span className="navFont" style={{ fontWeight: '400' }}>Appointments</span>
                {showAppointmentsDropdown ? 
                  <IoChevronUpOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} /> : 
                  <IoChevronDownOutline size={14} color="#fffefe" style={{ marginLeft: '5px', marginTop: '2px' }} />
                }
              </button>
              {showAppointmentsDropdown && (
                <div style={{ marginLeft: '25px', marginTop: '5px' }}>
                  <div>
                    <button className="navBtn" onClick={() => navigate('/Schedule')}>
                      <IoCalendarOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                      <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Schedule</span>
                    </button>
                  </div>
                  <div className={isActive ? "subSelectedGlass" : ""} style={{ width: '100%' }}>
                    <button className="navBtn" onClick={() => navigate('/AvailSettings')}>
                      <IoTodayOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                      <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>Availability</span>
                    </button>
                  </div>
                  <div>
                    <button className="navBtn" onClick={() => navigate('/History')}>
                      <IoTimeOutline size={14} color="#fffefe" style={{ marginTop: '2px' }}/>
                      <span className="navFont" style={{ fontWeight: '400', fontSize: '12px' }}>History</span>
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
            
            {/* Calendar Placeholder / Reference */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 0 18px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#333' }}>Check Booked Dates</h3>
                <input 
                    type="date" 
                    value={selectedCalendarDate} 
                    onChange={(e) => setSelectedCalendarDate(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
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
                                <td>{item.startTime}</td>
                                <td>{item.endTime}</td>
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
                Are you sure you want to delete {slotToDelete ? `${slotToDelete.startTime} - ${slotToDelete.endTime}` : 'this time slot'}?
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