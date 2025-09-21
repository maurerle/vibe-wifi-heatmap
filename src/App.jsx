


import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

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
  const [editLocation, setEditLocation] = useState(false);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Allow user to set a point by clicking on the map
      mapRef.current.on('click', function (e) {
        setCurrentLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
    // Clear existing markers
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        mapRef.current.removeLayer(layer);
      }
    });
    // Add markers for each point
    points.forEach(pt => {
      L.circle([pt.lat, pt.lng], {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.5,
        radius: 20,
        //radius: 20 + pt.download * 2,
      }).addTo(mapRef.current).bindPopup(
        `Download: ${pt.download} Mbps<br/>Upload: ${pt.upload} Mbps`
      );
    });
    // Show current location marker
    if (currentLocation) {
      L.marker([currentLocation.lat, currentLocation.lng], {
        draggable: editLocation,
      }).addTo(mapRef.current)
        .bindPopup('Current Location')
        .on('dragend', function (e) {
          const { lat, lng } = e.target.getLatLng();
          setCurrentLocation({ lat, lng });
        });
    }
  }, [points, currentLocation, editLocation]);

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
        { type: 'download', bytes: 1e5, count: 9 },
        { type: 'upload', bytes: 1e5, count: 9 },
      ]
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
        console.log(results.getSummary())
        const download = Math.round(results.download * 100) / 100;
        const upload = Math.round(results.upload * 100) / 100;
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
            {testing && (
              <div style={{ marginTop: '1em' }}>
                <span role="status" aria-live="polite">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginRight: '0.5em', verticalAlign: 'middle', display: 'inline-block' }} className="wifi-spinner">
                    <circle cx="16" cy="16" r="14" stroke="#1976d2" strokeWidth="4" fill="none" />
                  </svg>
                  Running speedtest...
                </span>
              {/* Spinner animation style */}
              <style>{`
                .wifi-spinner {
                  animation: wifi-spin 1s linear infinite;
                }
                @keyframes wifi-spin {
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              </div>
            )}
            <button onClick={() => setEditLocation(!editLocation)} style={{ marginLeft: '1em', fontSize: '1em', padding: '0.5em 1.5em', borderRadius: '8px', background: editLocation ? '#ffa726' : '#eee', color: editLocation ? '#fff' : '#333', border: 'none', cursor: 'pointer' }}>
              {editLocation ? 'Finish Editing Location' : 'Edit Location'}
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
              <span>Tip: Click on the map to set your location. Drag the marker to adjust.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
