'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import {
  getEvents,
  createEvent,
  rsvpToEvent,
  cancelRsvp,
  EVENT_CATEGORIES,
  getCategoryInfo,
  type Event,
  type CreateEventData,
} from '@/lib/events';

type FilterType = 'all' | 'upcoming' | 'attending' | 'hosting';

export default function EventsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ username: string; photoUrl?: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [processingRsvp, setProcessingRsvp] = useState<string | null>(null);

  // Create event form state
  const [newEvent, setNewEvent] = useState<CreateEventData>({
    title: '',
    description: '',
    date: new Date(),
    location: '',
    address: '',
    category: 'social',
    maxAttendees: undefined,
    isPrivate: false,
    price: undefined,
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            username: data.username || user.email?.split('@')[0] || 'Member',
            photoUrl: data.photoUrls?.[0],
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [activeFilter, currentUser]);

  const loadEvents = async () => {
    setLoading(true);
    const result = await getEvents(activeFilter, currentUser?.uid);
    if (result.success) {
      setEvents(result.events);
    }
    setLoading(false);
  };

  const handleCreateEvent = async () => {
    if (!currentUser || !userProfile) {
      toast.error('Please sign in to create events');
      return;
    }

    if (!newEvent.title || !newEvent.description || !newEvent.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    const result = await createEvent(
      currentUser.uid,
      userProfile.username,
      userProfile.photoUrl,
      newEvent,
      eventImage || undefined
    );

    if (result.success) {
      toast.success('Event created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      loadEvents();
    } else {
      toast.error('Failed to create event', { description: result.error });
    }
    setCreating(false);
  };

  const handleRsvp = async (eventId: string, isAttending: boolean) => {
    if (!currentUser) {
      toast.error('Please sign in to RSVP');
      return;
    }

    setProcessingRsvp(eventId);
    const result = isAttending
      ? await cancelRsvp(eventId, currentUser.uid)
      : await rsvpToEvent(eventId, currentUser.uid);

    if (result.success) {
      toast.success(isAttending ? 'RSVP cancelled' : 'RSVP confirmed!');
      loadEvents();
    } else {
      toast.error(result.error || 'Failed to update RSVP');
    }
    setProcessingRsvp(null);
  };

  const resetCreateForm = () => {
    setNewEvent({
      title: '',
      description: '',
      date: new Date(),
      location: '',
      address: '',
      category: 'social',
      maxAttendees: undefined,
      isPrivate: false,
      price: undefined,
    });
    setEventImage(null);
    setEventImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }
      setEventImage(file);
      setEventImagePreview(URL.createObjectURL(file));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isUserAttending = (event: Event) => {
    return currentUser && event.attendees.includes(currentUser.uid);
  };

  const isEventFull = (event: Event) => {
    return event.maxAttendees && event.attendeeCount >= event.maxAttendees;
  };

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-darkBlue/95 backdrop-blur-md border-b border-gold/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link href="/feed" className="text-offWhite/60 hover:text-gold transition-colors">
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-heading text-gold">Events</h1>
                <p className="text-offWhite/60 text-sm font-body">Discover and host exclusive gatherings</p>
              </div>
            </div>
            {currentUser && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gold text-charcoal rounded-full font-semibold hover:shadow-gold-glow transition-all flex items-center space-x-2"
                data-testid="create-event-btn"
              >
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Event</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {[
              { key: 'upcoming', label: 'Upcoming', icon: '📅' },
              { key: 'attending', label: 'My RSVPs', icon: '✓' },
              { key: 'hosting', label: 'Hosting', icon: '👑' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={`px-4 py-2 rounded-full text-sm font-body whitespace-nowrap transition-all flex items-center space-x-2 ${
                  activeFilter === filter.key
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-white/[0.03] text-offWhite/60 border border-white/10 hover:border-gold/20'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎭</span>
            </div>
            <h2 className="text-xl font-heading text-gold mb-2">No Events Found</h2>
            <p className="text-offWhite/60 font-body mb-6">
              {activeFilter === 'hosting'
                ? "You haven't created any events yet."
                : activeFilter === 'attending'
                ? "You haven't RSVP'd to any events yet."
                : 'No upcoming events. Be the first to create one!'}
            </p>
            {currentUser && activeFilter !== 'hosting' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gold text-charcoal rounded-full font-semibold hover:shadow-gold-glow transition-all"
              >
                Create an Event
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => {
              const categoryInfo = getCategoryInfo(event.category);
              const isAttending = isUserAttending(event);
              const isFull = isEventFull(event);
              const isHost = currentUser?.uid === event.hostId;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-darkBlue/60 border border-gold/10 rounded-2xl overflow-hidden hover:border-gold/30 transition-all group"
                  data-testid={`event-card-${event.id}`}
                >
                  {/* Event Image */}
                  <div className="aspect-video bg-charcoal relative overflow-hidden">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold/5">
                        <span className="text-6xl">{categoryInfo.emoji}</span>
                      </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-charcoal/80 backdrop-blur-sm rounded-full text-sm font-body flex items-center space-x-1">
                      <span>{categoryInfo.emoji}</span>
                      <span className="text-offWhite/80">{categoryInfo.label}</span>
                    </div>
                    {/* Status Badge */}
                    {event.status === 'cancelled' && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-red-500/80 rounded-full text-sm font-body text-white">
                        Cancelled
                      </div>
                    )}
                    {isFull && event.status !== 'cancelled' && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-500/80 rounded-full text-sm font-body text-charcoal">
                        Full
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-heading text-offWhite mb-2 line-clamp-1">{event.title}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-offWhite/60 text-sm">
                        <svg className="w-4 h-4 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-offWhite/60 text-sm">
                        <svg className="w-4 h-4 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>

                    {/* Host Info */}
                    <div className="flex items-center justify-between mb-4">
                      <Link href={`/profile/${event.hostId}`} className="flex items-center space-x-2 group/host">
                        {event.hostPhotoUrl ? (
                          <img src={event.hostPhotoUrl} alt={event.hostUsername} className="w-6 h-6 rounded-full object-cover border border-gold/30" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-heading">
                            {event.hostUsername[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-offWhite/60 group-hover/host:text-gold transition-colors">
                          {isHost ? 'You' : event.hostUsername}
                        </span>
                      </Link>
                      <div className="flex items-center space-x-1 text-offWhite/40 text-sm">
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.attendeeCount}{event.maxAttendees ? `/${event.maxAttendees}` : ''}</span>
                      </div>
                    </div>

                    {/* Price */}
                    {event.price !== undefined && event.price > 0 && (
                      <div className="mb-4 text-gold font-semibold">
                        ${event.price.toFixed(2)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="flex-1 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-sm font-body text-offWhite/80 hover:border-gold/30 hover:text-gold transition-all"
                      >
                        View Details
                      </button>
                      {!isHost && event.status !== 'cancelled' && (
                        <button
                          onClick={() => handleRsvp(event.id, isAttending)}
                          disabled={processingRsvp === event.id || (isFull && !isAttending) || false}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                            isAttending
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                              : 'bg-gold text-charcoal hover:shadow-gold-glow'
                          }`}
                          data-testid={`rsvp-btn-${event.id}`}
                        >
                          {processingRsvp === event.id ? '...' : isAttending ? 'Attending ✓' : isFull ? 'Full' : 'RSVP'}
                        </button>
                      )}
                      {isHost && (
                        <Link
                          href={`/events/${event.id}/manage`}
                          className="flex-1 py-2 bg-gold/20 border border-gold/30 rounded-lg text-sm font-body text-gold text-center hover:bg-gold/30 transition-all"
                        >
                          Manage
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-darkBlue border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-darkBlue border-b border-gold/10 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-heading text-gold">Create Event</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-offWhite/60 hover:text-offWhite transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Event Image */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Event Image</label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="aspect-video bg-white/[0.03] border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-gold/30 transition-colors flex items-center justify-center overflow-hidden"
                  >
                    {eventImagePreview ? (
                      <img src={eventImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <svg className="w-12 h-12 text-offWhite/20 mx-auto mb-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-offWhite/40 text-sm">Click to upload image</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., VIP Yacht Party"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50"
                    data-testid="event-title-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Description *</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your event..."
                    rows={4}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewEvent(prev => ({ ...prev, category: cat.value }))}
                        className={`p-3 rounded-lg text-sm font-body transition-all flex items-center justify-center space-x-2 ${
                          newEvent.category === cat.value
                            ? 'bg-gold/20 text-gold border border-gold/30'
                            : 'bg-white/[0.03] text-offWhite/60 border border-white/10 hover:border-gold/20'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span className="hidden sm:inline">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-offWhite/80 text-sm font-body mb-2">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.date.toISOString().slice(0, 16)}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, date: new Date(e.target.value) }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div>
                    <label className="block text-offWhite/80 text-sm font-body mb-2">End Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={newEvent.endDate?.toISOString().slice(0, 16) || ''}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value ? new Date(e.target.value) : undefined }))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Location *</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Miami Beach, FL"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">Full Address (Optional)</label>
                  <input
                    type="text"
                    value={newEvent.address || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., 123 Ocean Drive"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50"
                  />
                </div>

                {/* Max Attendees & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-offWhite/80 text-sm font-body mb-2">Max Attendees</label>
                    <input
                      type="number"
                      min="2"
                      value={newEvent.maxAttendees || ''}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, maxAttendees: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="Unlimited"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div>
                    <label className="block text-offWhite/80 text-sm font-body mb-2">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newEvent.price || ''}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="Free"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>

                {/* Private Event Toggle */}
                <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                  <div>
                    <p className="text-offWhite font-body font-medium">Private Event</p>
                    <p className="text-offWhite/50 text-xs">Only visible to members you invite</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewEvent(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      newEvent.isPrivate ? 'bg-gold' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      newEvent.isPrivate ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>

                {/* Submit */}
                <button
                  onClick={handleCreateEvent}
                  disabled={creating || !newEvent.title || !newEvent.description || !newEvent.location}
                  className="w-full py-4 bg-gold text-charcoal rounded-xl font-semibold hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  data-testid="submit-event-btn"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Event</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-darkBlue border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Event Image */}
              <div className="aspect-video bg-charcoal relative">
                {selectedEvent.imageUrl ? (
                  <img src={selectedEvent.imageUrl} alt={selectedEvent.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold/5">
                    <span className="text-8xl">{getCategoryInfo(selectedEvent.category).emoji}</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:text-gold transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-body">
                      {getCategoryInfo(selectedEvent.category).emoji} {getCategoryInfo(selectedEvent.category).label}
                    </span>
                    <h2 className="text-2xl font-heading text-offWhite mt-3">{selectedEvent.title}</h2>
                  </div>
                  {selectedEvent.price !== undefined && selectedEvent.price > 0 && (
                    <span className="text-2xl font-heading text-gold">${selectedEvent.price.toFixed(2)}</span>
                  )}
                </div>

                <p className="text-offWhite/80 font-body mb-6 whitespace-pre-wrap">{selectedEvent.description}</p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-offWhite font-body">{formatDate(selectedEvent.date)}</p>
                      {selectedEvent.endDate && (
                        <p className="text-offWhite/50 text-sm">Until {formatDate(selectedEvent.endDate)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-offWhite font-body">{selectedEvent.location}</p>
                      {selectedEvent.address && (
                        <p className="text-offWhite/50 text-sm">{selectedEvent.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-offWhite font-body">
                        {selectedEvent.attendeeCount} attending
                        {selectedEvent.maxAttendees && ` of ${selectedEvent.maxAttendees} max`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Host */}
                <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl mb-6">
                  <Link href={`/profile/${selectedEvent.hostId}`} className="flex items-center space-x-3 group">
                    {selectedEvent.hostPhotoUrl ? (
                      <img src={selectedEvent.hostPhotoUrl} alt={selectedEvent.hostUsername} className="w-10 h-10 rounded-full object-cover border-2 border-gold/30" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-heading">
                        {selectedEvent.hostUsername[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-offWhite/50 text-xs">Hosted by</p>
                      <p className="text-offWhite font-body group-hover:text-gold transition-colors">{selectedEvent.hostUsername}</p>
                    </div>
                  </Link>
                  <Link
                    href={`/messages?userId=${selectedEvent.hostId}`}
                    className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-sm font-body text-offWhite/80 hover:border-gold/30 hover:text-gold transition-all"
                  >
                    Message Host
                  </Link>
                </div>

                {/* RSVP Button */}
                {currentUser?.uid !== selectedEvent.hostId && selectedEvent.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      handleRsvp(selectedEvent.id, isUserAttending(selectedEvent));
                      setSelectedEvent(null);
                    }}
                    disabled={processingRsvp === selectedEvent.id || (isEventFull(selectedEvent) && !isUserAttending(selectedEvent))}
                    className={`w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 ${
                      isUserAttending(selectedEvent)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gold text-charcoal hover:shadow-gold-glow'
                    }`}
                  >
                    {isUserAttending(selectedEvent) ? 'Cancel RSVP' : isEventFull(selectedEvent) ? 'Event Full' : 'RSVP Now'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
