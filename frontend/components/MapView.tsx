'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface User {
  id: string;
  username: string;
  accountType: string;
  location: string;
  interests: string[];
  photoUrls: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  isOnline?: boolean;
  lastSeen?: Date;
}

export default function MapView() {
  const [users, setUsers] = useState<User[]>([]);
  const [radius, setRadius] = useState(25); // Default 25 miles
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number]>([
    25.7617, -80.1918, // Default: Miami, FL
  ]);
  const [customIcon, setCustomIcon] = useState<any>(null);

  // Initialize custom icon for client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      
      // Fix for default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl: '/marker-icon.png',
        shadowUrl: '/marker-shadow.png',
      });

      // Create custom gold pin icon
      const goldIcon = new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 48 16 48C16 48 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#D4AF37"/>
            <circle cx="16" cy="16" r="8" fill="#0F172A"/>
          </svg>
        `),
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -48],
      });

      setCustomIcon(goldIcon);
    }
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Keep default location
        }
      );
    }
  }, []);

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const membersRef = collection(db, 'members');
        const q = query(membersRef);
        const querySnapshot = await getDocs(q);

        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Generate random coordinates near the center for demo
          // In production, you'd have actual user coordinates
          const lat = userLocation[0] + (Math.random() - 0.5) * 0.5;
          const lng = userLocation[1] + (Math.random() - 0.5) * 0.5;

          fetchedUsers.push({
            id: doc.id,
            username: data.username || 'Anonymous',
            accountType: data.accountType || 'Single',
            location: data.location || 'Unknown',
            interests: data.interests || [],
            photoUrls: data.photoUrls || [],
            coordinates: { lat, lng },
            isOnline: Math.random() > 0.5, // Random online status for demo
            lastSeen: new Date(),
          });
        });

        setUsers(fetchedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userLocation]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter users within radius
  const usersInRadius = useMemo(() => {
    return users.filter((user) => {
      if (!user.coordinates) return false;
      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        user.coordinates.lat,
        user.coordinates.lng
      );
      return distance <= radius;
    });
  }, [users, userLocation, radius]);

  // Online users
  const onlineUsers = useMemo(() => {
    return usersInRadius.filter((user) => user.isOnline);
  }, [usersInRadius]);

  const radiusInMeters = radius * 1609.34; // Convert miles to meters

  return (
    <div className="min-h-screen bg-charcoal">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-[1000] bg-darkBlue/95 backdrop-blur-md p-4 border-b border-gold/20">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-heading text-gold mb-4">
                Discover Members Near You
              </h1>

              {/* Radius Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-offWhite font-body">
                    Search Radius: <span className="text-gold font-semibold">{radius} miles</span>
                  </label>
                  <span className="text-offWhite/70 text-sm">
                    {usersInRadius.length} members found
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${(radius / 50) * 100}%, #0F172A ${(radius / 50) * 100}%, #0F172A 100%)`,
                  }}
                  data-testid="radius-slider"
                />
                <div className="flex justify-between text-xs text-offWhite/60">
                  <span>0 mi</span>
                  <span>25 mi</span>
                  <span>50 mi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="h-full w-full pt-32">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-offWhite font-body">Loading map...</p>
                </div>
              </div>
            ) : (
              customIcon && (
                <MapContainer
                  center={userLocation}
                  zoom={11}
                  className="h-full w-full"
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Radius Circle */}
                  <Circle
                    center={userLocation}
                    radius={radiusInMeters}
                    pathOptions={{
                      color: '#D4AF37',
                      fillColor: '#D4AF37',
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  />

                  {/* User Markers */}
                  {usersInRadius.map((user) => (
                    user.coordinates && (
                      <Marker
                        key={user.id}
                        position={[user.coordinates.lat, user.coordinates.lng]}
                        icon={customIcon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <div className="flex items-center space-x-3 mb-2">
                              {user.photoUrls[0] ? (
                                <img
                                  src={user.photoUrls[0]}
                                  alt={user.username}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gold"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-charcoal font-heading text-xl">
                                  {user.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="font-heading text-lg text-charcoal">
                                  {user.username}
                                </h3>
                                {user.isOnline && (
                                  <span className="text-xs text-green-600 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                    Online
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{user.accountType}</p>
                            <p className="text-sm text-gray-600 mb-2">{user.location}</p>
                            {user.interests.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {user.interests.slice(0, 3).map((interest) => (
                                  <span
                                    key={interest}
                                    className="text-xs px-2 py-1 bg-gold/20 text-gray-700 rounded-full"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}

                  {/* Current Location Marker */}
                  <Marker position={userLocation}>
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold">Your Location</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              )
            )}
          </div>
        </div>

        {/* Who's Online Sidebar */}
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          className="w-full lg:w-96 bg-darkBlue border-l border-gold/20 overflow-y-auto"
          data-testid="online-sidebar"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading text-gold">Who's Online</h2>
              <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm font-semibold">
                {onlineUsers.length}
              </span>
            </div>

            {onlineUsers.length === 0 ? (
              <p className="text-offWhite/60 text-center py-8 font-body">
                No members online in your area
              </p>
            ) : (
              <div className="space-y-4">
                {onlineUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="glass-morphism rounded-lg p-4 cursor-pointer hover:border-gold/40 transition-all"
                    data-testid={`online-user-${user.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar with Online Indicator */}
                      <div className="relative">
                        {user.photoUrls[0] ? (
                          <img
                            src={user.photoUrls[0]}
                            alt={user.username}
                            className="w-14 h-14 rounded-full object-cover border-2 border-gold"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-charcoal font-heading text-xl border-2 border-gold">
                            {user.username[0]?.toUpperCase()}
                          </div>
                        )}
                        
                        {/* Green Pulse Indicator */}
                        <div className="absolute -bottom-1 -right-1">
                          <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-darkBlue"></span>
                          </span>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-lg text-gold truncate">
                          {user.username}
                        </h3>
                        <p className="text-offWhite/70 text-sm mb-2">
                          {user.accountType}
                        </p>
                        <p className="text-offWhite/60 text-xs mb-2">
                          📍 {user.location}
                        </p>
                        
                        {/* Interests */}
                        {user.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.interests.slice(0, 2).map((interest) => (
                              <span
                                key={interest}
                                className="text-xs px-2 py-1 bg-gold/20 text-gold rounded-full"
                              >
                                {interest}
                              </span>
                            ))}
                            {user.interests.length > 2 && (
                              <span className="text-xs px-2 py-1 text-offWhite/60">
                                +{user.interests.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
