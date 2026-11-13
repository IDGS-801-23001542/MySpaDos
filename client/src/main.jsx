
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter, Navigate, Route, Routes, useLocation,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import { Layout } from './components/Layout.jsx';
import { Spinner } from './components/UI.jsx';

import HomePage from './pages/Home.jsx';
import LoginPage, {
  RegisterPage, ForgotPage, ResetPage,
} from './pages/Auth.jsx';
import RoomsPage, { RoomPage } from './pages/Rooms.jsx';
import AccountPage from './pages/Account.jsx';
import StaffHome from './pages/StaffHome.jsx';
import CatalogPage from './pages/Catalog.jsx';
import BookingsPage from './pages/Bookings.jsx';
import ServicesPage from './pages/Services.jsx';

import './styles/main.css';
import './styles/navigation.css';

function Protected({ role, children }) {
  const { identity, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!identity) {
    return (
      <Navigate
        to="/acceso"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  const allowed = role === 'PERSONAL'
    ? ['ADMIN', 'EMPLEADO'].includes(identity.user.role)
    : identity.user.role === role;

  if (role && !allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />

            <Route path="salas" element={<RoomsPage />} />
            <Route path="salas/:id" element={<RoomPage />} />

            <Route path="acceso" element={<LoginPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="recuperar" element={<ForgotPage />} />
            <Route path="restablecer/:token" element={<ResetPage />} />

            <Route
              path="mi-cuenta"
              element={<Navigate to="/mis-reservaciones" replace />}
            />

            <Route
              path="mis-reservaciones"
              element={
                <Protected role="CLIENTE">
                  <AccountPage mode="bookings" />
                </Protected>
              }
            />

            <Route
              path="mi-perfil"
              element={
                <Protected role="CLIENTE">
                  <AccountPage mode="profile" />
                </Protected>
              }
            />

            <Route
              path="personal/mi-perfil"
              element={
                <Protected role="PERSONAL">
                  <AccountPage mode="profile" />
                </Protected>
              }
            />

            <Route
              path="personal"
              element={
                <Protected role="PERSONAL">
                  <StaffHome />
                </Protected>
              }
            />

            <Route
              path="personal/reservaciones"
              element={
                <Protected role="PERSONAL">
                  <BookingsPage />
                </Protected>
              }
            />

            <Route
              path="personal/servicios"
              element={
                <Protected role="PERSONAL">
                  <ServicesPage />
                </Protected>
              }
            />

            {[
              ['empleados', 'employees'],
              ['clientes', 'clients'],
              ['sucursales', 'branches'],
              ['salas', 'rooms'],
              ['horarios', 'schedules'],
              ['tratamientos', 'treatments'],
              ['productos', 'products'],
            ].map(([route, resource]) => (
              <Route
                key={route}
                path={`personal/${route}`}
                element={
                  <Protected role="ADMIN">
                    <CatalogPage resource={resource} />
                  </Protected>
                }
              />
            ))}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
