'use client';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  address?: string;
  imageUrl?: string;
  category: 'social' | 'travel' | 'dining' | 'wellness' | 'nightlife' | 'other';
  hostId: string;
  hostUsername: string;
  hostPhotoUrl?: string;
  attendees: string[];
  attendeeCount: number;
  maxAttendees?: number;
  isPrivate: boolean;
  price?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  address?: string;
  category: Event['category'];
  maxAttendees?: number;
  isPrivate: boolean;
  price?: number;
}

// Create a new event
export async function createEvent(
  userId: string,
  username: string,
  userPhotoUrl: string | undefined,
  eventData: CreateEventData,
  imageFile?: File
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    let imageUrl: string | undefined;

    // Upload image if provided
    if (imageFile) {
      const timestamp = Date.now();
      const fileName = `event_${userId}_${timestamp}.${imageFile.name.split('.').pop()}`;
      const storageRef = ref(storage, `events/${userId}/${fileName}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    const eventDoc = await addDoc(collection(db, 'events'), {
      ...eventData,
      date: Timestamp.fromDate(eventData.date),
      endDate: eventData.endDate ? Timestamp.fromDate(eventData.endDate) : null,
      imageUrl,
      hostId: userId,
      hostUsername: username,
      hostPhotoUrl: userPhotoUrl || null,
      attendees: [userId], // Host is automatically attending
      attendeeCount: 1,
      status: 'upcoming',
      createdAt: Timestamp.now(),
    });

    return { success: true, eventId: eventDoc.id };
  } catch (error: any) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message };
  }
}

// Get upcoming events
export async function getEvents(
  filter: 'all' | 'upcoming' | 'attending' | 'hosting' = 'upcoming',
  userId?: string,
  limitCount: number = 20
): Promise<{ success: boolean; events: Event[]; error?: string }> {
  try {
    let eventsQuery;

    if (filter === 'attending' && userId) {
      eventsQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', userId),
        where('status', 'in', ['upcoming', 'ongoing']),
        orderBy('date', 'asc'),
        limit(limitCount)
      );
    } else if (filter === 'hosting' && userId) {
      eventsQuery = query(
        collection(db, 'events'),
        where('hostId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
    } else {
      eventsQuery = query(
        collection(db, 'events'),
        where('status', 'in', ['upcoming', 'ongoing']),
        where('isPrivate', '==', false),
        orderBy('date', 'asc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(eventsQuery);
    const events: Event[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      events.push({
        id: docSnap.id,
        title: data.title,
        description: data.description,
        date: data.date?.toDate() || new Date(),
        endDate: data.endDate?.toDate(),
        location: data.location,
        address: data.address,
        imageUrl: data.imageUrl,
        category: data.category,
        hostId: data.hostId,
        hostUsername: data.hostUsername,
        hostPhotoUrl: data.hostPhotoUrl,
        attendees: data.attendees || [],
        attendeeCount: data.attendeeCount || 0,
        maxAttendees: data.maxAttendees,
        isPrivate: data.isPrivate || false,
        price: data.price,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return { success: true, events };
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return { success: false, events: [], error: error.message };
  }
}

// Get a single event by ID
export async function getEventById(eventId: string): Promise<{ success: boolean; event?: Event; error?: string }> {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    
    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    const data = eventDoc.data();
    const event: Event = {
      id: eventDoc.id,
      title: data.title,
      description: data.description,
      date: data.date?.toDate() || new Date(),
      endDate: data.endDate?.toDate(),
      location: data.location,
      address: data.address,
      imageUrl: data.imageUrl,
      category: data.category,
      hostId: data.hostId,
      hostUsername: data.hostUsername,
      hostPhotoUrl: data.hostPhotoUrl,
      attendees: data.attendees || [],
      attendeeCount: data.attendeeCount || 0,
      maxAttendees: data.maxAttendees,
      isPrivate: data.isPrivate || false,
      price: data.price,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
    };

    return { success: true, event };
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return { success: false, error: error.message };
  }
}

// RSVP to an event
export async function rsvpToEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    const eventData = eventDoc.data();

    // Check if already attending
    if (eventData.attendees?.includes(userId)) {
      return { success: false, error: 'Already attending this event' };
    }

    // Check max attendees
    if (eventData.maxAttendees && eventData.attendeeCount >= eventData.maxAttendees) {
      return { success: false, error: 'Event is full' };
    }

    await updateDoc(eventRef, {
      attendees: arrayUnion(userId),
      attendeeCount: (eventData.attendeeCount || 0) + 1,
    });

    // Send notification to host
    await addDoc(collection(db, 'notifications'), {
      toUserId: eventData.hostId,
      fromUserId: userId,
      type: 'event_rsvp',
      title: 'New RSVP',
      message: `Someone RSVPed to your event "${eventData.title}"`,
      link: `/events/${eventId}`,
      read: false,
      createdAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error RSVPing to event:', error);
    return { success: false, error: error.message };
  }
}

// Cancel RSVP
export async function cancelRsvp(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    const eventData = eventDoc.data();

    // Can't cancel if you're the host
    if (eventData.hostId === userId) {
      return { success: false, error: 'Hosts cannot cancel their RSVP' };
    }

    await updateDoc(eventRef, {
      attendees: arrayRemove(userId),
      attendeeCount: Math.max(0, (eventData.attendeeCount || 1) - 1),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error canceling RSVP:', error);
    return { success: false, error: error.message };
  }
}

// Update event (host only)
export async function updateEvent(
  eventId: string,
  userId: string,
  updates: Partial<CreateEventData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    if (eventDoc.data().hostId !== userId) {
      return { success: false, error: 'Only the host can update this event' };
    }

    const updateData: any = { ...updates };
    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }

    await updateDoc(eventRef, updateData);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating event:', error);
    return { success: false, error: error.message };
  }
}

// Cancel event (host only)
export async function cancelEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    const eventData = eventDoc.data();

    if (eventData.hostId !== userId) {
      return { success: false, error: 'Only the host can cancel this event' };
    }

    await updateDoc(eventRef, {
      status: 'cancelled',
    });

    // Notify all attendees
    for (const attendeeId of eventData.attendees || []) {
      if (attendeeId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: attendeeId,
          fromUserId: userId,
          type: 'event_cancelled',
          title: 'Event Cancelled',
          message: `The event "${eventData.title}" has been cancelled`,
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error canceling event:', error);
    return { success: false, error: error.message };
  }
}

// Delete event (host only)
export async function deleteEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return { success: false, error: 'Event not found' };
    }

    if (eventDoc.data().hostId !== userId) {
      return { success: false, error: 'Only the host can delete this event' };
    }

    await deleteDoc(eventRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return { success: false, error: error.message };
  }
}

// Get event categories
export const EVENT_CATEGORIES: { value: Event['category']; label: string; emoji: string }[] = [
  { value: 'social', label: 'Social Gathering', emoji: '🥂' },
  { value: 'travel', label: 'Travel & Adventure', emoji: '✈️' },
  { value: 'dining', label: 'Dining & Wine', emoji: '🍷' },
  { value: 'wellness', label: 'Wellness & Spa', emoji: '💆' },
  { value: 'nightlife', label: 'Nightlife & Party', emoji: '🎉' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

export function getCategoryInfo(category: Event['category']) {
  return EVENT_CATEGORIES.find(c => c.value === category) || EVENT_CATEGORIES[5];
}
