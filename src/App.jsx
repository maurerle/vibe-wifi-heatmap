


import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import HeatmapOverlay from 'heatmap.js/plugins/leaflet-heatmap';

import SpeedTest from '@cloudflare/speedtest';
import { useRef as useReactRef } from 'react';

const MAP_HEIGHT = '60vh';
const MAP_WIDTH = '100%';

function getStoredPoints() {
  try {
    return JSON.parse(localStorage.getItem('wifi_points')) || [];
  } catch {
    return [];
  }
}

function savePoints(points) {
  localStorage.setItem('wifi_points', JSON.stringify(points));
}

function App() {
  const mapRef = useRef(null);
  const [points, setPoints] = useState(getStoredPoints());
  const [currentLocation, setCurrentLocation] = useState(null);
  const [testing, setTesting] = useState(false);
  const [speedResult, setSpeedResult] = useState(null);
  const [showPoints, setShowPoints] = useState(() => {
    try { return JSON.parse(localStorage.getItem('show_points')) ?? true; } catch { return true; }
  });
  const [heatMetric, setHeatMetric] = useState(() => {
    try { return localStorage.getItem('heat_metric') || 'download'; } catch { return 'download'; }
  });

  useEffect(() => {
    if (!mapRef.current) {
      // allow very high max zoom (per user request)
      mapRef.current = L.map('map', { maxZoom: 25 }).setView([50.77, 6.1], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 25,
      }).addTo(mapRef.current);

      // Allow user to set a point by clicking on the map
      mapRef.current.on('click', function (e) {
        setCurrentLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // Add a legend control
      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.padding = '8px';
        div.style.borderRadius = '6px';
        div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
        div.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">Heatmap</div>
          <div style="font-size:12px;color:#333;">Intensity ≈ download speed</div>`;
          return div;
      };
      legend.addTo(mapRef.current);
        // remember the legend DOM so we can update it when points change
        try { mapRef.current._legendDiv = legend.getContainer(); } catch (e) { mapRef.current._legendDiv = null; }
    }
    // Clear existing markers
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        mapRef.current.removeLayer(layer);
      }
    });
    // Remove previous heat layer if present
    if (mapRef.current._heatLayer) {
      try { mapRef.current.removeLayer(mapRef.current._heatLayer); } catch {}
      mapRef.current._heatLayer = null;
    }
    // Build heat data as objects for heatmap.js: {lat, lng, value}
    const metricValues = points.map(p => (p && p[heatMetric]) || 0).filter(v => !isNaN(v));
    const statMin = metricValues.length > 0 ? Math.round(Math.min(...metricValues)) : 0;
    const statMax = metricValues.length > 0 ? Math.round(Math.max(...metricValues)) : 100;
    const statMid = Math.round((statMin + statMax) / 2);
    const heatmapData = {
      min: Math.max(0, statMin - 1),
      max: statMax || 100,
      data: points.map(pt => ({ lat: pt.lat, lng: pt.lng, value: (pt && pt[heatMetric]) || 0 }))
    };

    if (mapRef.current._heatLayer) {
      try { mapRef.current.removeLayer(mapRef.current._heatLayer); } catch {}
      mapRef.current._heatLayer = null;
    }

    if (heatmapData.data.length > 0) {
      // configure HeatmapOverlay (heatmap.js + Leaflet plugin)
      const cfg = {
        radius: 25,
        minOpacity: 0.5,
        maxOpacity: 0.8,
        blur: 0.5,
        scaleRadius: false,
        useLocalExtrema: false,
        valueField: 'value'
      };
      const heatmapLayer = new HeatmapOverlay(cfg);
      // set data
      heatmapLayer.setData(heatmapData);
      mapRef.current.addLayer(heatmapLayer);
      mapRef.current._heatLayer = heatmapLayer;
    }
      // Update legend dynamically based on download values
      try {
        const legendDiv = mapRef.current && mapRef.current._legendDiv;
        if (legendDiv) {
          if (!points || points.length === 0) {
            legendDiv.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">Heatmap</div><div style="font-size:12px;color:#666">No data</div>`;
          } else {
            // reuse computed statMin/statMid/statMax and colors (metric-aware)
            const metricLabel = heatMetric === 'upload' ? 'upload' : 'download';
            legendDiv.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">Heatmap</div>
              <div style="font-size:12px;color:#333;margin-bottom:6px;">Intensity ≈ ${metricLabel} (Mbps)</div>
              <div style="display:flex;align-items:center;gap:8px;"> <span style="width:18px;height:10px;background:blue;display:inline-block;border-radius:2px"></span> <span style="font-size:12px">${statMin}</span> </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;"> <span style="width:18px;height:10px;background:orange;display:inline-block;border-radius:2px"></span> <span style="font-size:12px">${statMid}</span> </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;"> <span style="width:18px;height:10px;background:red;display:inline-block;border-radius:2px"></span> <span style="font-size:12px">${statMax}</span> </div>`;
          }
        }
      } catch (e) {
        // ignore legend update errors
      }
    // Show current location marker
    if (currentLocation) {
      L.marker([currentLocation.lat, currentLocation.lng], {
        draggable: false,
      }).addTo(mapRef.current)
        .bindPopup('Current Location');
    }
    // Add small circle markers for each point (show numeric values) if enabled
    if (mapRef.current._pointLayer) {
      try { mapRef.current.removeLayer(mapRef.current._pointLayer); } catch {}
      mapRef.current._pointLayer = null;
    }
    if (showPoints) {
      const pointLayer = L.layerGroup();
      points.forEach(pt => {
        const cm = L.circleMarker([pt.lat, pt.lng], {
          radius: 6,
          color: '#fff',
          weight: 1,
          fillColor: '#1976d2',
          fillOpacity: 0.9,
        }).bindPopup(`Download: ${pt.download} Mbps<br/>Upload: ${pt.upload} Mbps`);
        pointLayer.addLayer(cm);
      });
      if (points.length > 0) {
        pointLayer.addTo(mapRef.current);
        mapRef.current._pointLayer = pointLayer;
      }
    }
  }, [points, currentLocation, showPoints, heatMetric]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (mapRef.current) {
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 16);
          }
        },
        err => {
          setCurrentLocation(null);
        }
      );
    }
  }, []);

  const speedtestRef = useReactRef(null);

  const runSpeedTest = () => {
    setTesting(true);
    setSpeedResult(null);
    if (speedtestRef.current) {
      speedtestRef.current.remove();
      speedtestRef.current = null;
    }
    // Create a container for the speedtest widget
    const container = document.createElement('div');
    container.style.display = 'none'; // Hide the widget UI
    document.body.appendChild(container);
    // Start the speedtest
    speedtestRef.current = new SpeedTest({
      autostart: true,
      measurements: [
        { type: 'latency', numPackets: 5 },
        { type: 'download', bytes: 1e6, count: 9 },
        { type: 'upload', bytes: 1e6, count: 9 },
      ],
      logAimApiUrl: '',

    });
    speedtestRef.current.onError = () => {
        setSpeedResult({ error: 'Speedtest failed.' });
        setTesting(false);
        if (speedtestRef.current) {
          speedtestRef.current = null;
        }
        if (container) {
          container.remove();
        }
      }
    speedtestRef.current.onFinish = results => {
        const summary = results.getSummary()
        const download = Math.round(summary.download / 1e6 * 100) / 100;
        const upload = Math.round(summary.upload / 1e6 * 100) / 100;

        console.log(`Download: ${download} Mbps, Upload: ${upload} Mbps`);
        // Store result for current location
        let updated = false;
        const newPoints = points.map(pt => {
          if (pt.lat === currentLocation.lat && pt.lng === currentLocation.lng) {
            updated = true;
            return { ...pt, download, upload };
          }
          return pt;
        });
        let finalPoints = newPoints;
        if (!updated && currentLocation) {
          finalPoints = [
            ...points,
            { lat: currentLocation.lat, lng: currentLocation.lng, download, upload },
          ];
        }
        setPoints(finalPoints);
        savePoints(finalPoints);
        setSpeedResult({ download, upload });
        setTesting(false);
        // Clean up widget
        if (speedtestRef.current) {
          speedtestRef.current = null;
        }
        if (container) {
          container.remove();
        }
      }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ width: '100%', padding: '2em 0 1em 0', textAlign: 'center', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h1 style={{ margin: 0, fontSize: '2.2em', fontWeight: 700 }}>WiFi Coverage Heatmap</h1>
        <p style={{ margin: '0.5em 0 0 0', color: '#666' }}>Visualize your WiFi speed at different locations</p>
      </header>
      <main style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2em', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', height: MAP_HEIGHT, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '2em', background: '#eaeaea' }}>
            <div id="map" style={{ width: MAP_WIDTH, height: '100%' }}></div>
          </div>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <button onClick={runSpeedTest} disabled={testing || !currentLocation} style={{ fontSize: '1.1em', padding: '0.7em 2em', borderRadius: '8px', background: '#1976d2', color: '#fff', border: 'none', cursor: testing ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)' }}>
              {testing ? 'Testing...' : 'Run Speedtest at Current Location'}
            </button>
            {/* Edit Location removed (marker is not draggable) */}
            <select value={heatMetric} onChange={(e) => { setHeatMetric(e.target.value); localStorage.setItem('heat_metric', e.target.value); }} style={{ marginLeft: '1em', fontSize: '1em', padding: '0.45em 1em', borderRadius: '8px', background: '#fff', color: '#333', border: '1px solid #ddd', cursor: 'pointer' }}>
              <option value="download">Color by: Download</option>
              <option value="upload">Color by: Upload</option>
            </select>
            <button onClick={() => { setShowPoints(p => { const v = !p; localStorage.setItem('show_points', JSON.stringify(v)); return v; }); }} style={{ marginLeft: '1em', fontSize: '1em', padding: '0.5em 1.5em', borderRadius: '8px', background: showPoints ? '#4caf50' : '#eee', color: showPoints ? '#fff' : '#333', border: 'none', cursor: 'pointer' }}>
              {showPoints ? 'Hide Points' : 'Show Points'}
            </button>
            <button onClick={() => setCurrentLocation(null)} style={{ marginLeft: '1em', fontSize: '1em', padding: '0.5em 1.5em', borderRadius: '8px', background: '#e57373', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Clear Location
            </button>
            <div style={{ marginTop: '1em' }}>
              <strong>Current Location:</strong> {currentLocation ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` : 'Not set'}
            </div>
            {/* Show speedtest result for current location, or stored result if available */}
            <div style={{ marginTop: '1em' }}>
              {speedResult && speedResult.error ? (
                <span style={{ color: 'red' }}>{speedResult.error}</span>
              ) : null}
              {!speedResult && currentLocation ? (() => {
                const stored = points.find(pt => pt.lat === currentLocation.lat && pt.lng === currentLocation.lng);
                if (stored) {
                  return (
                    <span>
                      <strong>Stored Result:</strong><br />
                      Download: {stored.download} Mbps<br />
                      Upload: {stored.upload} Mbps
                    </span>
                  );
                }
                return null;
              })() : null}
              {speedResult && !speedResult.error ? (
                <span>
                  <strong>Latest Result:</strong><br />
                  Download: {speedResult.download} Mbps<br />
                  Upload: {speedResult.upload} Mbps
                </span>
              ) : null}
            </div>
            <div style={{ marginTop: '1em' }}>
              <strong>Saved Points:</strong> {points.length}
            </div>
            <div style={{ marginTop: '1em', fontSize: '0.95em', color: '#888' }}>
              <span>Tip: Click on the map to set your location.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
