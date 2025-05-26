import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

// Definisci qui tutti i registri usati, con indirizzo, label e tipo
const REGISTER_DEFINITIONS = [
  // Holding registers
  { label: "Start/Stop Control Flag", address: 0x0000, type: "holding", min: 0, max: 2 },
  { label: "Print Job Registration Number", address: 0x0010, type: "holding" },
  { label: "Inter-character Space", address: 0x0011, type: "holding", min: 0, max: 10 },
  { label: "Print Speed", address: 0x0012, type: "holding", min: 1, max: 255 },
  { label: "Print Density", address: 0x0013, type: "holding", min: 1, max: 10 },
  { label: "Character Code 1", address: 0x0084, type: "holding" },
  { label: "Character Code 2", address: 0x0085, type: "holding" },
  { label: "Character Code 3", address: 0x0086, type: "holding" },

  // Input registers
  { label: "Communication Status", address: 0x0000, type: "input" },
  { label: "Receive Enable/Disable Status", address: 0x0001, type: "input" },
  { label: "Operation Status", address: 0x0002, type: "input" },
  { label: "Warning Status", address: 0x0003, type: "input" },
  { label: "Function Code (Error)", address: 0x0004, type: "input" },
  { label: "Classification (Error)", address: 0x0005, type: "input" },
  { label: "Error Factor", address: 0x0006, type: "input" },
  { label: "Operation Status (Details)", address: 0x0008, type: "input" },
  { label: "Current Job Data Length", address: 0x0EF0, type: "input" },
  { label: "Inter-character Space (input)", address: 0x0EF1, type: "input" },
  { label: "Calendar Block Count", address: 0x0EF2, type: "input" },
  // ...altri registri calendario...
  { label: "Ink Remaining Level", address: 0x0BEB, type: "input", min: 0x01, max: 0x0F },
];

// Mappa indirizzo → registro per velocizzare lookup
const addrTypeToRegister = REGISTER_DEFINITIONS.reduce((acc, reg) => {
  acc[`${reg.type}-${reg.address}`] = reg;
  return acc;
}, {});

// Funzione per visualizzare valori umani
function getHumanValue(reg, value) {
  if (!reg) return value;
  switch (reg.address) {
    case 0x0000: // Start/Stop
      return value === 1 ? "START" : "STOP";
    case 0x0094: // Remote operation flag
      return value === 0 ? "Avvio remoto" : "No remoto";
    case 0x0100: // Job Mode
      if (value === 0) return "Manuale";
      if (value === 1) return "Automatica";
      if (value === 2) return "Altro";
      return value;
    case 0x0051: // Pump status
    case 0x0052: // Valve status
      return value === 1 ? "ON" : "OFF";
    default:
      return value;
  }
}


// Aggiorna la funzione renderWriteInput per usare i nuovi range
function renderWriteInput(reg, writeValue, setWriteValue) {
  if (!reg) return null;
  switch (reg.address) {
    case 0x0000: // Start/Stop
      return (
        <select
          value={writeValue}
          onChange={e => setWriteValue(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Seleziona...</option>
          <option value="1">START</option>
          <option value="0">STOP</option>
          <option value="2">ERRORE</option>
        </select>
      );
    case 0x0011: // Inter-character space
      return (
        <input
          type="number"
          min={reg.min}
          max={reg.max}
          value={writeValue}
          onChange={e => setWriteValue(e.target.value)}
          className="border p-2 rounded w-full"
        />
      );
    case 0x0012: // Print speed
      return (
        <input
          type="number"
          min={reg.min}
          max={reg.max}
          value={writeValue}
          onChange={e => setWriteValue(e.target.value)}
          className="border p-2 rounded w-full"
        />
      );
    case 0x0013: // Print density
      return (
        <input
          type="number"
          min={reg.min}
          max={reg.max}
          value={writeValue}
          onChange={e => setWriteValue(e.target.value)}
          className="border p-2 rounded w-full"
        />
      );
    // ...resto invariato...
    default:
      return (
        <input
          type="number"
          value={writeValue}
          onChange={e => setWriteValue(e.target.value)}
          className="border p-2 rounded w-full"
        />
      );
  }
}

export default function ReadModbus({ printerName = "", onCancel, onUpdate }) {
  const { token } = useAuth();

  const [name, setName] = useState(printerName);
  const [address, setAddress] = useState(REGISTER_DEFINITIONS[0].address);
  const [length, setLength] = useState("1");
  const [data, setData] = useState(null);
  const [lastRead, setLastRead] = useState(null);
  const [selectedRegisterType, setSelectedRegisterType] = useState(REGISTER_DEFINITIONS[0].type);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeAddress, setWriteAddress] = useState("");
  const [writeValue, setWriteValue] = useState("");
  const [writeLoading, setWriteLoading] = useState(false);
  const [lastReadAddress, setLastReadAddress] = useState(address);

  useEffect(() => {
    setName(printerName);
    setData(null);
    setLastRead(null);
    setAddress(REGISTER_DEFINITIONS[0].address);
    setLength("1");
    setSelectedRegisterType(REGISTER_DEFINITIONS[0].type);
  }, [printerName]);

  const handleRead = async () => {
    if (!/^\d+$/.test(length) || Number(length) < 1) {
      alert("La lunghezza deve essere un numero intero positivo.");
      return;
    }

    try {
      const url =
        selectedRegisterType === "input"
          ? "http://localhost:4000/readInputRegister"
          : "http://localhost:4000/readStatus";

      const response = await axios.post(
        url,
        { name, address, length: Number(length) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const vals = response.data.data || response.data.status || null;
      if (vals && vals._values) {
        setData(vals);
        setLastRead(new Date());
        setLastReadAddress(address);
      } else {
        alert("Lettura completata, ma nessun dato è stato restituito.");
        setData(null);
      }
    } catch (error) {
      console.error("Errore nella lettura dei registri Modbus:", error);
      let msg = "Errore nella lettura dei registri Modbus.";
      if (error.response?.data?.message) {
        msg += " " + error.response.data.message;
      } else if (error.code === "ECONNABORTED") {
        msg += " Timeout di connessione.";
      } else if (error.code === "ECONNREFUSED") {
        msg += " Connessione rifiutata: la stampante non è raggiungibile.";
      } else if (error.code === "EHOSTUNREACH") {
        msg += " Host non raggiungibile: controlla l'IP della stampante.";
      }
      alert(msg);
      setData(null);
      setLastRead(null);
    }
  };

  const handleWrite = async () => {
    if (!/^\d+$/.test(writeAddress) || writeAddress === "") {
      alert("Inserisci un indirizzo di registro valido.");
      return;
    }
    // Gestione input custom: caratteri ASCII
    const reg = addrTypeToRegister[`holding-${writeAddress}`];
    let valueToSend = writeValue;
    if (reg && [0x0084, 0x0085, 0x0086].includes(reg.address)) {
      valueToSend = writeValue ? writeValue.charCodeAt(0) : 0;
    }
    // Range numerici personalizzati
    if (reg && reg.address === 0x0011 && (valueToSend < 0 || valueToSend > 10)) {
      alert("Valore fuori range (0-10)");
      return;
    }
    if (reg && reg.address === 0x0012 && (valueToSend < 1 || valueToSend > 255)) {
      alert("Valore fuori range (1-255)");
      return;
    }
    if (reg && reg.address === 0x0013 && (valueToSend < 1 || valueToSend > 10)) {
      alert("Valore fuori range (1-10)");
      return;
    }
    if (!/^\d+$/.test(valueToSend) && !([0x0084, 0x0085, 0x0086].includes(reg?.address))) {
      alert("Inserisci un valore numerico valido.");
      return;
    }
    setWriteLoading(true);
    try {
      await axios.post(
        "http://localhost:4000/writeRegisters",
        {
          name,
          address: Number(writeAddress),
          values: [Number(valueToSend)]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowWriteModal(false);
      setWriteAddress("");
      setWriteValue("");

      // Aggiorna la tabella:
      if (data && data._values) {
        // Se c'era già una lettura, ripeti la stessa
        handleRead();
      } else {
        // Altrimenti, fai una read solo del registro appena scritto
        const url =
          "http://localhost:4000/readStatus"; // solo holding, perché aggiorni solo holding
        const response = await axios.post(
          url,
          { name, address: Number(writeAddress), length: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const vals = response.data.data || response.data.status || null;
        if (vals && vals._values) {
          setData(vals);
          setLastRead(new Date());
          setLastReadAddress(Number(writeAddress));
        }
      }

    if (typeof onUpdate === "function") onUpdate();


    } catch (error) {
      let msg = "Errore nell'aggiornamento del registro.";
      if (error.response?.data?.message) {
        msg += " " + error.response.data.message;
      }
      alert(msg);
    } finally {
      setWriteLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Leggi Stato Stampante</h2>

      <input
        type="text"
        placeholder="Nome stampante"
        value={name}
        readOnly
        className="border p-2 rounded mb-2 w-full bg-gray-100 cursor-not-allowed"
      />

      <div className="flex gap-2 mb-2">
        <select
          value={address + "-" + selectedRegisterType}
          onChange={e => {
            const [addr, type] = e.target.value.split("-");
            setAddress(Number(addr));
            setSelectedRegisterType(type);
          }}
          className="border p-2 rounded w-full"
        >
          {REGISTER_DEFINITIONS.map(({ label, address, type }) => (
            <option key={type + "-" + address} value={address + "-" + type}>
              [{type.toUpperCase()}] {label} (0x{address.toString(16).toUpperCase()})
            </option>
          ))}
        </select>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Lunghezza"
          value={length}
          maxLength={3}
          max={125}
          onChange={e => {
            // Permetti solo numeri e massimo 125
            let val = e.target.value.replace(/\D/, "");
            if (val === "") val = "1";
            if (Number(val) > 125) val = "125";
            setLength(val);
          }}
          className="border p-2 rounded w-1/4"
          style={{ MozAppearance: "textfield" }}
        />
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={handleRead}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Leggi
        </button>

        {selectedRegisterType === "holding" && (
          <button
            onClick={() => {
              setWriteAddress(address); // auto-compila con l'indirizzo selezionato
              setWriteValue("");
              setShowWriteModal(true);
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Aggiorna
          </button>
        )}

        <button
          onClick={() => {
            setData(null);
            setLastRead(null);
            setAddress(REGISTER_DEFINITIONS[0].address);
            setLength("1");
            setSelectedRegisterType(REGISTER_DEFINITIONS[0].type);
            if (onCancel) onCancel();
          }}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 ml-2"
        >
          Annulla
        </button>
      </div>

      {data && (
        <div className="mt-6">
          <h3 className="font-bold mb-2 text-lg">Valori dei registri</h3>
          <div className="mb-2 text-sm text-gray-600">
            Ultima lettura {name} {lastRead && lastRead.toLocaleTimeString()}
          </div>

          <table className="min-w-full bg-gray-50 rounded shadow">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Registro</th>
                <th className="py-2 px-4 border-b text-left">Valore</th>
                <th className="py-2 px-4 border-b text-left">Indirizzo (dec)</th>
                <th className="py-2 px-4 border-b text-left">Indirizzo (hex)</th>
              </tr>
            </thead>
            <tbody>
              {data._values &&
                data._values.map((value, idx) => {
                  const reg = addrTypeToRegister[`${selectedRegisterType}-${lastReadAddress + idx}`];
                  return (
                    <tr key={idx} className="hover:bg-gray-100">
                      <td className="py-2 px-4 border-b">{reg ? reg.label : `Registro ${lastReadAddress + idx}`}</td>
                      <td className="py-2 px-4 border-b font-mono">{getHumanValue(reg, value)}</td>
                      <td className="py-2 px-4 border-b">{lastReadAddress + idx}</td>
                      <td className="py-2 px-4 border-b">0x{(lastReadAddress + idx).toString(16).toUpperCase()}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale scrittura */}
      {showWriteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-xs">
            <h3 className="font-bold mb-4 text-lg">Aggiorna registro</h3>

            <div className="mb-2">
              <label className="block text-sm mb-1">Indirizzo registro</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={writeAddress}
                readOnly
                className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed"
                placeholder="Es: 0"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Valore</label>
              {renderWriteInput(addrTypeToRegister[`holding-${writeAddress}`], writeValue, setWriteValue)}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowWriteModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                disabled={writeLoading}
              >
                Annulla
              </button>

              <button
                onClick={handleWrite}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                disabled={writeLoading}
              >
                {writeLoading ? "Aggiorno..." : "Aggiorna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}