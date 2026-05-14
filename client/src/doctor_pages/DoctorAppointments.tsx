import AdminSchedule from '../admin_pages/AdminSchedule';

export default function DoctorAppointments() {
  return <AdminSchedule viewerRole="doctor" hideBillingActions allowCreateAppointment />;
}
