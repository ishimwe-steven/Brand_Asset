import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  getProfile,
  loginUser,
} from "../services/auth.service";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================================
  // LOGIN
  // ======================================
  const login = async (formData) => {
    const response = await loginUser({
      email: formData.email.trim(),
      password: formData.password,
    });

    /*
      loginUser() already returns response.data.

      Expected backend response:
      {
        success: true,
        message: "Login successful",
        data: {
          token: "...",
          user: {...},
          next_action: null
        }
      }
    */
    const data = response?.data;

    if (!data?.token || !data?.user) {
      throw new Error(
        response?.message ||
          "Invalid login response from server."
      );
    }

    localStorage.setItem("token", data.token);

    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    setUser(data.user);

    return data;
  };

  // ======================================
  // LOGOUT
  // ======================================
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  // ======================================
  // LOAD CURRENT USER
  // ======================================
  const loadUser = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        return;
      }

      const response = await getProfile();

      /*
        getProfile() also returns response.data.

        It may return:
        {
          success: true,
          data: {
            user: {...}
          }
        }

        or:
        {
          success: true,
          data: {...user fields}
        }
      */
      const profile =
        response?.data?.user ||
        response?.data ||
        null;

      if (!profile) {
        throw new Error(
          "User profile was not returned."
        );
      }

      setUser(profile);

      localStorage.setItem(
        "user",
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error(
        "Failed to load current user:",
        error.response?.data ||
          error.message ||
          error
      );

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        loadUser,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};