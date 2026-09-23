import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminAccess, fetchAdminAccess } from '../../utils/categoryPages';
import './AdminNavigation.css';

const AdminNavigation: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const [access, setAccess] = useState<{ userId: string; permissions: AdminAccess } | null>(null);
  useEffect(() => {
    let active = true;
    setAccess(null);
    if (isAuthenticated && userId) void fetchAdminAccess().then((permissions) => {
      if (active) setAccess({ userId, permissions });
    }).catch(() => { /* Public navigation remains available if access cannot be checked. */ });
    return () => { active = false; };
  }, [isAuthenticated, userId, user?.email]);
  if (!isAuthenticated || access?.userId !== user?.id || !access) return null;
  const { contentEditor, reservationManager } = access.permissions;
  if (!contentEditor && !reservationManager) return null;
  return <nav className="admin-navigation" aria-label="Admin navigation">
    <div className="container">
      <span>Ventus admin</span>
      {contentEditor && <>
        <NavLink to="/admin/homepage">Homepage</NavLink>
        <NavLink to="/admin/categories" end>Category pages</NavLink>
        <NavLink to="/admin/categories/new">+ New category</NavLink>
      </>}
      {reservationManager && <NavLink to="/admin/reservations">Reservations</NavLink>}
    </div>
  </nav>;
};
export default AdminNavigation;
