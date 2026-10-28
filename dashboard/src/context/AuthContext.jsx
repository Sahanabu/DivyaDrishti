import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('divyadrishti_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('divyadrishti_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAuthenticated = !!token;

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('divyadrishti_token', newToken);
    localStorage.setItem('divyadrishti_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('divyadrishti_token');
    localStorage.removeItem('divyadrishti_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
