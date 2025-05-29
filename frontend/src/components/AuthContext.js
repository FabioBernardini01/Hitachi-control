import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

 const login = async (username, password) => {
  const res = await axios.post(`${BACKEND_URL}/login`, { username, password });
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("refreshToken", res.data.refreshToken); // <--- aggiungi questa riga
  setToken(res.data.token);
};
const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken"); // <--- aggiungi questa riga
  setToken(null);
};

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
