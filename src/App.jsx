import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');
  
  // Screen state
  const [screen, setScreen] = useState('setup');
  
  // Race configuration
  const [raceName, setRaceName] = useState('');
  const [raceDistance, setRaceDistance] = useState(42.195);
  const [targetPace, setTargetPace] = useState(5.5);
  const [paceThreshold, setPaceThreshold] = useState(15);
  const [aidStations, setAidStations] = useState('5, 10, 15, 20, 25, 30, 35, 40');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [batterySaver, setBatterySaver] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  
  // Race data
  const [startTime, setStartTime] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState('--:--');
  const [avgPace, setAvgPace] = useState('--:--');
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [estFinish, setEstFinish] = useState('--:--');
  const [lastSplit, setLastSplit] = useState('--:--');
  const [splits, setSplits] = useState([]);
  const [paceAlert, setPaceAlert] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [aidStationAlert, setAidStationAlert] = useState(null);
  const [screenOn, setScreenOn] = useState(false);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    dataPoints: [],
    events: [],
    weatherData: null
  });
  
  // Refs for GPS and intervals
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastSplitDistanceRef = useRef(0);
  const passedAidStationsRef = useRef(new Set());
  const wakeLockRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
  }, []);
  
  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Time update effect
  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      
      const timeStr = hours > 0 
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${minutes}:${pad(seconds)}`;
      
      setElapsedTime(timeStr);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  // Utility functions
  const pad = (num) => num.toString().padStart(2, '0');
  
  const formatPace = (paceMinPerKm) => {
    if (!paceMinPerKm || paceMinPerKm === Infinity) return '--:--';
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    return `${minutes}:${pad(seconds)}`;
  };
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const toRad = (degrees) => degrees * Math.PI / 180;
  
  const speak = (text) => {
    if (!voiceEnabled) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  const logEvent = (eventType, data = {}) => {
    if (analyticsEnabled) {
      setAnalyticsData(prev => ({
        ...prev,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          elapsed: startTime ? Date.now() - startTime : 0,
          type: eventType,
          distance: totalDistance,
          ...data
        }]
      }));
    }
    
    // Google Analytics event
    if (window.gtag) {
      window.gtag('event', eventType, {
        event_category: 'race',
        event_label: raceName || 'unnamed',
        ...data
      });
    }
  };
  
  const startRace = async () => {
    const now = Date.now();
    setStartTime(now);
    setScreen('running');
    
    // Initialize analytics data
    setAnalyticsData({
      raceName: raceName || 'Unnamed Race',
      startTime: new Date().toISOString(),
      targetPace: targetPace,
      raceDistance: raceDistance,
      dataPoints: [],
      events: [],
      weatherData: null
    });
    
    logEvent('race_started');
    
    // Get weather
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=celsius`
      );
      
      const data = await response.json();
      setWeatherInfo(data.current);
      setAnalyticsData(prev => ({ ...prev, weatherData: data.current }));
    } catch (error) {
      console.log('Could not fetch weather:', error);
    }
    
    // Start GPS
    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };
    
    if (batterySaver) {
      updateIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(updatePosition, handleError, gpsOptions);
      }, 30000);
      navigator.geolocation.getCurrentPosition(updatePosition, handleError, gpsOptions);
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(updatePosition, handleError, gpsOptions);
    }
    
    speak("Race started. Good luck!");
  };
  
  const updatePosition = (position) => {
    const current = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy
    };
    
    if (lastPositionRef.current) {
      const dist = calculateDistance(
        lastPositionRef.current.lat, lastPositionRef.current.lon,
        current.lat, current.lon
      );
      
      const newDistance = totalDistance + dist;
      setTotalDistance(newDistance);
      
      // Calculate current pace
      const timeDiff = (current.timestamp - lastPositionRef.current.timestamp) / 1000 / 60;
      if (dist > 0) {
        const pace = timeDiff / dist;
        setCurrentPace(formatPace(pace));
        checkPaceAlert(pace);
        
        // Track analytics
        if (analyticsEnabled) {
          setAnalyticsData(prev => ({
            ...prev,
            dataPoints: [...prev.dataPoints, {
              timestamp: new Date().toISOString(),
              elapsed: Date.now() - startTime,
              distance: newDistance,
              pace: pace,
              speed: dist / ((current.timestamp - lastPositionRef.current.timestamp) / 1000 / 3600),
              lat: current.lat,
              lon: current.lon,
              accuracy: current.accuracy
            }]
          }));
        }
      }
      
      // Calculate average pace
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      if (newDistance > 0) {
        const avgPaceValue = elapsedMinutes / newDistance;
        setAvgPace(formatPace(avgPaceValue));
        
        // Estimate finish
        const remainingDistance = raceDistance - newDistance;
        const remainingMinutes = remainingDistance * avgPaceValue;
        const finishTime = new Date(Date.now() + remainingMinutes * 60 * 1000);
        setEstFinish(finishTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      }
      
      // Check for splits
      const currentKm = Math.floor(newDistance);
      const lastKm = Math.floor(lastSplitDistanceRef.current);
      if (currentKm > lastKm) {
        recordSplit(currentKm, newDistance);
      }
      
      // Check aid stations
      checkAidStations(newDistance);
    }
    
    lastPositionRef.current = current;
  };
  
  const checkPaceAlert = (pace) => {
    const diff = (pace - targetPace) * 60;
    
    if (Math.abs(diff) > paceThreshold) {
      if (diff > 0) {
        setPaceAlert({ type: 'danger', message: `⚠️ TOO SLOW - Speed up by ${Math.abs(diff).toFixed(0)}s/km` });
        speak("Too slow");
        vibrate([200, 100, 200]);
        logEvent('pace_alert', { type: 'too_slow', difference: diff });
      } else {
        setPaceAlert({ type: 'warning', message: `⚠️ TOO FAST - Slow down by ${Math.abs(diff).toFixed(0)}s/km` });
        speak("Too fast");
        vibrate([200, 100, 200]);
        logEvent('pace_alert', { type: 'too_fast', difference: diff });
      }
    } else {
      setPaceAlert({ type: 'success', message: '✓ Perfect Pace!' });
    }
  };
  
  const recordSplit = (km, distance) => {
    const elapsedTime = Date.now() - startTime;
    const lastSplitTime = splits.length > 0 ? splits[splits.length - 1].totalTime : 0;
    const thisSplitTime = (elapsedTime - lastSplitTime) / 1000 / 60;
    const thisSplitPace = thisSplitTime / (distance - lastSplitDistanceRef.current);
    
    const newSplit = {
      km: km,
      pace: thisSplitPace,
      totalTime: elapsedTime,
      splitTime: thisSplitTime
    };
    
    setSplits(prev => [...prev, newSplit]);
    setLastSplit(formatPace(thisSplitPace));
    lastSplitDistanceRef.current = distance;
    
    logEvent('split_completed', { km: km, pace: thisSplitPace });
    speak(`Split ${km}. Pace ${formatPace(thisSplitPace)}`);
  };
  
  const checkAidStations = (distance) => {
    const stations = aidStations.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    
    for (const station of stations) {
      if (distance >= station && !passedAidStationsRef.current.has(station)) {
        passedAidStationsRef.current.add(station);
        setAidStationAlert(`💧 Aid Station at ${station} km!`);
        logEvent('aid_station_reached', { station: station });
        speak(`Aid station at ${station} kilometers`);
        setTimeout(() => setAidStationAlert(null), 5000);
      }
    }
    
    const nextStation = stations.find(s => s > distance);
    if (nextStation) {
      const dist = nextStation - distance;
      if (dist <= 1 && dist > 0.8) {
        setAidStationAlert(`💧 Next water in ${dist.toFixed(1)} km`);
      }
    }
  };
  
  const handleError = (error) => {
    console.error('GPS Error:', error);
    logEvent('gps_error', { message: error.message });
    alert('GPS Error: ' + error.message);
  };
  
  const toggleScreenOn = async () => {
    if (!screenOn) {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setScreenOn(true);
          speak("Screen will stay on");
        } else {
          alert('Wake Lock not supported on this device');
        }
      } catch (error) {
        console.log('Wake Lock error:', error);
        alert('Could not keep screen on');
      }
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      setScreenOn(false);
    }
  };
  
  const stopRace = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    
    logEvent('race_finished');
    
    const finalData = {
      ...analyticsData,
      endTime: new Date().toISOString(),
      finalDistance: totalDistance,
      totalTime: Date.now() - startTime,
      splits: splits
    };
    
    setAnalyticsData(finalData);
    saveRaceToHistory(finalData);
    setScreen('summary');
    speak("Race finished. Great job!");
  };
  
  const saveRaceToHistory = (data) => {
    try {
      const history = JSON.parse(localStorage.getItem('raceHistory') || '[]');
      history.push(data);
      localStorage.setItem('raceHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Could not save to history:', error);
    }
  };
  
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportCSV = () => {
    let csv = 'Split,Pace (min/km),Split Time (min),Total Time (min)\n';
    splits.forEach(split => {
      csv += `${split.km},${split.pace.toFixed(2)},${split.splitTime.toFixed(2)},${(split.totalTime / 60000).toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-splits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const resetApp = () => {
    setScreen('setup');
    setStartTime(null);
    setTotalDistance(0);
    setSplits([]);
    lastPositionRef.current = null;
    lastSplitDistanceRef.current = 0;
    passedAidStationsRef.current.clear();
  };
  
  // Draw pace chart
  useEffect(() => {
    if (screen !== 'summary' || !canvasRef.current || splits.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const isLight = theme === 'light';
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const paces = splits.map(s => s.pace);
    const maxPace = Math.max(...paces);
    const minPace = Math.min(...paces);
    const range = maxPace - minPace;
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = isLight ? '#ffd6e8' : '#404060';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
    
    // Target line
    ctx.strokeStyle = isLight ? '#d946a6' : '#bb86fc';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const targetY = padding + chartHeight - ((targetPace - minPace) / (range || 1)) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding, targetY);
    ctx.lineTo(canvas.width - padding, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Pace line
    ctx.strokeStyle = isLight ? '#ff85c0' : '#03dac6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    splits.forEach((split, i) => {
      const x = padding + (chartWidth / (splits.length - 1 || 1)) * i;
      const y = padding + chartHeight - ((split.pace - minPace) / (range || 1)) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Points
    splits.forEach((split, i) => {
      const x = padding + (chartWidth / (splits.length - 1 || 1)) * i;
      const y = padding + chartHeight - ((split.pace - minPace) / (range || 1)) * chartHeight;
      
      ctx.fillStyle = isLight ? '#ff85c0' : '#03dac6';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Label
    ctx.fillStyle = isLight ? '#666' : '#9e9e9e';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Target: ${formatPace(targetPace)}`, padding, targetY - 5);
  }, [screen, splits, theme, targetPace]);
  
  return (
    <div className={`app ${theme === 'light' ? 'light-theme' : ''}`}>
      <div className="theme-toggle" onClick={toggleTheme}>
        <span>{theme === 'light' ? '☀️' : '🌙'}</span>
        <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
      </div>
      
      <div className="container">
        <h1>🏃 Marathon Pace Buddy</h1>
        
        {/* Setup Screen */}
        {screen === 'setup' && (
          <div className="setup-screen">
            <div className="input-group">
              <label>Race Name (optional)</label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g., Lahore Marathon 2026"
              />
            </div>
            
            <div className="input-group">
              <label>Race Distance</label>
              <select value={raceDistance} onChange={(e) => setRaceDistance(parseFloat(e.target.value))}>
                <option value="42.195">Full Marathon (42.195 km)</option>
                <option value="21.0975">Half Marathon (21.1 km)</option>
                <option value="10">10K</option>
                <option value="5">5K</option>
              </select>
            </div>
            
            <div className="input-group">
              <label>Target Pace (min/km)</label>
              <input
                type="number"
                value={targetPace}
                onChange={(e) => setTargetPace(parseFloat(e.target.value))}
                step="0.1"
              />
            </div>
            
            <div className="input-group">
              <label>Pace Alert Threshold (seconds)</label>
              <input
                type="number"
                value={paceThreshold}
                onChange={(e) => setPaceThreshold(parseInt(e.target.value))}
              />
              <small className="aid-stations-input">Alert when pace differs by this amount</small>
            </div>
            
            <div className="input-group">
              <label>Aid Station Distances (km, comma-separated)</label>
              <input
                type="text"
                value={aidStations}
                onChange={(e) => setAidStations(e.target.value)}
                placeholder="5, 10, 15, 20"
              />
            </div>
            
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="voice"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
              />
              <label htmlFor="voice">Enable Voice Alerts</label>
            </div>
            
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="battery"
                checked={batterySaver}
                onChange={(e) => setBatterySaver(e.target.checked)}
              />
              <label htmlFor="battery">Battery Saver Mode</label>
            </div>
            
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="analytics"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
              />
              <label htmlFor="analytics">Track Analytics Data</label>
            </div>
            
            <button className="btn btn-primary" onClick={startRace}>Start Race</button>
          </div>
        )}
        
        {/* Running Screen */}
        {screen === 'running' && (
          <div className="running-screen">
            {weatherInfo && (
              <div className="weather-info">
                🌡️ {weatherInfo.temperature_2m}°C | 
                💧 {weatherInfo.relative_humidity_2m}% humidity | 
                💨 {weatherInfo.wind_speed_10m} km/h wind
              </div>
            )}
            
            {aidStationAlert && (
              <div className="aid-station-alert">{aidStationAlert}</div>
            )}
            
            {paceAlert && (
              <div className={`alert alert-${paceAlert.type}`}>
                {paceAlert.message}
              </div>
            )}
            
            <div className="stats-grid">
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-label">Current Pace</div>
                <div className="stat-value large">{currentPace}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Distance</div>
                <div className="stat-value">{totalDistance.toFixed(2)} km</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">To Finish</div>
                <div className="stat-value">{Math.max(0, raceDistance - totalDistance).toFixed(2)} km</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Avg Pace</div>
                <div className="stat-value">{avgPace}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Time</div>
                <div className="stat-value">{elapsedTime}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Est. Finish</div>
                <div className="stat-value">{estFinish}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Last Split</div>
                <div className="stat-value">{lastSplit}</div>
              </div>
            </div>
            
            <button className="btn btn-secondary" onClick={toggleScreenOn}>
              {screenOn ? 'Screen On ✓' : 'Keep Screen On'}
            </button>
            
            <button className="btn btn-danger" onClick={stopRace}>Finish Race</button>
          </div>
        )}
        
        {/* Summary Screen */}
        {screen === 'summary' && (
          <div className="summary-screen">
            <h2>Race Summary</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Distance</div>
                <div className="stat-value">{totalDistance.toFixed(2)} km</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-label">Total Time</div>
                <div className="stat-value">{elapsedTime}</div>
              </div>
              
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-label">Average Pace</div>
                <div className="stat-value">{avgPace}</div>
              </div>
            </div>
            
            {splits.length > 0 && (
              <div className="analytics-section">
                <h3>📊 Performance Analytics</h3>
                <canvas ref={canvasRef} className="pace-chart"></canvas>
                
                <div style={{ marginTop: '15px' }}>
                  <div className="stat-label">Pace Variance</div>
                  <div className="stat-value" style={{ fontSize: '18px' }}>
                    ±{(() => {
                      const paces = splits.map(s => s.pace);
                      const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
                      const variance = Math.sqrt(paces.reduce((sum, pace) => sum + Math.pow(pace - avg, 2), 0) / paces.length);
                      return (variance * 60).toFixed(0);
                    })()}s/km
                  </div>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <div className="stat-label">Fastest Split</div>
                  <div className="stat-value" style={{ fontSize: '18px' }}>
                    Km {splits.reduce((min, s) => s.pace < min.pace ? s : min).km}: {formatPace(Math.min(...splits.map(s => s.pace)))}
                  </div>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <div className="stat-label">Slowest Split</div>
                  <div className="stat-value" style={{ fontSize: '18px' }}>
                    Km {splits.reduce((max, s) => s.pace > max.pace ? s : max).km}: {formatPace(Math.max(...splits.map(s => s.pace)))}
                  </div>
                </div>
              </div>
            )}
            
            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Split Times</h3>
            <div className="splits-container">
              {splits.map(split => (
                <div key={split.km} className="split-item">
                  <span>Km {split.km}</span>
                  <span>{formatPace(split.pace)} /km</span>
                </div>
              ))}
            </div>
            
            <div className="export-buttons">
              <button className="btn btn-success" onClick={exportJSON}>📥 Export JSON</button>
              <button className="btn btn-success" onClick={exportCSV}>📥 Export CSV</button>
            </div>
            
            <button className="btn btn-primary" onClick={resetApp}>New Race</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
