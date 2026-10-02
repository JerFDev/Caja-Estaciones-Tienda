import React, { createContext, useContext, useState } from 'react';
import { UserSession, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmprendedor: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_KEY = 'muni_tienda_auth_user';

// Credenciales por defecto solicitadas por el usuario
export const DEFAULT_USERS = [
  {
    username: 'emprendedor',
    password: 'emprendedor2026',
    role: 'EMPRENDEDOR' as UserRole,
    nombre: 'Emprendedor',
  },
  {
    username: 'admin',
    password: 'muniadmin2026',
    role: 'ADMIN' as UserRole,
    nombre: 'Administrador Municipal',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error al recuperar sesión guardada:', e);
    }
    return null;
  });

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    const matched = DEFAULT_USERS.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (matched) {
      if (matched.role === 'EMPRENDEDOR') {
        try {
          await api.closeAnyOpenRegister('emprendedor');
        } catch (e) {
          console.error('Error al asegurar caja cerrada para emprendedor:', e);
        }
      }

      const sessionData: UserSession = {
        username: matched.username,
        nombre: matched.nombre,
        role: matched.role,
      };
      setUser(sessionData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      } catch (e) {
        console.error('Error al persistir sesión en localStorage:', e);
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Usuario o contraseña incorrectos. Verifique sus credenciales.',
    };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error al limpiar sesión en localStorage:', e);
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isEmprendedor = user?.role === 'EMPRENDEDOR';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isEmprendedor,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
