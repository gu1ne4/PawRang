import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../apiService';
import Navbar from '../reusable_components/NavBar';
import Notifications from '../reusable_components/Notifications';
import './DoctorPortal.css';

interface CurrentUser {
  id?: string | number;
  username?: string;
  fullName?: string;
  role?: string;
  userImage?: string;
}

interface AppointmentItem {
  id?: string | number;
  dbId?: string | number;
  recordType?: string;
  ownerName?: string;
  petName?: string;
  doctor?: string;
  assignedDoctor?: string;
  veterinarian?: string;
  appointment_date?: string;
  appointmentDate?: string;
  date_only?: string;
  date_time?: string;
  appointment_time?: string;
  appointmentTime?: string;
  service?: string;
  status?: string;
  reason?: string;
  reason_for_visit?: string;
}

const getCurrentUser = (): CurrentUser | null => {
  try {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

const doctorMatchScore = (appointment: AppointmentItem, user: CurrentUser | null) => {
  if (!user) return 0;
  const doctorFields = [appointment.doctor, appointment.assignedDoctor, appointment.veterinarian].map(normalize).filter(Boolean);
  const userFields = [user.fullName, user.username].map(normalize).filter(Boolean);
  if (doctorFields.length === 0 || userFields.length === 0) return 0;
  return userFields.some((candidate) => doctorFields.some((doctor) => doctor.includes(candidate) || candidate.includes(doctor))) ? 1 : 0;
};

const DoctorAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);

  useEffect(() => {
    const sessionUser = getCurrentUser();
    setCurrentUser(sessionUser);

    const loadAppointments = async () => {
      try {
        const response = await apiService.getAppointmentsForTable();
        const items = response?.appointments || response || [];
        const normalized = Array.isArray(items) ? items : [];
        const doctorScoped = normalized.filter((appointment) => doctorMatchScore(appointment, sessionUser) > 0);
        const finalItems = doctorScoped.length > 0 ? doctorScoped : normalized;
        setAppointments(finalItems);
        setSelectedAppointment(finalItems[0] || null);
      } catch (error) {
        console.error('Failed to load doctor appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const haystack = `${appointment.petName || ''} ${appointment.ownerName || ''} ${appointment.service || ''} ${appointment.reason || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || normalize(appointment.status) === normalize(statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedAppointment && filteredAppointments.length > 0) {
      setSelectedAppointment(filteredAppointments[0]);
    }

    if (
      selectedAppointment &&
      !filteredAppointments.some((item) => (item.dbId || item.id) === (selectedAppointment.dbId || selectedAppointment.id))
    ) {
      setSelectedAppointment(filteredAppointments[0] || null);
    }
  }, [filteredAppointments, selectedAppointment]);
  const handleLogout = () => {
    localStorage.removeItem('userSession');
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  return (
    <div className="doctorPortalShell">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <main className="doctorPortalContent">
        <div className="doctorHeader">
          <div>
            <div className="doctorHeaderEyebrow">Appointment Management</div>
            <h1 className="doctorHeaderTitle">Review today’s cases and move into clinical work faster.</h1>
            <p className="doctorHeaderText">
              This page is focused on doctor workflow: finding appointments, checking case context, and jumping into medical records.
            </p>
          </div>
          <div className="doctorHeaderActions">
            <Notifications
              buttonClassName="doctorNotificationButton"
              iconClassName="doctorNotificationIcon"
            />
            <div className="doctorHeaderBadge">
              <span className="doctorHeaderBadgeLabel">Appointments Loaded</span>
              <span className="doctorHeaderBadgeValue">{appointments.length}</span>
            </div>
          </div>
        </div>

        <div className="doctorCard pad">
          <div className="doctorToolbar">
            <div className="doctorFilters">
              <input
                className="doctorInput"
                type="text"
                placeholder="Search pet, owner, or service"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select className="doctorSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="doctorMiniActions">
              <button className="doctorGhostButton" type="button" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
              <button className="doctorButton" type="button" onClick={() => navigate('/doctor/medical-records')}>
                Open Medical Records
              </button>
            </div>
          </div>

          <div className="doctorSplitGrid">
            <div className="doctorCard pad">
              {loading ? (
                <div className="doctorEmptyState">Loading appointments…</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="doctorEmptyState">No appointments matched the current filters.</div>
              ) : (
                <table className="doctorTable">
                  <thead>
                    <tr>
                      <th>Pet / Owner</th>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((appointment, index) => {
                      const appointmentKey = `${appointment.dbId || appointment.id || 'appointment'}-${index}`;
                      const isActive = (appointment.dbId || appointment.id) === (selectedAppointment?.dbId || selectedAppointment?.id);
                      return (
                        <tr
                          key={appointmentKey}
                          className={`doctorTableRow${isActive ? ' active' : ''}`}
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <td>
                            <strong>{appointment.petName || 'Unnamed Pet'}</strong>
                            <div style={{ fontSize: 12, color: '#667791', marginTop: 4 }}>
                              {appointment.ownerName || 'Unknown owner'}
                            </div>
                          </td>
                          <td>{appointment.date_only || appointment.appointment_date || appointment.appointmentDate || appointment.date_time || 'TBD'}</td>
                          <td>{appointment.service || appointment.reason || appointment.reason_for_visit || 'General visit'}</td>
                          <td>
                            <span className={`doctorStatusPill ${normalize(appointment.status) || 'pending'}`}>
                              {appointment.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="doctorCard pad">
              <h2 className="doctorSectionTitle">Appointment Details</h2>
              <p className="doctorSectionText">Select an appointment to review its patient context.</p>

              {selectedAppointment ? (
                <div className="doctorDetailStack">
                  <div className="doctorDetailBlock">
                    <span className="doctorDetailLabel">Pet</span>
                    <div className="doctorDetailValue">{selectedAppointment.petName || 'Unnamed Pet'}</div>
                  </div>
                  <div className="doctorDetailBlock">
                    <span className="doctorDetailLabel">Owner</span>
                    <div className="doctorDetailValue">{selectedAppointment.ownerName || 'Unknown owner'}</div>
                  </div>
                  <div className="doctorDetailBlock">
                    <span className="doctorDetailLabel">Schedule</span>
                    <div className="doctorDetailValue">
                      {selectedAppointment.date_only || selectedAppointment.appointment_date || selectedAppointment.appointmentDate || selectedAppointment.date_time || 'TBD'}
                      {selectedAppointment.appointment_time || selectedAppointment.appointmentTime ? ` • ${selectedAppointment.appointment_time || selectedAppointment.appointmentTime}` : ''}
                    </div>
                  </div>
                  <div className="doctorDetailBlock">
                    <span className="doctorDetailLabel">Assigned Doctor</span>
                    <div className="doctorDetailValue">
                      {selectedAppointment.doctor || selectedAppointment.assignedDoctor || selectedAppointment.veterinarian || currentUser?.fullName || 'Not assigned yet'}
                    </div>
                  </div>
                  <div className="doctorDetailBlock">
                    <span className="doctorDetailLabel">Service / Reason</span>
                    <div className="doctorDetailValue">
                      {selectedAppointment.service || selectedAppointment.reason || selectedAppointment.reason_for_visit || 'General visit'}
                    </div>
                  </div>
                  <div className="doctorMiniActions">
                    <button className="doctorButton" type="button" onClick={() => navigate('/doctor/medical-records')}>
                      Open Medical Records
                    </button>
                    <button className="doctorGhostButton" type="button" onClick={() => navigate('/doctor/inventory')}>
                      Check Inventory
                    </button>
                  </div>
                </div>
              ) : (
                <div className="doctorEmptyState">Select an appointment from the list to inspect its details.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorAppointments;
