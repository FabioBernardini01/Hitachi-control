import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refreshToken"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/login`, { username, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      setToken(res.data.token);
      setRefreshToken(res.data.refreshToken);

      // Aggiorna subito last_seen dopo login
      try {
        await axios.post(`${BACKEND_URL}/update-last-seen`, {}, {
          headers: { Authorization: `Bearer ${res.data.token}` }
        });
      } catch (e) {
        // Ignora eventuali errori di update last_seen
      }

      return { success: true };
    } catch (err) {
      // Prendi il messaggio e i tentativi rimasti dal backend, se presenti
      const message = err.response?.data?.message || "Errore di login";
      const attemptsLeft = err.response?.data?.attemptsLeft;
      return { success: false, message, attemptsLeft };
    }
  };

  const logout = async () => {
    try {
      // Prova prima con Authorization header (logout normale)
      await axios.post(`${BACKEND_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      // Se fallisce, prova con il token come query param (logout fallback)
      try {
        await axios.post(`${BACKEND_URL}/logout?token=${token}`);
      } catch (err) {
        // Ignora errori di logout
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, setToken, refreshToken, setRefreshToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth()  {
  return useContext(AuthContext);
}

//