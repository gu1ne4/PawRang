import { useState } from 'react'
import './App.css'
import AdminHome from './admin_pages/AdminHome'
import DoctorHome from './doctor_pages/DoctorHome'
import UserHome from './user_pages/UserHome'
import UserAppointmentBook from './user_pages/UserAppointmentBook'
import UserPetProfile from './user_pages/UserPetProfile'
import UserAppointmentView from './user_pages/UserAppointmentView'

function App() {

  return (
    <>
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
