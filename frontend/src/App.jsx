import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, Activity, Crosshair, Map as MapIcon, Wifi, Battery, X, Maximize2 } from 'lucide-react';

export default function App() {
  const threatData = [
    { name: 'Critical', value: 2, color: '#ef4444' },
    { name: 'High', value: 4, color: '#f97316' },
    { name: 'Medium', value: 7, color: '#eab308' },
    { name: 'Normal', value: 120, color: '#22c55e' }
  ];

  const eventTimeline = [
    { time: '00:00', events: 10, intrusions: 0 },
    { time: '04:00', events: 25, intrusions: 2 },
    { time: '08:00', events: 45, intrusions: 1 },
    { time: '12:00', events: 70, intrusions: 5 },
    { time: '16:00', events: 90, intrusions: 3 },
    { time: '20:00', events: 110, intrusions: 6 },
    { time: '24:00', events: 127, intrusions: 7 }
  ];

  const [telemetry, setTelemetry] = useState(null);
  const [focusedPanel, setFocusedPanel] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([{ role: 'ai', text: 'IBSAP Assistant online. Awaiting command.' }]);

  const handleCommand = async (e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const userText = chatInput;
      setChatInput('');
      setChatLog(prev => [...prev, { role: 'user', text: userText }]);

      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText, context: telemetry || {} })
        });
        const data = await res.json();
        setChatLog(prev => [...prev, { role: 'ai', text: data.reply }]);
      } catch (err) {
        setChatLog(prev => [...prev, { role: 'ai', text: 'CONNECTION FAILED.' }]);
      }
    }
  };

  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  // Initialize Leaflet Map with Tactical Markers
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapContainer.current._leaflet_id = null;

    const map = L.map(mapContainer.current, {
      center: [21.1945, 81.3515],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });
    mapRef.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
    }).addTo(map);

    const sectorCoords = [
      [21.1980, 81.3450], [21.2010, 81.3560], [21.1910, 81.3580], [21.1890, 81.3470]
    ];
    L.polygon(sectorCoords, {
      color: '#ef4444', weight: 2, fillColor: '#dc2626', fillOpacity: 0.15, dashArray: '4, 4'
    }).addTo(map);

    const threatIcon = L.divIcon({
      className: 'bg-transparent',
      html: `<div class="relative flex items-center justify-center w-6 h-6">
              <span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-50 animate-ping"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-300"></span>
              <span class="absolute top-6 whitespace-nowrap text-[9px] font-bold text-red-400 bg-black/80 px-1.5 py-0.5 rounded border border-red-900/50 z-50">⚠️ THREAT</span>
             </div>`,
      iconSize: [24, 24], iconAnchor: [12, 12]
    });

    const unitIcon = L.divIcon({
      className: 'bg-transparent',
      html: `<div class="relative flex items-center justify-center w-6 h-6">
              <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-40 animate-pulse"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-cyan-200 shadow-[0_0_10px_#06b6d4]"></span>
              <span class="absolute top-6 whitespace-nowrap text-[9px] font-bold text-cyan-400 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-900/50">🚓 QRT-01</span>
             </div>`,
      iconSize: [24, 24], iconAnchor: [12, 12]
    });

    const cctvIcon = L.divIcon({
      className: 'bg-transparent',
      html: `<div class="relative flex items-center justify-center w-4 h-4">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500 border border-green-300"></span>
              <span class="absolute top-4 whitespace-nowrap text-[8px] font-bold text-green-500 bg-black/80 px-1 py-0.5 rounded">C-17</span>
             </div>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });

    const droneIcon = L.divIcon({
      className: 'bg-transparent',
      html: `<div class="relative flex items-center justify-center w-4 h-4">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-amber-300 shadow-[0_0_8px_#f59e0b]"></span>
              <span class="absolute top-4 whitespace-nowrap text-[8px] font-bold text-amber-400 bg-black/80 px-1 py-0.5 rounded">🚁 DRONE-02</span>
             </div>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });

    L.marker([21.1960, 81.3510], { icon: threatIcon }).addTo(map);
    L.marker([21.1925, 81.3555], { icon: unitIcon }).addTo(map);
    L.marker([21.1980, 81.3480], { icon: cctvIcon }).addTo(map);
    L.marker([21.1940, 81.3460], { icon: cctvIcon }).addTo(map);
    L.marker([21.1975, 81.3540], { icon: droneIcon }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    const timer = setTimeout(() => { map.invalidateSize(); }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let ws;
    let reconnectTimer;
    const connectWS = () => {
      ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      ws.onmessage = (event) => {
        try { setTelemetry(JSON.parse(event.data)); } 
        catch (err) {}
      };
      ws.onclose = () => {
        setTelemetry(null);
        reconnectTimer = setTimeout(connectWS, 2000);
      };
      ws.onerror = () => {};
    };
    connectWS();
    return () => {
      if (ws) { ws.onclose = null; ws.close(); }
      clearTimeout(reconnectTimer);
    };
  }, []);

  const panels = {
    alerts: (
      <div className="p-3 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <h2 className="text-gray-400 text-xs font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" /> AI ALERTS
          </h2>
          <Maximize2 className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setFocusedPanel('alerts')} />
        </div>
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          <div className="flex justify-between items-center bg-red-950/40 border border-red-900/60 p-2.5 rounded">
            <span className="text-red-500 font-bold text-[11px]">CRITICAL INTRUSION</span>
            <span className="text-red-400 font-bold">{telemetry?.active_threats || 0}</span>
          </div>
          <div className="flex justify-between items-center bg-amber-950/30 border border-amber-900/40 p-2 rounded text-[11px]">
            <span className="text-amber-400">UNIDENTIFIED DRONE</span>
            <span className="text-amber-300">1</span>
          </div>
        </div>
      </div>
    ),
    units: (
      <div className="p-3 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <h2 className="text-gray-400 text-xs font-bold flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-500" /> RESPONSE UNITS
          </h2>
          <Maximize2 className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setFocusedPanel('units')} />
        </div>
        <div className="text-[11px] space-y-2 flex-1 min-h-0 overflow-y-auto">
          <div className="flex justify-between bg-black/40 p-2 rounded border border-gray-800">
            <span>🚓 QRT-01 (Sector 4)</span>
            <span className="text-cyan-400 font-semibold">AVAILABLE</span>
          </div>
          <div className="flex justify-between bg-black/40 p-2 rounded border border-gray-800">
            <span>🚁 DRONE-02 (Perimeter)</span>
            <span className="text-green-400 font-semibold animate-pulse">AIRBORNE</span>
          </div>
        </div>
      </div>
    ),
    threatStatus: (
      <div className="p-3 h-full flex flex-col">
        <h2 className="text-gray-400 text-xs font-bold mb-1 shrink-0">THREAT STATUS</h2>
        <div className="flex-1 min-h-0 flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={threatData} innerRadius="60%" outerRadius="90%" paddingAngle={2} dataKey="value" stroke="none">
                {threatData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[9px] text-gray-500">TOTAL</span>
            <span className="text-lg font-bold text-white">13</span>
          </div>
        </div>
        <div className="mt-1 shrink-0 border border-red-900/50 bg-red-950/30 p-1 rounded text-center">
          <span className="text-[10px] text-red-500 font-bold tracking-widest">RISK LEVEL: HIGH</span>
        </div>
      </div>
    ),
    health: (
      <div className="p-3 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <h2 className="text-gray-400 text-xs font-bold flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" /> SENSOR HEALTH
          </h2>
          <Maximize2 className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setFocusedPanel('health')} />
        </div>
        <div className="space-y-1 text-[11px] flex-1 min-h-0 overflow-y-auto">
          <div className="flex justify-between"><span>CCTV Optical</span><span className="text-green-400 font-mono">{telemetry?.sensor_health?.cctv || 0}%</span></div>
          <div className="w-full bg-gray-900 h-1.5 rounded mb-1"><div className="bg-green-500 h-full rounded" style={{ width: `${telemetry?.sensor_health?.cctv || 0}%` }}></div></div>
          <div className="flex justify-between pt-1"><span>Radar Array</span><span className="text-green-400 font-mono">{telemetry?.sensor_health?.radar || 0}%</span></div>
          <div className="w-full bg-gray-900 h-1.5 rounded"><div className="bg-green-500 h-full rounded" style={{ width: `${telemetry?.sensor_health?.radar || 0}%` }}></div></div>
        </div>
      </div>
    ),
    eventsOverview: (
      <div className="p-3 h-full flex flex-col">
        <h2 className="text-gray-400 text-xs font-bold mb-1 shrink-0">EVENTS (TODAY)</h2>
        <div className="flex justify-between mb-1 shrink-0 text-xs">
          <div><span className="text-base font-bold text-white block leading-none">127</span><span className="text-gray-500 text-[9px]">TOTAL</span></div>
          <div className="text-right"><span className="text-base font-bold text-red-500 block leading-none">7</span><span className="text-gray-500 text-[9px]">INTRUSIONS</span></div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eventTimeline}>
              <XAxis dataKey="time" stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#050b14', borderColor: '#1f293d', fontSize: '10px', padding: '4px' }} />
              <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="intrusions" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    topActiveZones: (
      <div className="p-3 h-full flex flex-col">
        <h2 className="text-gray-400 text-xs font-bold mb-3 shrink-0">TOP ACTIVE ZONES</h2>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 text-[11px]">
          <div className="flex justify-between items-center"><span className="text-gray-400">1 <span className="text-gray-200 font-bold ml-2">Z-17</span></span><span className="text-red-500 font-bold">23</span><span className="text-red-400 flex items-center gap-1.5 w-24"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> High Activity</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400">2 <span className="text-gray-200 font-bold ml-2">Z-12</span></span><span className="text-amber-500 font-bold">15</span><span className="text-amber-400 flex items-center gap-1.5 w-24"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Medium Activity</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400">3 <span className="text-gray-200 font-bold ml-2">Z-09</span></span><span className="text-amber-500 font-bold">9</span><span className="text-amber-400 flex items-center gap-1.5 w-24"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Medium Activity</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400">4 <span className="text-gray-200 font-bold ml-2">Z-15</span></span><span className="text-green-500 font-bold">6</span><span className="text-green-400 flex items-center gap-1.5 w-24"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Low Activity</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400">5 <span className="text-gray-200 font-bold ml-2">Z-08</span></span><span className="text-green-500 font-bold">4</span><span className="text-green-400 flex items-center gap-1.5 w-24"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Low Activity</span></div>
        </div>
        <div className="mt-2 shrink-0 text-center"><span className="text-[9px] text-gray-500 font-bold cursor-pointer hover:text-cyan-400 transition-colors uppercase tracking-widest">VIEW ALL ZONES →</span></div>
      </div>
    ),
    systemLog: (
      <div className="p-3 h-full flex flex-col bg-black/20">
         <h2 className="text-gray-400 text-xs font-bold mb-3 shrink-0">SYSTEM FEED</h2>
         <div className="text-[10px] font-mono text-gray-400 space-y-2 overflow-y-auto min-h-0 flex-1 pr-1">
           <p><span className="text-gray-600 mr-2">10:32:14</span><span className="text-red-500 font-bold mr-1.5">[ALERT]</span>Possible intrusion detected in Z-17</p>
           <p><span className="text-gray-600 mr-2">10:32:10</span><span className="text-cyan-500 font-bold mr-1.5">[AI]</span>Human detected by Camera C-17</p>
           <p><span className="text-gray-600 mr-2">10:32:01</span><span className="text-amber-500 font-bold mr-1.5">[THERMAL]</span>Heat signature detected (T-08)</p>
           <p><span className="text-gray-600 mr-2">10:31:52</span><span className="text-green-500 font-bold mr-1.5">[RADAR]</span>Movement detected (R-04)</p>
           <p><span className="text-gray-600 mr-2">10:31:48</span><span className="text-blue-400 font-bold mr-1.5">[SENSOR]</span>Ground sensor triggered (GS-21)</p>
         </div>
         <div className="mt-2 shrink-0 text-center border-t border-gray-800 pt-2"><span className="text-[9px] text-gray-500 font-bold cursor-pointer hover:text-cyan-400 transition-colors uppercase tracking-widest">VIEW FULL LOG →</span></div>
      </div>
    ),
    feed: (
      <div className="p-2 h-full flex flex-col">
        <div className="flex justify-between items-center mb-1 shrink-0">
          <h2 className="text-gray-400 text-[10px] font-bold flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-cyan-500" /> TACTICAL AI
          </h2>
          <Maximize2 className="w-3 h-3 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setFocusedPanel('feed')} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 mb-1 text-[10px] font-mono pr-1 min-h-0">
          {chatLog.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-gray-300 text-right' : 'text-cyan-400 text-left'}>
              <span className="opacity-50">{msg.role === 'user' ? 'OP> ' : 'AI> '}</span>
              {msg.text}
            </div>
          ))}
        </div>
        <input 
          type="text" 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Ask IBSAP..." 
          className="w-full shrink-0 bg-black/50 border border-gray-700 rounded p-1 text-[10px] text-gray-300 focus:outline-none focus:border-cyan-500"
        />
      </div>
    )
  };

  return (
    <div className="h-screen w-screen bg-commandDark text-gray-300 p-2 font-mono flex flex-col overflow-hidden select-none">
      <header className="h-10 w-full flex justify-between items-center px-4 border-b border-borderDark mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-cyan-500 w-5 h-5" />
          <h1 className="text-lg font-bold text-white tracking-widest">
            IBSAP <span className="text-[10px] text-gray-500 font-sans">COMMAND CENTER</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400">{telemetry?.timestamp || "CONNECTING..."}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${telemetry ? 'bg-red-600 animate-pulse' : 'bg-gray-600'}`}></div>
          <span className={`${telemetry ? 'text-red-500' : 'text-gray-500'} font-bold text-xs tracking-wider`}>
            {telemetry ? 'SYSTEM ARMED' : 'OFFLINE'}
          </span>
        </div>
      </header>

      {/* STRICT 100VH GRID LOCK */}
      <div className="grid grid-cols-12 grid-rows-3 gap-2 flex-1 min-h-0">
        
        {/* LEFT WING */}
        <div className="col-span-3 row-span-2 flex flex-col gap-2 min-h-0">
          <div className="bg-panelDark border border-borderDark rounded-lg flex-1 min-h-0 overflow-hidden">{panels.alerts}</div>
          <div className="bg-panelDark border border-borderDark rounded-lg flex-1 min-h-0 overflow-hidden">{panels.units}</div>
        </div>

        {/* CENTER TACTICAL WING */}
        <div className="col-span-6 row-span-2 flex flex-col gap-2 min-h-0">
          {/* Map fills 60% of center space */}
          <div className="bg-panelDark border border-borderDark rounded-lg flex-[3] relative min-h-0 overflow-hidden">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 text-gray-300 text-[10px] font-bold bg-black/60 px-2 py-1 rounded backdrop-blur">
              <MapIcon className="w-3 h-3 text-cyan-400" /> COMMON OPERATING PICTURE
            </div>
            <div ref={mapContainer} className="w-full h-full z-0" />
          </div>

          {/* INCIDENT DETAILS & SUB-FEEDS */}
          <div className="bg-panelDark border border-borderDark rounded-lg flex-[2] p-2 flex flex-col gap-2 min-h-0 overflow-hidden">
            
            {/* Top Row: Main Camera & Data */}
            <div className="flex gap-2 flex-[2] min-h-0 overflow-hidden">
              <div className="w-1/2 relative bg-black rounded border border-gray-800 flex items-center justify-center overflow-hidden">
                <img src="http://localhost:8000/video_feed" alt="Live Sector Camera" className="w-full h-full object-cover border border-cyan-900/30" />
                <div className="absolute top-2 left-2 text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded font-sans z-10 animate-pulse">
                  🔴 LIVE CAM 01
                </div>
              </div>
              
              <div className="w-1/2 flex flex-col justify-between min-h-0 overflow-hidden py-0.5">
                <div className="min-h-0">
                  <div className="flex justify-between items-start">
                    <h2 className={`font-bold text-[11px] tracking-wider truncate ${telemetry?.risk_level === 'NORMAL' ? 'text-green-500' : 'text-red-500'}`}>
                      {telemetry?.risk_level === 'NORMAL' ? 'SECTOR SECURE' : 'POSSIBLE INTRUSION'}
                    </h2>
                    {telemetry?.risk_level !== 'NORMAL' && (
                      <span className="bg-red-950/80 border border-red-900 text-red-500 text-[8px] px-1 rounded">{telemetry?.risk_level || "EVALUATING"}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 space-y-0.5 mt-1.5 truncate font-mono">
                    <p>Incident ID: <span className="text-white">{telemetry?.incident?.incident_id || "---"}</span></p>
                    <p>Sector: <span className="text-white">{telemetry?.incident?.zone || "Zone 17-B"}</span></p>
                    <p>Object Type: <span className={telemetry?.incident?.object_type === 'CLEAR' ? 'text-green-400' : 'text-amber-400'}>{telemetry?.incident?.object_type || "SCANNING..."}</span></p>
                    <p>Direction: <span className="text-white">{telemetry?.incident?.direction || "STATIC"}</span></p>
                    <p>Threats: <span className={telemetry?.active_threats > 0 ? 'text-red-400 font-bold' : 'text-gray-500'}>{telemetry?.active_threats || 0} Contacts</span></p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-1 shrink-0">
                  <button className={`flex-1 text-[9px] py-1 rounded transition truncate border ${telemetry?.risk_level !== 'NORMAL' ? 'bg-red-950/60 hover:bg-red-900 border-red-800 text-red-300' : 'bg-green-950/40 border-green-900/50 text-green-500 opacity-50 cursor-not-allowed'}`}>DISPATCH UNIT</button>
                  <button className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-[9px] py-1 rounded transition truncate">ACKNOWLEDGE</button>
                </div>
              </div>

            </div>

            {/* Bottom Row: Auxiliary Sub-Feeds */}
            <div className="flex gap-2 flex-1 min-h-0">
              
              {/* Thermal View */}
              <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden group cursor-pointer">
                <div className="absolute top-1 left-1.5 text-[8px] font-bold text-gray-400 z-10 bg-black/50 px-1 rounded backdrop-blur-sm">THERMAL</div>
                <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-purple-900 to-orange-600 opacity-60 group-hover:opacity-90 transition-opacity"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-80">
                   <div className="w-3 h-5 bg-yellow-300 blur-[3px] rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Radar View */}
              <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden cursor-pointer">
                <div className="absolute top-1 left-1.5 text-[8px] font-bold text-gray-400 z-10 bg-black/50 px-1 rounded backdrop-blur-sm">RADAR</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full aspect-square border border-green-900/40 rounded-full relative">
                    <div className="absolute top-1/2 left-1/2 w-1/2 h-[1px] bg-green-500/80 origin-left animate-[spin_3s_linear_infinite]"></div>
                    <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                </div>
              </div>

              {/* Map Position */}
              <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden cursor-pointer">
                <div className="absolute top-1 left-1.5 text-[8px] font-bold text-gray-400 z-10 bg-black/50 px-1 rounded backdrop-blur-sm">MAP POS</div>
                <div className="w-full h-full bg-[url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/14300/23800')] bg-cover bg-center opacity-60"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 border border-red-500 rounded-full animate-ping"></div>
                   <div className="w-0.5 h-0.5 bg-red-500 rounded-full absolute"></div>
                </div>
              </div>

              {/* Track History */}
              <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden cursor-pointer">
                <div className="absolute top-1 left-1.5 text-[8px] font-bold text-gray-400 z-10 bg-black/50 px-1 rounded backdrop-blur-sm">TRACK</div>
                <div className="w-full h-full flex items-center justify-center bg-gray-950 px-2">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" className="stroke-red-500 stroke-[4] fill-none opacity-80">
                    <polyline points="10,80 30,60 45,65 70,30 90,20" strokeDasharray="6,4" />
                    <circle cx="90" cy="20" r="7" className="fill-red-500" />
                  </svg>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* RIGHT WING */}
        <div className="col-span-3 row-span-2 flex flex-col gap-2 min-h-0">
          <div className="bg-panelDark border border-borderDark rounded-lg flex-1 min-h-0 overflow-hidden">{panels.threatStatus}</div>
          <div className="bg-panelDark border border-borderDark rounded-lg flex-1 min-h-0 overflow-hidden">{panels.health}</div>
        </div>

        {/* BOTTOM DECK */}
        <div className="col-span-3 row-span-1 bg-panelDark border border-borderDark rounded-lg min-h-0 overflow-hidden">
          {panels.eventsOverview}
        </div>
        <div className="col-span-3 row-span-1 bg-panelDark border border-borderDark rounded-lg min-h-0 overflow-hidden">
          {panels.topActiveZones}
        </div>
        <div className="col-span-3 row-span-1 bg-panelDark border border-borderDark rounded-lg min-h-0 overflow-hidden">
          {panels.systemLog}
        </div>
        <div className="col-span-3 row-span-1 bg-panelDark border border-borderDark rounded-lg min-h-0 overflow-hidden">
           {panels.feed}
        </div>
      </div>

      <AnimatePresence>
        {focusedPanel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-panelDark border border-cyan-500/50 rounded-xl w-3/4 h-3/4 p-6 shadow-2xl relative flex flex-col"
            >
              <button
                onClick={() => setFocusedPanel(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-black/40 border border-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 shrink-0">
                Detailed Sector Diagnostic Mode // {focusedPanel}
              </div>
              <div className="flex-1 overflow-auto min-h-0">
                {panels[focusedPanel]}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}