import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getDefaultRouteForUser, getSessionUser, userHasAllowedRole } from '../auth/roles';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // E.g., ['Admin', 'Veterinarian']
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const session = getSessionUser();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!userHasAllowedRole(session, allowedRoles)) {
    return <Navigate to={getDefaultRouteForUser(session)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
