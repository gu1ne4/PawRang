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

import Registration from './global_pages/Registration'
import Login from './global_pages/Login'
import ResetPasswordPage1 from './global_pages/ResetPasswordPage1'
import ConfirmOTP from './global_pages/ConfirmOTP'
import ResetPasswordPage2 from './global_pages/ResetPasswordPage2'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* User Routes */}
        <Route path="/user/home" element={<UserHome />} />
        <Route path="/user/pet-profile" element={<UserPetProfile />} />
        <Route path="/user/appointments" element={<UserAppointmentView />} />
        <Route path="/user/book-appointment" element={<UserAppointmentBook />} />

        {/* Admin Routes */}
        <Route path="/admin/home" element={<AdminHome />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUserAccPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/audit" element={<AdminAuditPage />} />

        {/* Admin Appointment Module */}
        <Route path="/admin/schedule" element={<AdminSchedule />} />
        <Route path="/admin/reschedule" element={<AdminRescheduleModal />} />
        <Route path="/admin/availability" element={<AdminAvailSettings />} />
        <Route path="/admin/cancel-appointment" element={<AdminCancelAppointmentModal />} />

        {/* Doctor Routes */}
        <Route path="/doctor/home" element={<DoctorHome />} />

        {/* Auth / Global */}
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<Login />} />

        {/* Password reset flow */}
        <Route path="/forgot-password" element={<ResetPasswordPage1 />} />
        <Route path="/resetpassword" element={<ResetPasswordPage1 />} />

        <Route path="/confirmOTP" element={<ConfirmOTP />} />
        <Route path="/ConfirmOTP" element={<ConfirmOTP />} />

        <Route path="/change-password" element={<ResetPasswordPage2 />} />
        <Route path="/ChangePassword" element={<ResetPasswordPage2 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App