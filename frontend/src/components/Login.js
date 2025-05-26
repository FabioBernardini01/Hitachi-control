import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'; // Importa le icone Heroicons

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState(false); // Stato per la modale
  const [passwordVisible, setPasswordVisible] = useState(false); // Stato per la visibilità della password
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch {
      setErrorModal(true); // Mostra la modale in caso di errore
    }
  };

  const closeErrorModal = () => {
    setErrorModal(false); // Chiudi la modale
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible); // Alterna la visibilità della password
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-cyan-100 px-4">
      <div className="mb-10 text-center">
        <img
          src="/logo.png" // Percorso del file PNG nella cartella public
          alt="Logo"
          className="w-64 h-64 mx-auto mb-4"
        />
        <h1 className="text-5xl font-bold text-gray-800">Portale utente</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border-4 border-red-100 p-8 rounded-lg shadow-lg w-full max-w-sm space-y-5"
      >
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"} // Cambia il tipo dell'input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-3 text-gray-500"
          >
            {passwordVisible ? (
              <EyeSlashIcon className="w-5 h-5" /> // Usa Heroicons con dimensione ridotta
            ) : (
              <EyeIcon className="w-5 h-5" /> // Usa Heroicons con dimensione ridotta
            )}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>

      {/* Modale per l'errore */}
      {errorModal && (
        <div className="modal bg-black bg-opacity-50 fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Errore</h3>
            <p>Nome Utente e/o password errati</p>
            <button
              onClick={closeErrorModal}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
