import React, { useState, useEffect } from "react";

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await fetch("http://localhost:8000/logs");
    const data = await res.json();
    setLogs(data.logs);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-gray-200 rounded shadow mt-4">
      <h2 className="text-xl font-bold mb-2">Logs</h2>
      <div className="h-40 overflow-y-auto border rounded p-2 bg-black text-green-400">
        {logs.map((log, i) => (
          <p key={i} className="text-sm">{log}</p>
        ))}
      </div>
    </div>
  );
}
