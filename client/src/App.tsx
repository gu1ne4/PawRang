import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './admin_pages/AdminHome'
import DoctorHome from './doctor_pages/DoctorHome'
import DoctorAppointments from './doctor_pages/DoctorAppointments'
import DoctorSettings from './doctor_pages/DoctorSettings'
import NurseHome from './nurse_pages/NurseHome'
import UserHome from './user_pages/UserHome'
import UserAppointmentBook from './user_pages/UserAppointmentBook'
import UserPetProfile from './user_pages/UserPetProfile'
import UserAppointmentView from './user_pages/UserAppointmentView'
import AdminDashboard from './admin_pages/AdminDashboard'
import AdminUserAccPage from './admin_pages/AdminUserAccPage'
import AdminSettingsPage from './admin_pages/AdminSettingsPage'
import AdminAuditPage from './admin_pages/AdminAuditPage'
import AdminCancelAppointmentModal from './admin_pages/AdminCancelAppointmentModal'
import AdminSchedule from './admin_pages/AdminSchedule'
import AdminRescheduleModal from './admin_pages/AdminRescheduleModal'
import AdminAvailSettings from './admin_pages/AdminAvailSettings'
import AdminHistory from './admin_pages/AdminHistory'
import Registration from './global_pages/Registration'
import Login from './global_pages/Login'
import ResetPasswordPage1 from './global_pages/ResetPasswordPage1'
import ConfirmOTP from './global_pages/ConfirmOTP'
import ResetPasswordPage2 from './global_pages/ResetPasswordPage2'
import GlobalLogin from './global_pages/GlobalLogin'
import ChangeCreds from './global_pages/ChangeCreds'
import UserProfile from './user_pages/UserProfile'
import GlobalInventory from './global_pages/GlobalInventory'
import GlobalInventoryIN from './global_pages/GlobalInventoryIN'
import GlobalInventoryOUT from './global_pages/GlobalInventoryOUT'
import GlobalInventoryLogs from './global_pages/GlobalInventoryLogs'
import GlobalInventoryArchive from './global_pages/GlobalInventoryArchive'
import GlobalEMR from './global_pages/GlobalEMR'
import AdminAnalytics from './admin_pages/AdminAnalytics';
import GlobalBilling from './global_pages/GlobalBilling';
import ProtectedRoute from './reusable_components/ProtectedRoute';
import GlobalAlert from './reusable_components/GlobalAlert';

function App() {
  return (
    <BrowserRouter>
      <GlobalAlert />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/user/home" element={<UserHome />} />
        <Route path="/UserHome" element={<Navigate to="/user/home" replace />} />

        <Route element={<ProtectedRoute allowedRoles={['User', 'Patient']} />}>
          <Route path="/user/pet-profile" element={<UserPetProfile />} />
          <Route path="/user/appointments" element={<UserAppointmentView />} />
          <Route path="/user/book-appointment" element={<UserAppointmentBook />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/appointment-book" element={<Navigate to="/user/book-appointment" replace />} />
          <Route path="/user/appointment-view" element={<Navigate to="/user/appointments" replace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Administrator']} />}>
          <Route path="/admin/home" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminHome />} />
          <Route path="/admin/users" element={<AdminUserAccPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />
          <Route path="/admin/history" element={<AdminHistory />} />

          <Route path="/admin/schedule" element={<AdminSchedule />} />
          <Route path="/admin/reschedule" element={<AdminRescheduleModal />} />
          <Route path="/admin/availability" element={<AdminAvailSettings />} />
          <Route path="/admin/cancel-appointment" element={<AdminCancelAppointmentModal />} />

          <Route path="/Home" element={<Navigate to="/admin/home" replace />} />
          <Route path="/Accounts" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/UserAccounts" element={<Navigate to="/admin/users" replace />} />
          <Route path="/Schedule" element={<Navigate to="/admin/schedule" replace />} />
          <Route path="/AvailSettings" element={<Navigate to="/admin/availability" replace />} />
          <Route path="/History" element={<Navigate to="/admin/history" replace />} />
          <Route path="/Audit" element={<Navigate to="/admin/audit" replace />} />
          <Route path="/Settings" element={<Navigate to="/admin/settings" replace />} />


          <Route path="/home" element={<Navigate to="/admin/home" replace />} />
          <Route path="/accounts" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/useraccounts" element={<Navigate to="/admin/users" replace />} />
          <Route path="/schedule" element={<Navigate to="/admin/schedule" replace />} />
          <Route path="/availSettings" element={<Navigate to="/admin/availability" replace />} />
          <Route path="/history" element={<Navigate to="/admin/history" replace />} />
          <Route path="/audit" element={<Navigate to="/admin/audit" replace />} />
          <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

          <Route path="/analytics" element={<AdminAnalytics />} />
          <Route path="/billing" element={<GlobalBilling />} />

          <Route path="/inventory" element={<GlobalInventory />} />
          <Route path="/inventory-in" element={<GlobalInventoryIN />} />
          <Route path="/inventory-out" element={<GlobalInventoryOUT />} />
          <Route path="/inventory-logs" element={<GlobalInventoryLogs />} />
          <Route path="/inventory-archive" element={<GlobalInventoryArchive />} />
          <Route path="/patient-records" element={<GlobalEMR />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['Clinic Staff', 'Staff']} />}>
          <Route path="/clinic-staff" element={<Navigate to="/clinic-staff/home" replace />} />
          <Route path="/clinic-staff/home" element={<AdminDashboard />} />
          <Route path="/clinic-staff/analytics" element={<AdminAnalytics />} />
          <Route path="/clinic-staff/appointments" element={<Navigate to="/clinic-staff/appointments/schedule" replace />} />
          <Route path="/clinic-staff/appointments/schedule" element={<AdminSchedule />} />
          <Route path="/clinic-staff/appointments/availability" element={<AdminAvailSettings />} />
          <Route path="/clinic-staff/appointments/history" element={<AdminHistory />} />
          <Route path="/clinic-staff/billing" element={<GlobalBilling />} />
          <Route path="/clinic-staff/inventory" element={<GlobalInventory />} />
          <Route path="/clinic-staff/inventory-in" element={<GlobalInventoryIN />} />
          <Route path="/clinic-staff/inventory-out" element={<GlobalInventoryOUT />} />
          <Route path="/clinic-staff/inventory-logs" element={<GlobalInventoryLogs />} />
          <Route path="/clinic-staff/inventory-archive" element={<GlobalInventoryArchive />} />
          <Route path="/clinic-staff/medical-records" element={<GlobalEMR layoutMode="clinic-staff" readOnly />} />
          <Route path="/clinic-staff/patient-records" element={<Navigate to="/clinic-staff/medical-records" replace />} />
          <Route path="/clinic-staff/settings" element={<AdminSettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['Nurse']} />}>
          <Route path="/nurse" element={<Navigate to="/nurse/home" replace />} />
          <Route path="/nurse/home" element={<NurseHome />} />
          <Route path="/nurse/appointments" element={<Navigate to="/nurse/appointments/schedule" replace />} />
          <Route path="/nurse/appointments/schedule" element={<AdminSchedule />} />
          <Route path="/nurse/appointments/availability" element={<AdminAvailSettings readOnly />} />
          <Route path="/nurse/appointments/history" element={<AdminHistory />} />
          <Route path="/nurse/medical-records" element={<GlobalEMR />} />
          <Route path="/nurse/patient-records" element={<Navigate to="/nurse/medical-records" replace />} />
          <Route path="/nurse/billing" element={<GlobalBilling />} />
          <Route path="/nurse/inventory" element={<GlobalInventory />} />
          <Route path="/nurse/inventory-in" element={<GlobalInventoryIN />} />
          <Route path="/nurse/inventory-out" element={<GlobalInventoryOUT />} />
          <Route path="/nurse/inventory-logs" element={<GlobalInventoryLogs />} />
          <Route path="/nurse/inventory-archive" element={<GlobalInventoryArchive />} />
          <Route path="/nurse/settings" element={<AdminSettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Administrator', 'Doctor', 'Vet', 'Veterinarian']} />}>
          <Route path="/doctor/home" element={<DoctorHome />} />
          <Route path="/doctor/appointments" element={<Navigate to="/doctor/appointments/schedule" replace />} />
          <Route path="/doctor/appointments/schedule" element={<DoctorAppointments />} />
          <Route path="/doctor/appointments/availability" element={<AdminAvailSettings viewerRole="doctor" readOnly />} />
          <Route path="/doctor/appointments/history" element={<AdminHistory viewerRole="doctor" hideBillingActions />} />
          <Route path="/doctor/inventory" element={<GlobalInventory layoutMode="doctor" readOnly />} />
          <Route path="/doctor/inventory/catalog" element={<GlobalInventory layoutMode="doctor" readOnly />} />
          <Route path="/doctor/inventory-logs" element={<GlobalInventoryLogs readOnly />} />
          <Route path="/doctor/medical-records" element={<GlobalEMR layoutMode="doctor" doctorMode />} />
          <Route path="/doctor/settings" element={<DoctorSettings />} />
          <Route path="/doctor-home" element={<Navigate to="/doctor/home" replace />} />
        </Route>

        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<GlobalLogin />} />

        <Route path="/forgot-password" element={<ResetPasswordPage1 />} />
        <Route path="/resetpassword" element={<ResetPasswordPage1 />} />
        <Route path="/confirmOTP" element={<ConfirmOTP />} />
        <Route path="/ConfirmOTP" element={<ConfirmOTP />} />
        <Route path="/change-password" element={<ResetPasswordPage2 />} />
        <Route path="/ChangePassword" element={<ResetPasswordPage2 />} />
        <Route path="/employee/setup-account" element={<ChangeCreds />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
