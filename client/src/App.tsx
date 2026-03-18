import { useState } from 'react'
import './App.css'
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

import ChangeCreds from './global_pages/ChangeCreds'
import ChangePass from './global_pages/ChangePass'
import ChangePassOTP from './global_pages/ChangePassOTP'
import ForgotPassPage from './global_pages/ForgotPassPage'
import LoginPage from './global_pages/LoginPage'
import UpdateAccPage from './global_pages/UpdateAccPage'


function App() {

  return (
    <>
    <UserPetProfile/>
    <UserAppointmentView />
    <UserAppointmentBook/>
    <UserHome/>
    
    <AdminHome/>
    <DoctorHome/>
    <AdminDashboard/>
    <AdminAuditPage/>
    <AdminSettingsPage/>
    <AdminUserAccPage/>
    <AdminHome/>

    {/* Admin Appointment Module Screens */}
    <AdminSchedule/>
    <AdminRescheduleModal/>
    <AdminAvailSettings/>
    <AdminCancelAppointmentModal/>

    {/* Login Module Screens */}
    <LoginPage/>
    <ForgotPassPage/>
    <ChangePassOTP/>
    <ChangePass/>
    <UpdateAccPage/>
    <ChangeCreds/>


    <DoctorHome/>
    

      
    </>
  )
}

export default App
