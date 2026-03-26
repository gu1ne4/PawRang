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
import UserHome from './user_pages/UserHome'
import UserAppointmentBook from './user_pages/UserAppointmentBook'
import UserPetProfile from './user_pages/UserPetProfile'
import UserAppointmentView from './user_pages/UserAppointmentView'
import GlobalLogin from './global_pages/GlobalLogin'
import UserProfile from './user_pages/UserProfile'
import GlobalInventory from './global_pages/GlobalInventory'
import GlobalEMR from './global_pages/GlobalEMR'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route -> Send user to Login automatically */}
        <Route path="/" element={<Navigate to="/accounts" />} />

        {/* Login Module Screens */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassPage />} />
        <Route path="/change-pass-otp" element={<ChangePassOTP />} />
        <Route path="/change-password" element={<ChangePass />} />
        <Route path="/update-account" element={<UpdateAccPage />} />
        <Route path="/change-creds" element={<ChangeCreds />} />

        {/* Admin Navigation Screens (These match your NavBar.tsx paths!) */}
        <Route path="/home" element={<AdminDashboard />} /> 
        <Route path="/accounts" element={<AdminHome />} /> {/* Employees page */}
        <Route path="/useraccounts" element={<AdminUserAccPage />} />
        <Route path="/schedule" element={<AdminSchedule />} />
        <Route path="/availSettings" element={<AdminAvailSettings />} />
        <Route path="/audit" element={<AdminAuditPage />} />
        <Route path="/settings" element={<AdminSettingsPage />} />
        <Route path="/history" element={<AdminHistory/>} />

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