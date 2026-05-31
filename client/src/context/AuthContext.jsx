import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api.js';
import wsService from '../services/websocket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      api.getMe()
        .then(userData => {
          setUser(userData);
          wsService.connect(userData.id);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    api.setToken(data.token);
    setUser(data.user);
    wsService.connect(data.user.id);
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    api.setToken(data.token);
    setUser(data.user);
    wsService.connect(data.user.id);
    return data;
  };

  const logout = () => {
    api.clearToken();
    wsService.disconnect();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
