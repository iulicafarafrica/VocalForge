import React, { useState, useEffect } from 'react';

const GPUMonitor = () => {
  const [vramInfo, setVramInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCleanup, setLastCleanup] = useState(null);

  const fetchGPUInfo = async () => {
    try {
      const res = await fetch('http://localhost:8000/gpu/info');
      const data = await res.json();
      setVramInfo(data);
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const handleCleanup = async () => {
    try {
      await fetch('http://localhost:8000/gpu/cleanup');
      fetchGPUInfo();
      setLastCleanup(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchGPUInfo();
    const i = setInterval(fetchGPUInfo, 5000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!vramInfo) return <div>GPU not available</div>;

  const pct = vramInfo.usage_percent || 0;

  return (
    <div style={{padding:'16px',background:'#1f2937',borderRadius:'8px',color:'white',fontFamily:'system-ui'}}>
      <h3>?? GPU Monitor (RTX 3070)</h3>
      <div>VRAM: {pct.toFixed(1)}%</div>
      <div>Total: {vramInfo.total_gb}GB | Free: {vramInfo.free_gb}GB</div>
      <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
        <button onClick={handleCleanup}>?? Cleanup</button>
        <button onClick={fetchGPUInfo}>?? Refresh</button>
      </div>
    </div>
  );
};

export default GPUMonitor;