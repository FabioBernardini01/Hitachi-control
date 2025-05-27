import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

export default function Summary({ printer, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary() {
      setLoading(true);
      try {
        // Leggi registri utili
        const [holding0, opStatus, warning, error, ink] = await Promise.all([
          axios.post("${BACKEND_URL}/readStatus", {
            name: printer.name, address: 0x0000, length: 1
          }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post("${BACKEND_URL}/readInputRegister", {
            name: printer.name, address: 0x0002, length: 1
          }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post("${BACKEND_URL}/readInputRegister", {
            name: printer.name, address: 0x0003, length: 1
          }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post("${BACKEND_URL}/readInputRegister", {
            name: printer.name, address: 0x0004, length: 3
          }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post("${BACKEND_URL}/readInputRegister", {
            name: printer.name, address: 0x0BEB, length: 1
          }, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!cancelled) {
          setData({
            holding0: holding0.data?.data?._values?.[0],
            opStatus: opStatus.data?.data?._values?.[0],
            warning: warning.data?.data?._values?.[0],
            functionCode: error.data?.data?._values?.[0],
            classification: error.data?.data?._values?.[1],
            errorFactor: error.data?.data?._values?.[2],
            inkLevel: ink.data?.data?._values?.[0],
          });
        }
      } catch (err) {
        if (!cancelled) setData({ error: "Errore nella lettura dei registri" });
      }
      setLoading(false);
    }
    fetchSummary();
    return () => { cancelled = true; };
  }, [printer, token]);

  if (loading) return <div className="p-4">Caricamento riepilogo...</div>;
  if (!data) return null;

  return (
    <div className="bg-gray-100 border rounded p-4 my-4">
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold">Riepilogo stampante: {printer.name}</div>
        <button onClick={onClose} className="text-red-500 font-bold">Chiudi</button>
      </div>
      {data.error ? (
        <div className="text-red-500">{data.error}</div>
      ) : (
        <ul className="text-sm">
          <li><b>Stato (holding 0):</b> {data.holding0}</li>
          <li><b>Operation status (input 0x0002):</b> {data.opStatus}</li>
          <li><b>Warning (input 0x0003):</b> {data.warning}</li>
          <li>
            <b>Errore:</b> FC={data.functionCode} CL={data.classification} EF={data.errorFactor}
          </li>
          <li><b>Livello inchiostro (input 0x0BEB):</b> {data.inkLevel}</li>
        </ul>
      )}
    </div>
  );
}