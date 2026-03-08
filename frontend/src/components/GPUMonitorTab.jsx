import React, { useState, useEffect } from 'react';

const GPUMonitorTab = () => {
  const [gpuInfo, setGpuInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGPUInfo = async () => {
    try {
      const res = await fetch('http://localhost:8000/gpu/info');
      const data = await res.json();
      setGpuInfo(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      await fetch('http://localhost:8000/gpu/cleanup');
      fetchGPUInfo();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGPUInfo();
    const interval = setInterval(fetchGPUInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#666'}}>Loading GPU info...</div>;
  if (!gpuInfo || !gpuInfo.available) return <div style={{padding:'40px',textAlign:'center',color:'#666'}}>GPU not available (CUDA not detected)</div>;

  const pct = gpuInfo.usage_percent || 0;
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';

  return (
    <div style={{padding:'24px',maxWidth:'800px',margin:'0 auto'}}>
      <h2 style={{marginBottom:'24px',color:'white',fontSize:'24px'}}>🎮 GPU Monitor (RTX 3070)</h2>
      
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px',marginBottom:'24px'}}>
        <div style={{background:'#1a1a2e',padding:'20px',borderRadius:'12px'}}>
          <div style={{color:'#888',fontSize:'12px',marginBottom:'8px'}}>Total VRAM</div>
          <div style={{color:'white',fontSize:'28px',fontWeight:'bold'}}>{gpuInfo.total_gb} GB</div>
        </div>
        <div style={{background:'#1a1a2e',padding:'20px',borderRadius:'12px'}}>
          <div style={{color:'#888',fontSize:'12px',marginBottom:'8px'}}>Free VRAM</div>
          <div style={{color:'white',fontSize:'28px',fontWeight:'bold'}}>{gpuInfo.free_gb} GB</div>
        </div>
        <div style={{background:'#1a1a2e',padding:'20px',borderRadius:'12px'}}>
          <div style={{color:'#888',fontSize:'12px',marginBottom:'8px'}}>Allocated</div>
          <div style={{color:'white',fontSize:'28px',fontWeight:'bold'}}>{gpuInfo.allocated_gb} GB</div>
        </div>
        <div style={{background:'#1a1a2e',padding:'20px',borderRadius:'12px'}}>
          <div style={{color:'#888',fontSize:'12px',marginBottom:'8px'}}>Usage</div>
          <div style={{color:color,fontSize:'28px',fontWeight:'bold'}}>{pct.toFixed(1)}%</div>
        </div>
      </div>

      <div style={{background:'#1a1a2e',padding:'20px',borderRadius:'12px',marginBottom:'24px'}}>
        <div style={{color:'#888',fontSize:'12px',marginBottom:'8px'}}>VRAM Usage</div>
        <div style={{width:'100%',height:'24px',background:'#0d0d1a',borderRadius:'8px',overflow:'hidden'}}>
          <div style={{width:pct+'%',height:'100%',background:color,transition:'width 0.3s'}} />
        </div>
      </div>

      <div style={{display:'flex',gap:'12px'}}>
        <button onClick={handleCleanup} style={{padding:'12px 24px',background:'#ef4444',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'bold',fontSize:'14px'}}>🧹 Cleanup VRAM</button>
        <button onClick={fetchGPUInfo} style={{padding:'12px 24px',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'bold',fontSize:'14px'}}>🔄 Refresh</button>
      </div>
    </div>
  );
};

export default GPUMonitorTab;
