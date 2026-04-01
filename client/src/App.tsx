import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './admin_pages/AdminHome'
import DoctorHome from './doctor_pages/DoctorHome'
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
import UserProfile from './user_pages/UserProfile'
import GlobalInventory from './global_pages/GlobalInventory'
import GlobalEMR from './global_pages/GlobalEMR'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/user/home" element={<UserHome />} />
        <Route path="/user/pet-profile" element={<UserPetProfile />} />
        <Route path="/user/appointments" element={<UserAppointmentView />} />
        <Route path="/user/book-appointment" element={<UserAppointmentBook />} />
        <Route path="/user/profile" element={<UserProfile />} />

        <Route path="/admin/home" element={<AdminHome />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUserAccPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/audit" element={<AdminAuditPage />} />
        <Route path="/admin/history" element={<AdminHistory />} />

        <Route path="/admin/schedule" element={<AdminSchedule />} />
        <Route path="/admin/reschedule" element={<AdminRescheduleModal />} />
        <Route path="/admin/availability" element={<AdminAvailSettings />} />
        <Route path="/admin/cancel-appointment" element={<AdminCancelAppointmentModal />} />

        <Route path="/Home" element={<Navigate to="/admin/home" replace />} />
        <Route path="/Accounts" element={<Navigate to="/admin/home" replace />} />
        <Route path="/UserAccounts" element={<Navigate to="/admin/users" replace />} />
        <Route path="/Schedule" element={<Navigate to="/admin/schedule" replace />} />
        <Route path="/AvailSettings" element={<Navigate to="/admin/availability" replace />} />
        <Route path="/History" element={<Navigate to="/admin/history" replace />} />
        <Route path="/Audit" element={<Navigate to="/admin/audit" replace />} />
        <Route path="/Settings" element={<Navigate to="/admin/settings" replace />} />

        <Route path="/home" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/accounts" element={<Navigate to="/admin/home" replace />} />
        <Route path="/useraccounts" element={<Navigate to="/admin/users" replace />} />
        <Route path="/schedule" element={<Navigate to="/admin/schedule" replace />} />
        <Route path="/availSettings" element={<Navigate to="/admin/availability" replace />} />
        <Route path="/history" element={<Navigate to="/admin/history" replace />} />
        <Route path="/audit" element={<Navigate to="/admin/audit" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

        <Route path="/doctor/home" element={<DoctorHome />} />
        <Route path="/doctor-home" element={<Navigate to="/doctor/home" replace />} />

        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<GlobalLogin />} />

        <Route path="/forgot-password" element={<ResetPasswordPage1 />} />
        <Route path="/resetpassword" element={<ResetPasswordPage1 />} />
        <Route path="/confirmOTP" element={<ConfirmOTP />} />
        <Route path="/ConfirmOTP" element={<ConfirmOTP />} />
        <Route path="/change-password" element={<ResetPasswordPage2 />} />
        <Route path="/ChangePassword" element={<ResetPasswordPage2 />} />

        <Route path="/UserHome" element={<Navigate to="/user/home" replace />} />
        <Route path="/user/appointment-book" element={<Navigate to="/user/book-appointment" replace />} />
        <Route path="/user/appointment-view" element={<Navigate to="/user/appointments" replace />} />

        <Route path="/inventory" element={<GlobalInventory />} />
        <Route path="/patient-records" element={<GlobalEMR />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
