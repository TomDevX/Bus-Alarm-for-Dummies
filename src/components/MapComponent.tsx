import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { translations, Language } from '../translations';
import { cn } from '../lib/utils';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  currentLocation: { 
    latitude: number | null; 
    longitude: number | null; 
    heading?: number | null;
    compassHeading?: number | null;
  } | null;
  destination: { latitude: number; longitude: number } | null;
  onDestinationSelect: (lat: number, lng: number) => void;
  radius: number;
  language: Language;
  showCompass?: boolean;
  isDarkMode?: boolean;
}

// Custom modern GPS blue dot with optional beam
const createUserIcon = (heading: number | null | undefined, compassHeading: number | null | undefined, showCompass: boolean = false) => {
  const rotation = heading ?? compassHeading ?? 0;
  const showBeam = showCompass && ((compassHeading !== undefined && compassHeading !== null) || (heading !== undefined && heading !== null));

  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center pointer-events-none" style="width: 120px; height: 120px;">
        <!-- Directional Beam -->
        ${showBeam ? `
          <div class="absolute transition-transform duration-500 ease-out" 
               style="transform: rotate(${rotation}deg); bottom: 50%; left: 50%; width: 140px; height: 140px; margin-left: -70px; transform-origin: center bottom; z-index: 0;">
            <div class="w-full h-full bg-gradient-to-t from-blue-500/50 via-blue-500/5 to-transparent" 
                 style="clip-path: polygon(50% 100%, 15% 0%, 85% 0%); filter: blur(3px);"></div>
          </div>
        ` : ''}
        
        <!-- Center Point Container -->
        <div class="absolute" style="top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10;">
          <!-- Outer Pulse -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500/20 rounded-full animate-pulse-slow"></div>
          
          <!-- Main Dot Container -->
          <div class="relative w-6 h-6 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center border border-white/50">
            <!-- The Blue Dot -->
            <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"></div>
          </div>
        </div>
      </div>
    `,
    iconSize: [120, 120],
    iconAnchor: [60, 60],
  });
};

const UserLocationMarker = ({ location, showCompass }: { location: MapProps['currentLocation'], showCompass?: boolean }) => {
  if (!location || location.latitude === null || location.longitude === null) return null;
  return (
    <Marker 
      position={[location.latitude, location.longitude]} 
      icon={createUserIcon(location.heading, location.compassHeading, showCompass)}
      zIndexOffset={1000}
    />
  );
};

function MapUpdater({ center, isFollowing }: { center: [number, number], isFollowing: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isFollowing) {
      map.setView(center);
    }
  }, [center, map, isFollowing]);
  return null;
}

function MapEvents({ onSelect, onInteraction }: { onSelect: (lat: number, lng: number) => void, onInteraction: () => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
    dragstart() {
      onInteraction();
    },
    zoomstart() {
      onInteraction();
    },
    movestart() {
      onInteraction();
    }
  });
  return null;
}

export default function MapComponent({ currentLocation, destination, onDestinationSelect, radius, language, showCompass, isDarkMode }: MapProps) {
  const t = translations[language];
  const mapRef = useRef<any>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  const defaultCenter: [number, number] = (currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null)
    ? [currentLocation.latitude, currentLocation.longitude] 
    : [10.762622, 106.660172]; // Default to HCMC

  const handleRecenter = () => {
    setIsFollowing(true);
    if (currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null) {
      mapRef.current?.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  };

  return (
    <div className={cn(
      "h-full w-full relative overflow-hidden rounded-2xl shadow-inner transition-colors duration-300",
      isDarkMode ? "bg-slate-900" : "bg-slate-200"
    )}>
      <style>{`
        .custom-user-marker {
          transition: transform 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        // @ts-ignore
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isDarkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        
        {currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null && (
          <>
            <UserLocationMarker location={currentLocation} showCompass={showCompass} />
            <MapUpdater center={[currentLocation.latitude, currentLocation.longitude]} isFollowing={isFollowing} />
          </>
        )}

        {destination && (
          <>
            <Marker 
              position={[destination.latitude, destination.longitude]}
              icon={L.icon({
                ...DefaultIcon.options,
                className: 'hue-rotate-[120deg]' // Green marker for destination
              })}
            />
            <Circle
              center={[destination.latitude, destination.longitude]}
              radius={radius}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
          </>
        )}

        <MapEvents 
          onSelect={onDestinationSelect} 
          onInteraction={() => setIsFollowing(false)} 
        />
      </MapContainer>
      
      {/* Recenter Controls */}
      <div className="absolute bottom-16 right-4 z-[1000] flex flex-col gap-2">
        {currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null && (
          <button 
            onClick={handleRecenter}
            className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-blue-500 active:scale-90 transition-transform"
            title="Re-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-locate-fixed"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
