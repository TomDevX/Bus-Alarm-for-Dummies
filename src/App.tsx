/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Bell, BellOff, Navigation, Settings, Info, AlertTriangle, Bus, Search, X, Loader2, BookOpen, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapComponent from './components/MapComponent';
import { useGeolocation, calculateDistance } from './hooks/useGeolocation';
import { cn } from './lib/utils';
import { Language, translations } from './translations';

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
  
  // Load initial settings from localStorage
  const getInitialLanguage = (): Language => {
    const saved = localStorage.getItem('bussnooze_lang');
    return (saved as Language) || 'en';
  };

  const getInitialRadius = () => {
    const saved = localStorage.getItem('bussnooze_radius');
    return saved ? parseInt(saved) : 500;
  };

  const getInitialPins = (): PinnedLocation[] => {
    const saved = localStorage.getItem('bussnooze_pins');
    return saved ? JSON.parse(saved) : [];
  };

  const getInitialKeepAwake = (): boolean => {
    const saved = localStorage.getItem('bussnooze_keepawake');
    return saved === 'true';
  };

  const getInitialShowCompass = (): boolean => {
    const saved = localStorage.getItem('bussnooze_showcompass');
    return saved === 'true';
  };

  const getInitialVolume = () => {
    const saved = localStorage.getItem('bussnooze_volume');
    return saved ? parseFloat(saved) : 1.0;
  };

  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");
  const [radius, setRadius] = useState(getInitialRadius);
  const [volume, setVolume] = useState(getInitialVolume);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const [pinnedLocations, setPinnedLocations] = useState<PinnedLocation[]>(getInitialPins);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToInstall, setShowHowToInstall] = useState(false);
  const [keepAwake, setKeepAwake] = useState(getInitialKeepAwake);
  const [showCompass, setShowCompass] = useState(getInitialShowCompass);
  const wakeLockRef = useRef<any>(null);

  const { location, error, isTracking } = useGeolocation(showCompass);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('bussnooze_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('bussnooze_radius', radius.toString());
  }, [radius]);

  useEffect(() => {
    localStorage.setItem('bussnooze_pins', JSON.stringify(pinnedLocations));
  }, [pinnedLocations]);

  useEffect(() => {
    localStorage.setItem('bussnooze_keepawake', keepAwake.toString());
    toggleWakeLock(keepAwake);
  }, [keepAwake]);

  useEffect(() => {
    localStorage.setItem('bussnooze_showcompass', showCompass.toString());
  }, [showCompass]);

  useEffect(() => {
    localStorage.setItem('bussnooze_volume', volume.toString());
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    } else if (audioRef.current) {
      // Fallback if Web Audio not initialized yet
      audioRef.current.volume = Math.min(volume, 1.0);
    }
  }, [volume]);

  // Handle setting keepAwake state and preference 
  // Initial wake lock if enabled
  useEffect(() => {
    const shouldKeepAwake = localStorage.getItem('bussnooze_keepawake') === 'true';
    if (shouldKeepAwake) {
      // Small delay to ensure browser context is ready, or wait for gesture
      const timer = setTimeout(() => toggleWakeLock(true), 1000);
      
      const handleFirstInteraction = () => {
        toggleWakeLock(true);
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('touchstart', handleFirstInteraction);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
    return undefined;
  }, []);

  // Wake Lock implementation
  const toggleWakeLock = async (enable: boolean) => {
    if ('wakeLock' in navigator) {
      try {
        if (enable) {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            // Listen for release
            wakeLockRef.current.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          }
        } else {
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
        }
      } catch (err: any) {
        console.warn(`Wake lock error: ${err.name}`);
      }
    }
  };

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (keepAwake && wakeLockRef.current === null && document.visibilityState === 'visible') {
        toggleWakeLock(true);
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
      const audio = new Audio('https://raw.githubusercontent.com/TomDevX/bus-alarm/main/alarm.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.crossOrigin = "anonymous"; // Needed for Web Audio API across domains
      audioRef.current = audio;
      
      // Initialize Web Audio API for volume boost
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();
        const gainNode = context.createGain();
        const source = context.createMediaElementSource(audio);
        
        source.connect(gainNode);
        gainNode.connect(context.destination);
        
        audioContextRef.current = context;
        gainNodeRef.current = gainNode;
        sourceRef.current = source;
        
        gainNode.gain.value = volume;
      } catch (err) {
        console.error("Web Audio API error:", err);
        // Fallback to simple audio volume
        audio.volume = Math.min(volume, 1.0);
      }
      
      audio.load();
    } else {
      // Resume context if suspended (common in browsers)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }, [volume]);

  // "Warm up" audio to prevent delay on first play
  useEffect(() => {
    const warmUp = () => {
      initAudio();
      if (audioRef.current) {
        // Play and immediately pause to "unlock" the audio context/element
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (audioRef.current) audioRef.current.pause();
          }).catch(() => {
            // Error is expected if user hasn't interacted enough yet
          });
        }
      }
      window.removeEventListener('click', warmUp);
      window.removeEventListener('touchstart', warmUp);
    };

    window.addEventListener('click', warmUp);
    window.addEventListener('touchstart', warmUp);
    return () => {
      window.removeEventListener('click', warmUp);
      window.removeEventListener('touchstart', warmUp);
    };
  }, [initAudio]);

  const startAlarmSound = useCallback(() => {
    initAudio();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
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
  const userLat = location?.latitude;
  const userLng = location?.longitude;

  useEffect(() => {
    if (userLat !== null && userLat !== undefined && userLng !== null && userLng !== undefined && destination) {
      const d = calculateDistance(
        userLat,
        userLng,
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
  }, [userLat, userLng, destination, isAlarmActive, radius, isAlarmTriggered, startAlarmSound]);

  const toggleAlarm = () => {
    initAudio();
    if (isAlarmActive) {
      setIsAlarmActive(false);
      setIsAlarmTriggered(false);
      stopAlarmSound();
    } else {
      if (!destination) {
        alert(t.set_destination_alert);
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
      alert(t.already_pinned);
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
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl border border-slate-100">
            <img 
              src="https://raw.githubusercontent.com/TomDevX/Bus-Alarm-for-Dummies/refs/heads/main/BusSnooze.png" 
              alt="BusSnooze Logo" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/TomDevX/Bus-Alarm-for-Dummies/refs/heads/main/BusSnooze.png";
              }}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">{t.app_name}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-xl"
            title={language === 'en' ? 'Tiếng Việt' : 'English'}
          >
            {language === 'en' ? '🇬🇧' : '🇻🇳'}
          </button>
          <button 
            onClick={() => setShowHowToInstall(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            title={t.how_to_use}
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            title={t.settings}
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
                placeholder={t.search_placeholder} 
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
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : t.search_button}
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
                    <div className="p-4 text-center text-slate-500 text-sm">{t.searching}</div>
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
            language={language}
            showCompass={showCompass}
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
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t.destination_set}</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium truncate max-w-[200px]">
                        {destinationName || `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t.distance}</p>
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
                        {t.deactivate_alarm}
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" />
                        {t.activate_alarm}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={pinLocation}
                    className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors shadow-inner"
                    title={t.save_location}
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
            <div className="bg-white/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-xl shadow-blue-100/50">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-blue-100 rounded-3xl animate-ping opacity-20"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 w-24 h-24 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                  <img 
                    src="https://raw.githubusercontent.com/TomDevX/Bus-Alarm-for-Dummies/refs/heads/main/BusSnooze.png" 
                    alt="BusSnooze Icon" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/TomDevX/Bus-Alarm-for-Dummies/refs/heads/main/BusSnooze.png";
                    }}
                  />
                </div>
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg mb-1 tracking-tight">{t.where_to}</h3>
              <p className="text-sm text-slate-500 font-medium">{t.tap_map}</p>
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
              <h2 className="text-4xl font-black text-white mb-4">{t.wake_up}</h2>
              <p className="text-red-100 text-lg mb-12">
                {t.proximity_alert.replace('{radius}', radius.toString())}
              </p>
              <button
                onClick={handleStopAlarm}
                className="w-full max-w-xs py-5 bg-white text-red-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-transform"
              >
                {t.stop_alarm}
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
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.8 }}
                dragDirectionLock
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    setShowSettings(false);
                  }
                }}
                className="w-full bg-white rounded-t-[40px] p-8 shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-center cursor-grab active:cursor-grabbing z-10">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors" />
                </div>
                <div className="mt-6">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-blue-500" />
                    {t.alarm_settings}
                  </h2>
                </div>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t.anti_sleep_mode}</h4>
                      <p className="text-xs text-slate-500">{t.anti_sleep_desc}</p>
                    </div>
                    <button 
                      onClick={() => setKeepAwake(!keepAwake)}
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

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t.show_compass}</h4>
                      <p className="text-xs text-slate-500">{t.show_compass_desc}</p>
                    </div>
                    <button 
                      onClick={() => setShowCompass(!showCompass)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        showCompass ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        showCompass ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest">
                      {t.language}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setLanguage('en')}
                        className={cn(
                          "py-3 rounded-xl border-2 font-bold transition-all text-sm flex items-center justify-center gap-2",
                          language === 'en' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-400"
                        )}
                      >
                        <Globe className="w-4 h-4" />
                        {t.english}
                      </button>
                      <button
                        onClick={() => setLanguage('vi')}
                        className={cn(
                          "py-3 rounded-xl border-2 font-bold transition-all text-sm flex items-center justify-center gap-2",
                          language === 'vi' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-400"
                        )}
                      >
                        <Globe className="w-4 h-4" />
                        {t.vietnamese}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                      {t.alarm_radius}: <span className="text-blue-600">{radius} {t.meters}</span>
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

                  <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                      {t.alarm_volume}: <span className="text-blue-600">{Math.round(volume * 100)}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between mt-2 text-xs font-medium text-slate-400">
                      <span>0%</span>
                      <span>200%</span>
                    </div>
                  </div>

                  {/* Saved Locations */}
                  <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                      {t.saved_locations} ({pinnedLocations.length})
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
                        <p className="text-xs text-slate-400">{t.no_saved_locations}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {language === 'en' 
                        ? "The alarm will trigger when you enter this radius. Larger radius is recommended for fast-moving buses."
                        : "Báo thức sẽ kêu khi bạn đi vào bán kính này. Nên để bán kính lớn hơn cho các xe buýt di chuyển nhanh."}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 p-4 rounded-2xl flex gap-3 border border-red-100">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600 leading-relaxed">
                        {t.location_error.replace('{error}', error)}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
                  >
                    {t.done}
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
                  <h2 className="text-2xl font-bold text-slate-800">{t.how_to_use}</h2>
                  <button onClick={() => setShowHowToInstall(false)} className="p-1 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6 text-slate-600">
                  <section>
                    <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                      {t.step_1_title}
                    </h3>
                    <p className="text-sm">{t.step_1_desc}</p>
                  </section>

                  <section>
                    <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                      {t.step_2_title}
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm">{t.step_2_desc}</p>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-700">{t.pro_tips}</p>
                        <ul className="text-xs list-disc pl-5 space-y-2 text-slate-500">
                          <li>{t.tip_anti_sleep}</li>
                          <li>{t.tip_brightness}</li>
                          <li>{t.tip_pwa}</li>
                        </ul>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 text-center text-[10px]">{t.install_guide}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 mb-1">iOS (Safari):</p>
                            <p className="text-[9px] leading-tight">{t.ios_guide.split(':')[1].trim()}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 mb-1">Android (Chrome):</p>
                            <p className="text-[9px] leading-tight">{t.android_guide.split(':')[1].trim()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700">
                      {t.pwa_notice}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHowToInstall(false)}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mt-8"
                >
                  {t.done}
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
              {isTracking ? t.gps_active : t.gps_lost}
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            v1.2.0
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
