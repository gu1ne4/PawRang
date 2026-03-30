import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Admin Pages
import AdminHome from './admin_pages/AdminHome';
import AdminDashboard from './admin_pages/AdminDashboard';
import AdminUserAccPage from './admin_pages/AdminUserAccPage';
import AdminSettingsPage from './admin_pages/AdminSettingsPage';
import AdminAuditPage from './admin_pages/AdminAuditPage';

// Admin Appointment Module
import AdminSchedule from './admin_pages/AdminSchedule';
import AdminAvailSettings from './admin_pages/AdminAvailSettings';
import AdminCancelAppointmentModal from './admin_pages/AdminCancelAppointmentModal';
import AdminRescheduleModal from './admin_pages/AdminRescheduleModal';

// Global / Login Pages
import LoginPage from './global_pages/LoginPage';
import ForgotPassPage from './global_pages/ForgotPassPage';
import ChangePassOTP from './global_pages/ChangePassOTP';
import ChangePass from './global_pages/ChangePass';
import UpdateAccPage from './global_pages/UpdateAccPage';
import ChangeCreds from './global_pages/ChangeCreds';

// Doctor Pages
import DoctorHome from './doctor_pages/DoctorHome';
import AdminHistory from './admin_pages/AdminHistory';


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './admin_pages/AdminHome'
import DoctorHome from './doctor_pages/DoctorHome'
import UserHome from './user_pages/UserHome'
import UserAppointmentBook from './user_pages/UserAppointmentBook'
import UserPetProfile from './user_pages/UserPetProfile'
import UserAppointmentView from './user_pages/UserAppointmentView'
import GlobalLogin from './global_pages/GlobalLogin'
import UserProfile from './user_pages/UserProfile'
import GlobalInventory from './global_pages/GlobalInventory'
import GlobalEMR from './global_pages/GlobalEMR'
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


        <Route path="/UserHome" element={<UserHome/>} />
        <Route path="/user/appointment-book" element={<UserAppointmentBook/>} />
        <Route path="/user/pet-profile" element={<UserPetProfile/>} />
        <Route path="/user/appointment-view" element={<UserAppointmentView/>} />
        <Route path="/user/profile" element={<UserProfile/>} />

        <Route path="/Login" element={<GlobalLogin/>} />

        
        <Route path="/inventory" element={<GlobalInventory/>} />
        <Route path="/patient-records" element={<GlobalEMR/>} />




        {/* Doctor Screens */}
        <Route path="/doctor-home" element={<DoctorHome />} />

        {/* NOTE ON MODALS: 
          I left the Modals out of the routing map. Usually, modals (like AdminRescheduleModal 
          and AdminCancelAppointmentModal) shouldn't be their own separate web pages. 
          Instead, you should import them directly into AdminSchedule.tsx and use a useState 
          to pop them open (just like you did with your "Add Account Modal" in AdminHome.tsx).
        */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
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
