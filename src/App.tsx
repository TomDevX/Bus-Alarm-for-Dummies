/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Bell, BellOff, Navigation, Settings, Info, AlertTriangle, Bus, Search, X, Loader2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapComponent from './components/MapComponent';
import { useGeolocation, calculateDistance } from './hooks/useGeolocation';
import { cn } from './lib/utils';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface PinnedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export default function App() {
  const { location, error, isTracking } = useGeolocation();
  
  // Load initial settings from localStorage
  const getInitialRadius = () => {
    const saved = localStorage.getItem('bussnooze_radius');
    return saved ? parseInt(saved) : 500;
  };

  const getInitialPins = (): PinnedLocation[] => {
    const saved = localStorage.getItem('bussnooze_pins');
    return saved ? JSON.parse(saved) : [];
  };

  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");
  const [radius, setRadius] = useState(getInitialRadius);
  const [pinnedLocations, setPinnedLocations] = useState<PinnedLocation[]>(getInitialPins);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToInstall, setShowHowToInstall] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('bussnooze_radius', radius.toString());
  }, [radius]);

  useEffect(() => {
    localStorage.setItem('bussnooze_pins', JSON.stringify(pinnedLocations));
  }, [pinnedLocations]);

  // Wake Lock implementation
  const toggleWakeLock = async (enable: boolean) => {
    if ('wakeLock' in navigator) {
      try {
        if (enable) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setKeepAwake(true);
        } else if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          setKeepAwake(false);
        }
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
        setKeepAwake(false);
      }
    } else {
      alert("Trình duyệt của bạn không hỗ trợ tính năng Giữ màn hình sáng.");
    }
  };

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (keepAwake && wakeLockRef.current !== null && document.visibilityState === 'visible') {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error("Failed to re-acquire wake lock:", err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [keepAwake]);

  // Search as you type with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowResults(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setDestination({ latitude: lat, longitude: lng });
    setDestinationName(result.display_name);
    setShowResults(false);
    setSearchQuery("");
  };
  
  // Initialize Audio on user interaction
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alarm.mp3');
      audioRef.current.loop = true;
    }
  }, []);

  const startAlarmSound = useCallback(() => {
    initAudio();
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play error:", e));
    }
  }, [initAudio]);

  const stopAlarmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Calculate distance whenever location or destination changes
  useEffect(() => {
    if (location && destination) {
      const d = calculateDistance(
        location.latitude,
        location.longitude,
        destination.latitude,
        destination.longitude
      );
      setDistance(d);

      if (isAlarmActive && d <= radius && !isAlarmTriggered) {
        setIsAlarmTriggered(true);
        startAlarmSound();
        // Vibrate if supported
        if ("vibrate" in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      }
    } else {
      setDistance(null);
    }
  }, [location, destination, isAlarmActive, radius, isAlarmTriggered, startAlarmSound]);

  const toggleAlarm = () => {
    initAudio();
    if (isAlarmActive) {
      setIsAlarmActive(false);
      setIsAlarmTriggered(false);
      stopAlarmSound();
    } else {
      if (!destination) {
        alert("Please set a destination on the map first!");
        return;
      }
      setIsAlarmActive(true);
      setIsAlarmTriggered(false);
    }
  };

  const handleStopAlarm = () => {
    setIsAlarmTriggered(false);
    setIsAlarmActive(false);
    stopAlarmSound();
  };

  const pinLocation = () => {
    if (!destination) return;
    
    // Check if orready pinned
    const exists = pinnedLocations.find(p => 
      p.latitude === destination.latitude && p.longitude === destination.longitude
    );
    
    if (exists) {
      alert("Địa điểm này đã được lưu!");
      return;
    }

    const newPin: PinnedLocation = {
      id: Date.now().toString(),
      name: destinationName || `Location ${pinnedLocations.length + 1}`,
      latitude: destination.latitude,
      longitude: destination.longitude
    };

    setPinnedLocations([...pinnedLocations, newPin]);
  };

  const removePin = (id: string) => {
    setPinnedLocations(pinnedLocations.filter(p => p.id !== id));
  };

  const selectPinnedLocation = (pin: PinnedLocation) => {
    setDestination({ latitude: pin.latitude, longitude: pin.longitude });
    setDestinationName(pin.name);
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">BusSnooze</h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowHowToInstall(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            title="Install on phone"
          >
            <Smartphone className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-4 z-[1001] pointer-events-none">
          <div className="relative pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-1 flex items-center">
              <div className="pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="Search destination..." 
                className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none text-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery && (
                <button 
                  onClick={() => {setSearchQuery(""); setShowResults(false)}}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showResults && (searchResults.length > 0 || isSearching) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-500 text-sm">Searching...</div>
                  ) : (
                    searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectResult(result)}
                        className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start gap-2"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                        <span className="text-sm text-slate-700 line-clamp-2">{result.display_name}</span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map Section */}
        <div className="flex-1 p-4">
          <MapComponent 
            currentLocation={location}
            destination={destination}
            onDestinationSelect={(lat, lng) => setDestination({ latitude: lat, longitude: lng })}
            radius={radius}
          />
        </div>

        {/* Status Panel */}
        <AnimatePresence>
          {destination && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="px-4 pb-6 shrink-0"
            >
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Destination Set</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium truncate max-w-[200px]">
                        {destinationName || `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Distance</p>
                    <p className="text-2xl font-black text-slate-800">
                      {distance !== null ? (distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`) : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={toggleAlarm}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                      isAlarmActive 
                        ? "bg-red-50 text-red-600 border-2 border-red-200" 
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {isAlarmActive ? (
                      <>
                        <BellOff className="w-5 h-5" />
                        Dừng báo thức
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" />
                        Bật báo thức
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={pinLocation}
                    className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors shadow-inner"
                    title="Lưu địa điểm"
                  >
                    <MapPin className="w-6 h-6 fill-current" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Destination Prompt */}
        {!destination && (
          <div className="px-6 pb-8 text-center shrink-0">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <Navigation className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 mb-1">Where are you going?</h3>
              <p className="text-sm text-slate-500">Tap anywhere on the map to set your destination stop.</p>
            </div>
          </div>
        )}

        {/* Alarm Triggered Overlay */}
        <AnimatePresence>
          {isAlarmTriggered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-red-600 flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="bg-white p-8 rounded-full mb-8 shadow-2xl"
              >
                <Bell className="w-20 h-20 text-red-600" />
              </motion.div>
              <h2 className="text-4xl font-black text-white mb-4">WAKE UP!</h2>
              <p className="text-red-100 text-lg mb-12">You are within {radius}m of your destination.</p>
              <button
                onClick={handleStopAlarm}
                className="w-full max-w-xs py-5 bg-white text-red-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-transform"
              >
                I'M AWAKE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1500] bg-slate-900/60 backdrop-blur-sm flex items-end"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full bg-white rounded-t-[40px] p-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-500" />
                  Alarm Settings
                </h2>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Chế độ "Chống ngủ quên"</h4>
                      <p className="text-xs text-slate-500">Giữ màn hình luôn sáng để GPS không bị ngắt.</p>
                    </div>
                    <button 
                      onClick={() => toggleWakeLock(!keepAwake)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        keepAwake ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        keepAwake ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                      Bán kính báo thức: <span className="text-blue-600">{radius} mét</span>
                    </label>
                    <input 
                      type="range" 
                      min="100" 
                      max="2000" 
                      step="100"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                      <span>100m</span>
                      <span>2km</span>
                    </div>
                  </div>

                  {/* Saved Locations */}
                  <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                      Địa điểm đã lưu ({pinnedLocations.length})
                    </label>
                    {pinnedLocations.length > 0 ? (
                      <div className="space-y-2">
                        {pinnedLocations.map(pin => (
                          <div 
                            key={pin.id}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between group"
                          >
                            <button 
                              onClick={() => selectPinnedLocation(pin)}
                              className="flex-1 text-left flex items-center gap-2 overflow-hidden"
                            >
                              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="text-sm text-slate-700 truncate font-medium">{pin.name}</span>
                            </button>
                            <button 
                              onClick={() => removePin(pin.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400">Chưa có địa điểm nào được lưu.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The alarm will trigger when you enter this radius. Larger radius is recommended for fast-moving buses.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 p-4 rounded-2xl flex gap-3 border border-red-100">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600 leading-relaxed">
                        Location Error: {error}. Please ensure GPS is enabled.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHowToInstall && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6"
              onClick={() => setShowHowToInstall(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl overflow-y-auto max-h-[80vh]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Hướng dẫn sử dụng</h2>
                  <button onClick={() => setShowHowToInstall(false)} className="p-1 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6 text-slate-600">
                  <section>
                    <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                      Thiết lập Điểm đến
                    </h3>
                    <p className="text-sm">Tìm kiếm địa chỉ bằng thanh công cụ hoặc chạm trực tiếp trên bản đồ để chọn điểm dừng của bạn.</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                      Duy trì kết nối GPS
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm">Hệ điều hành thường ngắt GPS khi màn hình tắt để tiết kiệm pin. Để ứng dụng hoạt động ổn định nhất:</p>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-700">Lời khuyên sử dụng:</p>
                        <ul className="text-xs list-disc pl-5 space-y-2 text-slate-500">
                          <li>Kích hoạt tính năng <b>"Chống ngủ quên"</b> trong phần Cài đặt.</li>
                          <li><b>Giảm độ sáng màn hình</b> xuống mức thấp nhất để tiết kiệm pin mà không làm ngắt GPS.</li>
                          <li>Sử dụng tính năng <b>"Thêm vào màn hình chính"</b> để có trải nghiệm như ứng dụng cài đặt chính thức.</li>
                        </ul>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 text-center text-[10px]">Cách cài đặt lên điện thoại:</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 mb-1">iOS (Safari):</p>
                            <p className="text-[9px] leading-tight">Bấm <b>Chia sẻ</b> (Share) → <b>Thêm vào MH chính</b></p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 mb-1">Android (Chrome):</p>
                            <p className="text-[9px] leading-tight">Bấm <b>Menu (3 chấm)</b> → <b>Cài đặt ứng dụng</b></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">
                      Ứng dụng sẽ tự động rung và đổ chuông khi bạn đi vào bán kính đã cài đặt (mặc định 500m).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHowToInstall(false)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mt-8"
                >
                  Đã hiểu
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tracking Status Bar */}
      <footer className="px-6 py-3 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isTracking ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isTracking ? "GPS Active" : "GPS Signal Lost"}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            v1.1.0
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            made by <a href="https://github.com/TomDevX" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">TomDev</a> and AI with ❤️🔥
          </p>
        </div>
      </footer>
    </div>
  );
}
