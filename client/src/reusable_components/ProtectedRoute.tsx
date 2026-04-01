import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // E.g., ['Admin', 'Veterinarian']
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const sessionString = localStorage.getItem('userSession');

  // BOUNCER CHECK 1: Are they logged in at all?
  if (!sessionString) {
    return <Navigate to="/login" replace />;
  }

  const session = JSON.parse(sessionString);

  // BOUNCER CHECK 2: Do they have the right role to be here?
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    
    // If they have the wrong role, kick them back to their proper home page
    if (session.userType === 'patient') {
      return <Navigate to="/UserHome" replace />;
    } else if (session.role === 'Veterinarian' || session.role === 'Receptionist') {
      return <Navigate to="/DoctorHomePage" replace />;
    } else {
      // Default fallback for employees who sneak into the wrong room
      return <Navigate to="/Home" replace />; 
    }
  }

  // If they pass all checks, open the door and render the requested page!
  return <Outlet />;
};

export default ProtectedRoute;