import React, { useState, useEffect, useRef } from "react";
import Summary from "./Summary";
import axios from "axios";
import { useAuth } from "./AuthContext";
import ReadModbus from "./ReadModbus";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

// --- PRESET ERRORI HITACHI ---
const HITACHI_ERROR_PRESETS = {
  "0x0010-0x000f-0x0002": {
    label: "Errore scrittura: indirizzo non valido",
    details: "Function code 0x0010 (Write), Classification 0x000F (Remote operation), Error factor 0x0002 (Invalid address)"
  },
  "0x0003-0x0001-0x0005": {
    label: "Errore lettura: valore fuori range",
    details: "Function code 0x0003 (Read), Classification 0x0001 (Local), Error factor 0x0005 (Out of range)"
  },
  "0x0007-0x0002-0x0008": {
    label: "Errore comunicazione: timeout",
    details: "Function code 0x0007 (Comm), Classification 0x0002 (Comm), Error factor 0x0008 (Timeout)"
  },
  "0x000c-0x000a-0x0001": {
    label: "Errore generico: parametro mancante",
    details: "Function code 0x000C (Generic), Classification 0x000A (Parameter), Error factor 0x0001 (Missing parameter)"
  }
};

export default function Dashboard() {
  const { token, refreshToken, setToken, setRefreshToken, logout } = useAuth();
  const [company, setCompany] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [printerStatus, setPrinterStatus] = useState({});
  const [printerDetails, setPrinterDetails] = useState({});
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newPrinterDetails, setNewPrinterDetails] = useState({ model: "", location: "" });
  const [newPrinterDescription, setNewPrinterDescription] = useState("");
  const [newPrinterModbusAddress, setNewPrinterModbusAddress] = useState("");
  const [newPrinterModbusPort, setNewPrinterModbusPort] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailFields, setEmailFields] = useState({ email1: "", email2: "", email3: "" });
  const [emailError, setEmailError] = useState("");
  const [user, setUser] = useState(null);
  const [summaryPrinter, setSummaryPrinter] = useState(null);
  const [summaryKey, setSummaryKey] = useState(0);

  const maxDevices = company?.max_devices || 1;
  const canAddPrinter = printers.length < maxDevices;

  // Precompila i campi email quando apri la modale
  const handleOpenEmailModal = () => {
    setEmailFields({
      email1: company?.email1 || "",
      email2: company?.email2 || "",
      email3: company?.email3 || "",
    });
    setEmailError("");
    setShowEmailModal(true);
  };

  const showError = (message) => setErrorMessage(message);
  const clearError = () => setErrorMessage("");

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/me/company`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCompany(res.data))
      .catch(() => showError("Errore nel recupero dati azienda"));
  }, [token]);

  useEffect(() => {
    if (company) {
      axios
        .get(`${BACKEND_URL}/printers`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (Array.isArray(res.data)) {
            setPrinters(res.data);
          } else {
            setPrinters([]);
          }
        })
        .catch(() => {});
    }
  }, [company, token]);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/me/username`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data.username))
      .catch(() => showError("Errore nel recupero dati utente"));
  }, [token]);

  const handleDelete = (printerId) => {
    axios
      .post(
        `${BACKEND_URL}/printer/delete`,
        { id: printerId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        setPrinters((prev) => prev.filter((p) => p.id !== printerId));
        setPrinterStatus((prev) => {
          const copy = { ...prev };
          delete copy[printerId];
          return copy;
        });
        setPrinterDetails((prev) => {
          const copy = { ...prev };
          delete copy[printerId];
          return copy;
        });
      })
      .catch(() => {
        showError("Errore durante l'eliminazione della stampante");
      });
  };

  // --- REFRESH TOKEN AUTOMATICO ---
  const refreshIntervalRef = useRef();
  useEffect(() => {
    async function doRefresh() {
      if (!refreshToken) return logout();
      try {
        const res = await axios.post(`${BACKEND_URL}/refresh`, { refreshToken });
        setToken(res.data.token);
        setRefreshToken(res.data.refreshToken);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        console.log("[FE] Token JWT aggiornato tramite refresh token");
      } catch (err) {
        console.error("[FE] Errore nel refresh del token JWT!", err);
        logout();
      }
    }
    refreshIntervalRef.current = setInterval(doRefresh,59 * 60 * 1000); // ogni 59 minuti
    return () => clearInterval(refreshIntervalRef.current);
  }, [refreshToken, setToken, setRefreshToken, logout]);

  // Stato stampante: logica richiesta + dettagli per tooltip
  async function fetchPrinterStatus(printer) {
    try {
      // Leggi holding registro 0 (Start/Stop)
      const holdingRes = await axios.post(
        `${BACKEND_URL}/readStatus`,
        { name: printer.name, address: 0, length: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const holding0 = holdingRes.data?.data?._values?.[0];

      // Leggi input registri 0x0004, 0x0005, 0x0006 (errori)
      const errorRes = await axios.post(
        `${BACKEND_URL}/readInputRegister`,
        { name: printer.name, address: 0x0004, length: 3 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const [functionCode, classification, errorFactor] = errorRes.data?.data?._values || [];
      const errorPresent = functionCode !== 0 || classification !== 0 || errorFactor !== 0;

      // Leggi livello inchiostro (registro input 0x0BEB)
      const inkRes = await axios.post(
        `${BACKEND_URL}/readInputRegister`,
        { name: printer.name, address: 0x0BEB, length: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const inkLevel = inkRes.data?.data?._values?.[0];

      // Leggi registro warning (input 0x0003)
      const warningRes = await axios.post(
        `${BACKEND_URL}/readInputRegister`,
        { name: printer.name, address: 0x0003, length: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const warningRegister = warningRes.data?.data?._values?.[0];

      // --- LOGICA STATO + MOTIVI ---
      let status = "green";
      let reasons = [];
      let errorLabel = null;

      if (holding0 === 0) {
        status = "red";
        reasons.push("Stampante in STOP (holding 0)");
      }
      if (errorPresent) {
        status = "red";
        const errorKey = `0x${functionCode?.toString(16).padStart(4, '0')}-0x${classification?.toString(16).padStart(4, '0')}-0x${errorFactor?.toString(16).padStart(4, '0')}`.toLowerCase();
        const preset = HITACHI_ERROR_PRESETS[errorKey];
        errorLabel = preset ? preset.label : `Errore sconosciuto: functionCode=0x${functionCode?.toString(16)}, classification=0x${classification?.toString(16)}, errorFactor=0x${errorFactor?.toString(16)}`;
        reasons.push(errorLabel);
      }
      if (typeof inkLevel === "number" && inkLevel <= 2) {
        status = "red";
        reasons.push(`Inchiostro troppo basso: ${inkLevel} (input 0x0BEB)`);
      } else if (
        (typeof inkLevel === "number" && inkLevel > 2 && inkLevel <= 40) ||
        warningRegister === 1
      ) {
        if (status !== "red") status = "yellow";
        if (inkLevel > 2 && inkLevel <= 40) {
          reasons.push(`Inchiostro basso: ${inkLevel} (input 0x0BEB)`);
        }
        if (warningRegister === 1 && !(inkLevel > 2 && inkLevel <= 40)) {
          reasons.push(`Warning attivo da registro (input 0x0003)`);
        }
      }
      if (status === "green") {
        reasons.push("Tutto OK");
      }

      setPrinterStatus(prev => ({
        ...prev,
        [printer.id]: status
      }));
      setPrinterDetails(prev => ({
        ...prev,
        [printer.id]: {
          holding0,
          functionCode,
          classification,
          errorFactor,
          inkLevel,
          warningRegister,
          reasons,
          errorLabel
        }
      }));
    } catch (err) {
      setPrinterStatus(prev => ({
        ...prev,
        [printer.id]: "red"
      }));
      setPrinterDetails(prev => ({
        ...prev,
        [printer.id]: {
          holding0: "N/A",
          functionCode: "N/A",
          classification: "N/A",
          errorFactor: "N/A",
          inkLevel: "N/A",
          warningRegister: "N/A",
          reasons: ["Errore di comunicazione"],
          errorLabel: "Errore di comunicazione"
        }
      }));
    }
  }


      useEffect(() => {
        const handleUnload = () => {
          if (token) {
            navigator.sendBeacon(
              `${BACKEND_URL}/logout`,
              JSON.stringify({}),
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
      }, [token]);

  // Aggiorna stato stampanti ogni volta che cambia la lista
  useEffect(() => {
    if (printers.length > 0) {
      printers.forEach(printer => fetchPrinterStatus(printer));
    }
    // eslint-disable-next-line
  }, [printers, token]);

  // Refresh stato ogni 5 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      printers.forEach(printer => fetchPrinterStatus(printer));
    }, 5*1000); // ogni 5 secondi chiede lo stato delle stampanti
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [printers, token]);

  // Aggiorna stato di tutte le stampanti (usato da ReadModbus)
  function refreshAllPrintersStatus() {
    printers.forEach(printer => fetchPrinterStatus(printer));
  }

  // Validazione e invio aggiornamento email
  const handleUpdateEmails = async () => {
  // Validazione email 1 (obbligatoria)
  if (!emailFields.email1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFields.email1)) {
    setEmailError("Il primo indirizzo email è obbligatorio e deve essere valido.");
    return;
  }
  // Validazione email 2 (se presente)
  if (emailFields.email2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFields.email2)) {
    setEmailError("La seconda email non è valida.");
    return;
  }
  // Validazione email 3 (se presente)
  if (emailFields.email3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFields.email3)) {
    setEmailError("La terza email non è valida.");
    return;
  }

  try {
    await axios.post(
      `${BACKEND_URL}/company/updateEmails`,
      {
        id: company.id,
        email1: emailFields.email1,
        email2: emailFields.email2,
        email3: emailFields.email3,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setCompany((prev) => ({
      ...prev,
      email1: emailFields.email1,
      email2: emailFields.email2,
      email3: emailFields.email3,
    }));
    setShowEmailModal(false);
  } catch (err) {
    setEmailError("Errore durante l'aggiornamento delle email.");
  }
};

  const handleAddPrinter = () => {
    if (
      newPrinterName.trim() === "" ||
      newPrinterDetails.location.trim() === "" ||
      newPrinterModbusAddress.trim() === "" ||
      newPrinterModbusPort.trim() === ""
    ) {
      showError("Tutti i campi obbligatori devono essere compilati:\n- Nome\n- IP\n- Indirizzo Modbus\n- Porta");
      return;
    }

    if (!isValidIP(newPrinterDetails.location.trim())) {
      showError("Inserisci un indirizzo IP valido (es. 192.168.1.100)");
      return;
    }

    const newPrinter = {
      name: newPrinterName.trim(),
      model: newPrinterDetails.model.trim(),
      ip_address: newPrinterDetails.location.trim(),
      description: newPrinterDescription.trim(),
      modbus_address: newPrinterModbusAddress.trim(),
      modbus_port: newPrinterModbusPort.trim(),
      company_id: company.id,
    };

    axios
      .post(`${BACKEND_URL}/printers`, newPrinter, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPrinters((prev) => [...prev, res.data]);
        setNewPrinterName("");
        setNewPrinterDetails({ model: "", location: "" });
        setNewPrinterDescription("");
        setNewPrinterModbusAddress("");
        setNewPrinterModbusPort("");
        setIsModalOpen(false);
        clearError();
      })
      .catch((err) => {
        if (
          err.response &&
          err.response.data &&
          (err.response.data.error || err.response.data.message)
        ) {
          showError(err.response.data.error || err.response.data.message);
        } else {
          showError("Errore durante l'aggiunta della stampante");
        }
      });
  };

  const handleCloseModal = () => {
    setNewPrinterName("");
    setNewPrinterDetails({ model: "", location: "" });
    setNewPrinterDescription("");
    setNewPrinterModbusAddress("");
    setNewPrinterModbusPort("");
    setIsModalOpen(false);
    clearError();
  };

  // --- ICON COMPONENTS ---
  function StatusIcon({ status, reasons, errorLabel }) {
    // Tooltip: se errore, mostra la label dell'errore, altrimenti motivi
    let tooltip = "";
    if (status === "red" && errorLabel) {
      tooltip = errorLabel;
    } else if (reasons && reasons.length > 0) {
      tooltip = reasons.join("\n");
    } else {
      tooltip = "Tutto OK";
    }

    if (status === "green") {
      return (
        <span
          title={tooltip}
          className="inline-flex items-center justify-center rounded-lg bg-green-500 w-7 h-7"
          style={{ display: "inline-flex", verticalAlign: "middle", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="6" fill="#22c55e" />
            <path d="M6 10.5L9 13.5L14 7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      );
    }
    if (status === "yellow") {
      return (
        <span
          title={tooltip}
          className="inline-flex items-center justify-center"
          style={{ cursor: "pointer" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <polygon points="14,4 26,24 2,24" fill="#facc15" stroke="#fbbf24" strokeWidth="2"/>
            <rect x="13" y="11" width="2" height="6" rx="1" fill="#1f2937"/>
            <rect x="13" y="19" width="2" height="2" rx="1" fill="#1f2937"/>
          </svg>
        </span>
      );
    }
    if (status === "red") {
      return (
        <span
          title={tooltip}
          className="inline-flex items-center justify-center"
          style={{ cursor: "pointer" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <polygon points="14,4 26,24 2,24" fill="#ef4444" stroke="#b91c1c" strokeWidth="2"/>
            <rect x="13" y="11" width="2" height="6" rx="1" fill="#fff"/>
            <rect x="13" y="19" width="2" height="2" rx="1" fill="#fff"/>
          </svg>
        </span>
      );
    }
    return null;
  }

  return (
    <div className="p-6 bg-cyan-100 min-h-screen">
      {company ? (
        <>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold">{`Portale ${company.name}`}</h1>
            <p className="text-sm text-gray-500 mt-1">Benvenuto, {user}</p>
          </div>

          <div className="space-y-4">
            {printers.length === 0 ? (
              <p className="text-center text-gray-600 italic">
                Nessuna stampante disponibile per questa azienda.
              </p>
            ) : (
              <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="py-2 px-4 text-left">Nome</th>
                    <th className="py-2 px-4 text-left">Modello</th>
                    <th className="py-2 px-4 text-left">IP</th>
                    <th className="py-2 px-4 text-left">UID</th>
                    <th className="py-2 px-4 text-left">Porta</th>
                    <th className="py-2 px-4 text-left">Descrizione</th>
                    <th className="py-2 px-4 text-left">Stato</th>
                    <th className="py-2 px-4 text-left">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.map((printer) => (
                    <tr key={printer.id}>
                      <td className="py-2 px-4">{printer.name}</td>
                      <td className="py-2 px-4">{printer.model}</td>
                      <td className="py-2 px-4">{printer.ip_address}</td>
                      <td className="py-2 px-4">{printer.modbus_address}</td>
                      <td className="py-2 px-4">{printer.modbus_port}</td>
                      <td className="py-2 px-4">{printer.description}</td>
                      <td className="py-2 px-4">
                        <StatusIcon
                          status={printerStatus[printer.id]}
                          reasons={printerDetails[printer.id]?.reasons}
                          errorLabel={printerDetails[printer.id]?.errorLabel}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => {setSummaryPrinter(printer);
                              setSummaryKey(Date.now()); // oppure setSummaryKey(k => k+1)
                          }
                          }
                          className="bg-blue-400 text-white px-3 py-1 rounded hover:bg-blue-600 transition mr-2"
                        >
                          Riepilogo
                        </button>
                        <button
                          onClick={() => setSelectedPrinter(printer)}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
                        >
                          Seleziona
                        </button>
                        <button
                          onClick={() => handleDelete(printer.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition ml-2"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
              {summaryPrinter && (
                    <Summary
                      key={summaryKey}
                      printer={summaryPrinter}
                      token={token}
                      onClose={() => setSummaryPrinter(null)}
                    />
                  )}
          {/* Sezione per leggere i registri Modbus */}
          <div className="mt-10">
            {selectedPrinter ? (
              <ReadModbus
                printerName={selectedPrinter.name}
                defaultIp={selectedPrinter.ip_address}
                defaultPort={selectedPrinter.modbus_port}
                defaultUid={selectedPrinter.modbus_address}
                onCancel={() => setSelectedPrinter(null)}
                onUpdate={refreshAllPrintersStatus}
              />
            ) : (
              <p className="text-center text-gray-600 italic">
                Seleziona una stampante per leggere i registri Modbus.
              </p>
            )}
          </div>

          {/* Tasto per aggiungere una stampante */}
         <button
            onClick={() => {
              if (!canAddPrinter) {
                showError(`Hai già raggiunto il limite massimo di stampanti (${maxDevices}) per questa azienda.`);
                return;
              }
              setIsModalOpen(true);
            }}
            className={`mt-10 bg-blue-600 text-white p-3 rounded w-full sm:w-auto mx-auto block hover:bg-blue-700 transition ${!canAddPrinter ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!canAddPrinter}
          >
            Aggiungi una stampante
          </button>

          {/* Tasti Logout e Aggiorna email */}
          <div className="text-center mt-4 flex justify-center gap-2">
            <button
              onClick={logout}
              className="bg-red-500 text-white p-3 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
            <button
              onClick={handleOpenEmailModal}
              className="bg-yellow-400 text-gray-900 p-3 rounded hover:bg-yellow-500 transition font-semibold ml-2"
            >
              Aggiorna email
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">Caricamento...</div>
      )}

      {/* Modale per aggiungere stampante */}
      {isModalOpen && (
        <div className="modal bg-black bg-opacity-50 fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-2xl font-semibold text-center mb-4">Aggiungi Stampante</h2>
            {errorMessage && (
              <div className="text-red-500 text-center mb-4">
                <p>{errorMessage}</p>
              </div>
            )}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome stampante"
                value={newPrinterName}
                onChange={(e) => setNewPrinterName(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Modello"
                value={newPrinterDetails.model}
                onChange={(e) => setNewPrinterDetails({ ...newPrinterDetails, model: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Indirizzo IP"
                value={newPrinterDetails.location}
                onChange={(e) => setNewPrinterDetails({ ...newPrinterDetails, location: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Indirizzo Modbus"
                value={newPrinterModbusAddress}
                onChange={(e) => setNewPrinterModbusAddress(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Porta Modbus"
                value={newPrinterModbusPort}
                onChange={(e) => setNewPrinterModbusPort(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="Descrizione"
                value={newPrinterDescription}
                onChange={(e) => setNewPrinterDescription(e.target.value)}
                className="w-full p-2 border rounded"
              ></textarea>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleAddPrinter}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
              >
                Aggiungi
              </button>
              <button
                onClick={handleCloseModal}
                className="ml-2 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale aggiornamento email */}
      {showEmailModal && (
        <div className="modal bg-black bg-opacity-50 fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-2xl font-semibold text-center mb-4">Email di notifica errore</h2>
            {emailError && (
              <div className="text-red-500 text-center mb-4">
                <p>{emailError}</p>
              </div>
            )}
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email 1 (obbligatoria)"
                value={emailFields.email1}
                onChange={e => setEmailFields(f => ({ ...f, email1: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="email"
                placeholder="Email 2"
                value={emailFields.email2}
                onChange={e => setEmailFields(f => ({ ...f, email2: e.target.value }))}
                className="w-full p-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email 3"
                value={emailFields.email3}
                onChange={e => setEmailFields(f => ({ ...f, email3: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleUpdateEmails}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
              >
                Aggiorna
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="ml-2 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
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

function isValidIP(ip) {
  const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip);
}