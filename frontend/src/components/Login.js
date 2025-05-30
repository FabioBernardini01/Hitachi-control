import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const navigate = useNavigate();

  // Cambia password state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdFields, setChangePwdFields] = useState({
    username: "", oldPassword: "", newPassword: "", confirmPassword: ""
  });
  const [showPwd, setShowPwd] = useState({
    old: false, new: false, confirm: false
  });
  const [changePwdMsg, setChangePwdMsg] = useState("");
  const [changePwdSuccess, setChangePwdSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setErrorMsg(result.message);
      setAttemptsLeft(result.attemptsLeft);
      setErrorModal(true);
    }
  };

  const closeErrorModal = () => {
    setErrorModal(false);
    setErrorMsg("");
    setAttemptsLeft(null);
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Cambia password handlers
  const handleChangePwd = async () => {
    setChangePwdMsg("");
    setChangePwdSuccess(false);
    if (
      !changePwdFields.username ||
      !changePwdFields.oldPassword ||
      !changePwdFields.newPassword ||
      !changePwdFields.confirmPassword
    ) {
      setChangePwdMsg("Tutti i campi sono obbligatori.");
      return;
    }
    if (changePwdFields.newPassword !== changePwdFields.confirmPassword) {
      setChangePwdMsg("Le nuove password non coincidono.");
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/change-password`, changePwdFields);
      setChangePwdMsg("Password aggiornata con successo.");
      setChangePwdSuccess(true);
      setTimeout(() => {
        setShowChangePwd(false);
        setChangePwdFields({ username: "", oldPassword: "", newPassword: "", confirmPassword: "" });
        setChangePwdMsg("");
        setChangePwdSuccess(false);
      }, 1500);
    } catch (err) {
      setChangePwdMsg(err.response?.data?.message || "Errore.");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-cyan-100 px-4">
      <div className="mb-10 text-center">
        <img
          src="/logo.png"
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
            type={passwordVisible ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-3 text-gray-500"
            tabIndex={-1}
          >
            {passwordVisible ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
        <button
          type="button"
          className="w-full mt-2 text-blue-600 underline"
          onClick={() => setShowChangePwd(true)}
        >
          Cambia password
        </button>
      </form>

      {/* Modale per l'errore */}
      {errorModal && (
        <div className="modal bg-black bg-opacity-50 fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Errore</h3>
            <p>{errorMsg}</p>
            {attemptsLeft !== undefined && attemptsLeft !== null && attemptsLeft > 0 && (
              <p className="mt-2 text-sm text-gray-700">
                Tentativi rimasti: <span className="font-bold">{attemptsLeft}</span>
              </p>
            )}
            <button
              onClick={closeErrorModal}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Modale Cambia Password */}
      {showChangePwd && (
        <div className="modal bg-black bg-opacity-50 fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-2xl font-semibold text-center mb-4">Cambia password</h2>
            <input
              type="text"
              placeholder="Username"
              value={changePwdFields.username}
              onChange={e => setChangePwdFields(f => ({ ...f, username: e.target.value }))}
              className="w-full p-2 border rounded mb-2"
            />
            <div className="relative mb-2">
              <input
                type={showPwd.old ? "text" : "password"}
                placeholder="Vecchia password"
                value={changePwdFields.oldPassword}
                onChange={e => setChangePwdFields(f => ({ ...f, oldPassword: e.target.value }))}
                className="w-full p-2 border rounded"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => ({ ...p, old: !p.old }))}
                className="absolute right-3 top-3 text-gray-500"
                tabIndex={-1}
              >
                {showPwd.old ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative mb-2">
              <input
                type={showPwd.new ? "text" : "password"}
                placeholder="Nuova password"
                value={changePwdFields.newPassword}
                onChange={e => setChangePwdFields(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full p-2 border rounded"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                className="absolute right-3 top-3 text-gray-500"
                tabIndex={-1}
              >
                {showPwd.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative mb-2">
              <input
                type={showPwd.confirm ? "text" : "password"}
                placeholder="Conferma nuova password"
                value={changePwdFields.confirmPassword}
                onChange={e => setChangePwdFields(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full p-2 border rounded"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-3 top-3 text-gray-500"
                tabIndex={-1}
              >
                {showPwd.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <div className={changePwdSuccess ? "text-green-600 text-center mb-2" : "text-red-500 text-center mb-2"}>
              {changePwdMsg}
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <button
                onClick={handleChangePwd}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                disabled={changePwdSuccess}
              >
                Aggiorna password
              </button>
              <button
                onClick={() => {
                  setShowChangePwd(false);
                  setChangePwdFields({ username: "", oldPassword: "", newPassword: "", confirmPassword: "" });
                  setChangePwdMsg("");
                  setChangePwdSuccess(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}