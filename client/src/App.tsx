import { useState } from 'react'
import './App.css'
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

function App() {

  return (
    <>
    <GlobalEMR/>
    <UserProfile/>
    <GlobalInventory/>
    
    <AdminHome/>
    <GlobalLogin/>
    <UserPetProfile/>
    <UserAppointmentView />
    <UserAppointmentBook/>
    <UserHome/>
    
    <AdminHome/>
    <DoctorHome/>
    </>
  )
}

export default App
