import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../apiService';
import Navbar from '../reusable_components/NavBar';
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

const matchesDoctor = (appointment: AppointmentItem, user: CurrentUser | null) => {
  if (!user) return true;

  const doctorCandidates = [appointment.doctor, appointment.assignedDoctor, appointment.veterinarian]
    .map(normalize)
    .filter(Boolean);
  const userCandidates = [user.fullName, user.username].map(normalize).filter(Boolean);

  if (doctorCandidates.length === 0) return true;
  return userCandidates.some((candidate) => doctorCandidates.some((doctor) => doctor.includes(candidate) || candidate.includes(doctor)));
};

const DoctorHome: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  useEffect(() => {
    const sessionUser = getCurrentUser();
    setCurrentUser(sessionUser);

    const loadAppointments = async () => {
      try {
        const response = await apiService.getAppointmentsForTable();
        const items = response?.appointments || response || [];
        setAppointments(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error('Failed to load doctor overview appointments:', error);
      }
    };

    loadAppointments();
  }, []);

  const scopedAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => matchesDoctor(appointment, currentUser));
    return filtered.length > 0 ? filtered : appointments;
  }, [appointments, currentUser]);

  const upcomingAppointments = scopedAppointments.slice(0, 5);
  const pendingCount = scopedAppointments.filter((item) => normalize(item.status) === 'pending').length;
  const handledCount = scopedAppointments.filter((item) => {
    const status = normalize(item.status);
    return status === 'confirmed' || status === 'accepted' || status === 'completed';
  }).length;
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
            <div className="doctorHeaderEyebrow">Doctor Side</div>
            <h1 className="doctorHeaderTitle">Clinical workflow support for everyday case handling.</h1>
            <p className="doctorHeaderText">
              This workspace is separated from admin operations and focuses on doctor priorities:
              appointments, medical records, and read-only inventory visibility.
            </p>
          </div>
          <div className="doctorHeaderBadge">
            <span className="doctorHeaderBadgeLabel">Signed In As</span>
            <span className="doctorHeaderBadgeValue">{currentUser?.fullName || currentUser?.username || 'Veterinarian'}</span>
          </div>
        </div>

        <div className="doctorGrid">
          <div className="doctorCard doctorStatCard">
            <span className="doctorStatLabel">Appointments in scope</span>
            <span className="doctorStatValue">{scopedAppointments.length}</span>
            <span className="doctorStatHint">Active appointment list visible from the doctor workspace.</span>
          </div>
          <div className="doctorCard doctorStatCard">
            <span className="doctorStatLabel">Pending</span>
            <span className="doctorStatValue">{pendingCount}</span>
            <span className="doctorStatHint">Cases that may still need confirmation, review, or preparation.</span>
          </div>
          <div className="doctorCard doctorStatCard">
            <span className="doctorStatLabel">Handled</span>
            <span className="doctorStatValue">{handledCount}</span>
            <span className="doctorStatHint">Confirmed or completed cases currently visible in the schedule feed.</span>
          </div>

          <section className="doctorCard doctorWideCard pad">
            <h2 className="doctorSectionTitle">Core Doctor Modules</h2>
            <p className="doctorSectionText">
              The doctor side is organized around the three areas you defined, with inventory kept read-only.
            </p>
            <div className="doctorQuickLinks">
              <Link className="doctorQuickLink" to="/doctor/appointments">
                <span className="doctorQuickLinkTitle">Appointment Management</span>
                <span className="doctorQuickLinkText">Review cases, scan schedule context, and prepare consultations quickly.</span>
              </Link>
              <Link className="doctorQuickLink" to="/doctor/inventory">
                <span className="doctorQuickLinkTitle">Inventory</span>
                <span className="doctorQuickLinkText">View stock, expiration, and item status without doctor-side edit controls.</span>
              </Link>
              <Link className="doctorQuickLink" to="/doctor/medical-records">
                <span className="doctorQuickLinkTitle">Medical Records</span>
                <span className="doctorQuickLinkText">Open records, review visits, and continue documentation in the doctor workspace.</span>
              </Link>
            </div>
          </section>

          <section className="doctorCard doctorSideCard pad">
            <h2 className="doctorSectionTitle">Upcoming Cases</h2>
            <p className="doctorSectionText">A quick view of upcoming appointments from the current schedule feed.</p>
            <div className="doctorList">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => (
                  <div className="doctorListItem" key={`${appointment.dbId || appointment.id || 'appointment'}-${index}`}>
                    <div className="doctorListPrimary">
                      <div className="doctorListTitle">{appointment.petName || 'Unnamed Pet'} • {appointment.ownerName || 'Unknown Owner'}</div>
                      <div className="doctorListMeta">
                        {appointment.date_only || appointment.appointment_date || appointment.appointmentDate || appointment.date_time || 'Date TBD'}
                        {' • '}
                        {appointment.appointment_time || appointment.appointmentTime || appointment.service || 'General appointment'}
                      </div>
                    </div>
                    <span className={`doctorStatusPill ${normalize(appointment.status) || 'pending'}`}>
                      {appointment.status || 'Pending'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="doctorEmptyState">No appointments are available yet for this doctor workspace.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DoctorHome;
