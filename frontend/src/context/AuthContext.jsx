import { createContext, useEffect, useState } from "react";
import { getProfile, loginUser } from "../services/auth.service";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (formData) => {
    const res = await loginUser(formData);

    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);

    return res;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const loadUser = async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        const res = await getProfile();
        setUser(res.data);
      }
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};