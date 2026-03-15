import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DoctorStyles.css';

// Icons
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
  IoChevronUpOutline,
  IoChevronDownOutline,
  IoCreateOutline,
  IoNotificationsOutline,
  IoPersonAddOutline,
  IoLayersOutline,
  IoHourglassOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoCheckmarkCircleOutline,
  IoDocumentTextOutline as IoDocumentText,
  IoPeopleOutline as IoPeople
} from 'react-icons/io5';
import Navbar from '../reusable_components/NavBar';

interface Doctor {
  id: number;
  name: string;
  username: string;
  role: string;
  image?: string;
}

interface Appointment {
  id: number;
  clientName: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

interface Patient {
  id: number;
  name: string;
  owner: string;
  service: string;
  date: string;
}

interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  icon: string;
  color: string;
}

const DoctorHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showAppointmentsDropdown, setShowAppointmentsDropdown] = useState<boolean>(false);
  
  // Mock data - replace with actual data from API
  const currentUser: Doctor = {
    id: 1,
    name: 'Dr. Margaret Hilario',
    username: 'margaret.hilario',
    role: 'Veterinarian',
    image: '/assets/userImg.jpg'
  };

  const appointments: Appointment[] = [
    { id: 1, clientName: 'Sarah Johnson', date: 'Mar 15, 2024', time: '09:30 AM', status: 'Confirmed' },
    { id: 2, clientName: 'Michael Chen', date: 'Mar 15, 2024', time: '11:00 AM', status: 'Pending' },
    { id: 3, clientName: 'Emily Rodriguez', date: 'Mar 16, 2024', time: '02:15 PM', status: 'Confirmed' },
    { id: 4, clientName: 'David Kim', date: 'Mar 16, 2024', time: '04:30 PM', status: 'Cancelled' },
    { id: 5, clientName: 'Lisa Thompson', date: 'Mar 17, 2024', time: '10:00 AM', status: 'Confirmed' },
  ];

  const recentPatients: Patient[] = [
    { id: 1, name: 'Max', owner: 'John Smith', service: 'Check-up', date: 'Mar 15' },
    { id: 2, name: 'Luna', owner: 'Maria Garcia', service: 'Grooming', date: 'Mar 14' },
    { id: 3, name: 'Rocky', owner: 'Robert Taylor', service: 'Vaccination', date: 'Mar 11' },
    { id: 4, name: 'Bella', owner: 'Sarah Johnson', service: 'Dental', date: 'Mar 10' },
  ];

  const notifications: Notification[] = [
    { 
      id: 1, 
      title: 'New appointment scheduled', 
      description: 'John Smith - Tomorrow at 9:00 AM', 
      time: '5 min ago',
      icon: 'calendar',
      color: '#3d67ee'
    },
    { 
      id: 2, 
      title: 'Lab results ready', 
      description: 'Maria Garcia - Blood work completed', 
      time: '2 hours ago',
      icon: 'document',
      color: '#f59e0b'
    },
    { 
      id: 3, 
      title: 'Appointment completed', 
      description: 'Robert Johnson - Check-up finished', 
      time: '3 hours ago',
      icon: 'checkmark',
      color: '#10b981'
    },
    { 
      id: 4, 
      title: 'New patient registered', 
      description: 'Sarah Williams - Initial consultation', 
      time: '1 day ago',
      icon: 'people',
      color: '#8b5cf6'
    },
  ];

  const getStatusStyle = (status: string): string => {
    switch(status) {
      case 'Confirmed': return 'status-confirmed';
      case 'Pending': return 'status-pending';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getServiceStyle = (service: string): string => {
    switch(service) {
      case 'Check-up': return 'service-checkup';
      case 'Grooming': return 'service-grooming';
      case 'Vaccination': return 'service-vaccination';
      case 'Dental': return 'service-dental';
      default: return '';
    }
  };

  const formatDate = (): string => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (): string => {
    const date = new Date();
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleLogout = (): void => {
    // Add logout logic here
    navigate('/login');
  };
  

  return (
    <div className="biContainer">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="bodyContainer">
        <div className="tableContainer">
          {/* Left Column */}
          <div className="leftContainer">
            {/* Doctor Profile Card */}
            <div className="profileCard">
              <div className="profileHeader">
                <div className="profileInfo">
                  <div className="profileNameSection">
                    <h2 className="doctorName">{currentUser.name}</h2>
                    <p className="doctorUsername">@{currentUser.username}</p>
                    <p className="doctorRole">{currentUser.role}</p>
                  </div>
                  <div className="profileDateTime">
                    <div className="glassContainer">
                      <span className="dateTimeText">
                        {formatDate()} - {formatTime()}
                      </span>
                    </div>
                    <button className="editProfileBtn">
                      <IoCreateOutline size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="profileAvatar">
                <img 
                  src={currentUser.image || '/assets/userImg.jpg'}
                  alt={currentUser.name}
                  className="doctorAvatar"
                />
              </div>
            </div>

            {/* Monthly Reports */}
            <h3 className="sectionTitle">Monthly Reports</h3>
            <p className="sectionSubtitle">Overview of this month's clinic activity and performance.</p>
            
            <div className="reportsContainer">
              <div className="reportCard">
                <div className="reportHeader">
                  <IoPeople size={21} color="#3d67ee" />
                  <span>Total Patients</span>
                </div>
                <div className="reportValue">
                  <span className="valueNumber">75</span>
                  <span className="trendBadge trend-up">
                    <IoArrowUpOutline size={12} />
                    <span>2%</span>
                  </span>
                </div>
              </div>

              <div className="reportCard">
                <div className="reportHeader">
                  <IoCalendarClearOutline size={21} color="#3d67ee" />
                  <span>Total Appointments</span>
                </div>
                <div className="reportValue">
                  <span className="valueNumber">50</span>
                  <span className="trendBadge trend-down">
                    <IoArrowDownOutline size={12} />
                    <span>5%</span>
                  </span>
                </div>
              </div>

              <div className="reportCard">
                <div className="reportHeader">
                  <IoHourglassOutline size={21} color="#3d67ee" />
                  <span>Pending Appointments</span>
                </div>
                <div className="reportValue">
                  <span className="valueNumber">20</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <h3 className="sectionTitle">Quick Actions</h3>
            <p className="sectionSubtitle">Shortcuts for frequently used tasks.</p>
            
            <div className="quickActions">
              <button className="quickActionBtn" style={{ borderColor: '#3566ee' }}>
                <IoCalendarOutline size={30} color="#3566ee" />
                <span style={{ color: '#3566ee' }}>Appointments</span>
              </button>
              <button className="quickActionBtn" style={{ borderColor: '#eb8716' }}>
                <IoNotificationsOutline size={30} color="#eb8716" />
                <span style={{ color: '#eb8716' }}>Notifications</span>
              </button>
              <button className="quickActionBtn" style={{ borderColor: '#c201c2' }}>
                <IoPersonAddOutline size={30} color="#c201c2" />
                <span style={{ color: '#c201c2' }}>Add Patient</span>
              </button>
              <button className="quickActionBtn" style={{ borderColor: '#f12ba5' }}>
                <IoDocumentText size={30} color="#f12ba5" />
                <span style={{ color: '#f12ba5' }}>Patient Records</span>
              </button>
              <button className="quickActionBtn" style={{ borderColor: '#ff2222' }}>
                <IoLayersOutline size={30} color="#ff2222" />
                <span style={{ color: '#ff2222' }}>Inventory</span>
              </button>
            </div>

            {/* My Appointments */}
            <div className="appointmentsCard">
              <div className="cardHeader">
                <h3 className="cardTitle">My Appointments</h3>
                <button className="viewAllBtn">View All</button>
              </div>
              <p className="appointmentTotal">Total: 8</p>

              <div className="appointmentsList">
                <div className="appointmentsHeader">
                  <span>Client Name</span>
                  <span>Date & Time</span>
                  <span className="text-center">Status</span>
                </div>

                {appointments.map(apt => (
                  <div key={apt.id} className="appointmentRow">
                    <span className="clientName">{apt.clientName}</span>
                    <span className="appointmentDateTime">{apt.date} • {apt.time}</span>
                    <div className="statusCell">
                      <span className={`statusBadge ${getStatusStyle(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Patients */}
            <div className="patientsCard">
              <h3 className="cardTitle">Recent Patients</h3>

              <div className="patientsList">
                <div className="patientsHeader">
                  <span>Patient Name</span>
                  <span>Owner</span>
                  <span className="text-center">Service</span>
                  <span className="text-center">Date</span>
                </div>

                {recentPatients.map(patient => (
                  <div key={patient.id} className="patientRow">
                    <span className="patientName">{patient.name}</span>
                    <span className="patientOwner">{patient.owner}</span>
                    <div className="serviceCell">
                      <span className={`serviceBadge ${getServiceStyle(patient.service)}`}>
                        {patient.service}
                      </span>
                    </div>
                    <span className="patientDate">{patient.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="rightContainer">
            {/* Notifications */}
            <div className="notificationsCard">
              <div className="notificationsHeader">
                <div className="notificationsTitle">
                  <IoNotificationsOutline size={18} />
                  <h3>Recent Notifications</h3>
                </div>
                <button className="viewAllBtn">View All</button>
              </div>

              <div className="notificationsList">
                {notifications.map(notif => (
                  <div key={notif.id} className="notificationItem">
                    <div className="notificationIcon" style={{ backgroundColor: `${notif.color}20` }}>
                      {notif.icon === 'calendar' && <IoCalendarOutline size={16} color={notif.color} />}
                      {notif.icon === 'document' && <IoDocumentText size={16} color={notif.color} />}
                      {notif.icon === 'checkmark' && <IoCheckmarkCircleOutline size={16} color={notif.color} />}
                      {notif.icon === 'people' && <IoPeople size={16} color={notif.color} />}
                    </div>
                    <div className="notificationContent">
                      <p className="notificationTitle">{notif.title}</p>
                      <p className="notificationDesc">{notif.description}</p>
                    </div>
                    <span className="notificationTime">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="calendarCard">
              <div className="calendarGradient">
                <div className="calendarHeader">
                  <button className="calendarNav" onClick={() => {}}>‹</button>
                  <span className="calendarMonth">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button className="calendarNav" onClick={() => {}}>›</button>
                </div>

                <div className="calendarWeekdays">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <span key={day} className="weekday">{day}</span>
                  ))}
                </div>

                <div className="calendarDays">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      className={`calendarDay ${day === new Date().getDate() ? 'today' : ''}`}
                      onClick={() => setSelectedCalendarDate(`${day}`)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorHome;