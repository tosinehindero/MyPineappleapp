'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { collection, getDocs, query, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [locationShared, setLocationShared] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Check authentication and load user's saved location
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Check if user has saved coordinates
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.coordinates?.lat && data.coordinates?.lng) {
            setUserLocation([data.coordinates.lat, data.coordinates.lng]);
            setLocationShared(true);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Save user's current location to Firestore
  const shareMyLocation = async () => {
    if (!currentUser) {
      toast.error('Please log in to share your location');
      return;
    }

    setSharingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setSharingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Save to Firestore
          await updateDoc(doc(db, 'members', currentUser.uid), {
            coordinates: {
              lat: latitude,
              lng: longitude,
            },
            locationUpdatedAt: new Date(),
          });

          setUserLocation([latitude, longitude]);
          setLocationShared(true);
          toast.success('Location shared! Other members can now find you on the map.');
        } catch (error) {
          console.error('Error saving location:', error);
          toast.error('Failed to save location');
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMsg = 'Unable to get your location';
        if (error.code === 1) errorMsg = 'Location access denied. Please enable location permissions.';
        if (error.code === 2) errorMsg = 'Location unavailable. Please try again.';
        if (error.code === 3) errorMsg = 'Location request timed out. Please try again.';
        
        setLocationError(errorMsg);
        toast.error(errorMsg);
        setSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Hide my location from the map
  const hideMyLocation = async () => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'members', currentUser.uid), {
        coordinates: null,
        locationUpdatedAt: new Date(),
      });

      setLocationShared(false);
      toast.success('Your location has been hidden from the map');
    } catch (error) {
      console.error('Error hiding location:', error);
      toast.error('Failed to hide location');
    }
  };

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

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const membersRef = collection(db, 'members');
        const q = query(membersRef);
        const querySnapshot = await getDocs(q);

        const fetchedUsers: User[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Use actual coordinates from user profile if available
          let coordinates: { lat: number; lng: number } | undefined;
          
          if (data.coordinates && data.coordinates.lat && data.coordinates.lng) {
            // User has saved coordinates
            coordinates = {
              lat: data.coordinates.lat,
              lng: data.coordinates.lng,
            };
          } else if (data.location) {
            // Try to use location string to get approximate coordinates
            // For now, skip users without coordinates
            coordinates = undefined;
          }

          // Only add users who have valid coordinates
          if (coordinates) {
            fetchedUsers.push({
              id: docSnap.id,
              username: data.username || 'Anonymous',
              accountType: data.accountType || 'Single',
              location: data.location || 'Unknown',
              interests: data.interests || [],
              photoUrls: data.photoUrls || [],
              coordinates,
              isOnline: data.isOnline === true,
              lastSeen: data.lastSeen?.toDate() || new Date(),
            });
          }
        });

        setUsers(fetchedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userLocation, locationShared]);

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
      <Toaster theme="dark" position="top-right" />
      
      {/* Top Navigation Bar */}
      <div className="bg-darkBlue/95 backdrop-blur-md border-b border-gold/20 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-[1001]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/feed" className="flex items-center space-x-2 group">
            <span className="text-lg sm:text-xl font-heading text-gold group-hover:text-gold-light transition-colors">
              PineapplePlay
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/feed"
              className="text-offWhite/70 hover:text-gold transition-colors font-body text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <span>Feed</span>
            </Link>
            <span className="text-gold font-body text-sm flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Discover</span>
            </span>
            <Link
              href="/marketplace"
              className="text-offWhite/70 hover:text-gold transition-colors font-body text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Marketplace</span>
            </Link>
            <Link
              href="/messages"
              className="text-offWhite/70 hover:text-gold transition-colors font-body text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Messages</span>
            </Link>
          </nav>

          {/* Mobile Navigation Icons */}
          <div className="flex md:hidden items-center space-x-4">
            <Link href="/feed" className="text-offWhite/70 hover:text-gold transition-colors p-2">
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </Link>
            <span className="text-gold p-2">
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <Link href="/marketplace" className="text-offWhite/70 hover:text-gold transition-colors p-2">
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
            <Link href="/messages" className="text-offWhite/70 hover:text-gold transition-colors p-2">
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-row relative" style={{ height: 'calc(100vh - 72px)' }}>
        {/* Mobile Toggle Button for Sidebar */}
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="lg:hidden fixed bottom-6 right-6 z-[1002] bg-gold text-charcoal p-4 rounded-full shadow-lg hover:shadow-gold-glow transition-all"
          data-testid="toggle-online-sidebar-btn"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {onlineUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {onlineUsers.length}
            </span>
          )}
        </button>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-[1000] bg-darkBlue/95 backdrop-blur-md p-4 border-b border-gold/20">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h1 className="text-2xl font-heading text-gold">
                  Discover Members Near You
                </h1>
                
                {/* Share Location Button */}
                <div className="flex items-center gap-3">
                  {locationShared ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-sm font-body flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Location shared
                      </span>
                      <button
                        onClick={hideMyLocation}
                        className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
                      >
                        Hide
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={shareMyLocation}
                      disabled={sharingLocation}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-charcoal font-semibold text-sm rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
                      data-testid="share-location-btn"
                    >
                      {sharingLocation ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Getting location...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Share My Location</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

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
                              <div className="flex flex-wrap gap-1 mb-3">
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
                            <a
                              href={`/profile/${user.id}`}
                              className="block w-full text-center px-3 py-2 bg-gold text-charcoal font-semibold text-sm rounded hover:shadow-lg transition-all"
                            >
                              View Profile
                            </a>
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
          className={`${showMobileSidebar ? 'fixed inset-0 z-[1001] pt-16' : 'hidden'} lg:relative lg:block lg:pt-0 lg:z-auto w-full lg:w-96 bg-darkBlue border-l border-gold/20 overflow-y-auto`}
          data-testid="online-sidebar"
        >
          {/* Mobile Close Button */}
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="lg:hidden absolute top-4 right-4 text-offWhite/70 hover:text-gold p-2 z-10"
            data-testid="close-sidebar-btn"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
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
