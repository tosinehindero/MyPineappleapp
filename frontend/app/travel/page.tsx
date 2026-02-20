'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import {
  saveDestination,
  unsaveDestination,
  getSavedDestinations,
  type SavedDestination,
} from './actions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface DestinationCard {
  name: string;
  location: string;
  type: string;
  description: string;
  highlights: string[];
  priceRange: string;
  imageQuery: string;
}

export default function TravelPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [userFantasies, setUserFantasies] = useState('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [savingDestination, setSavingDestination] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auth and user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setSessionId(`travel_${user.uid}_${Date.now()}`);
        
        // Fetch user's fantasies and interests for personalization
        try {
          const userDoc = await getDoc(doc(db, 'members', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserFantasies(userData.fantasies || '');
            setUserInterests(userData.interests || []);
          }
          
          // Load saved destinations
          const savedResult = await getSavedDestinations(user.uid);
          if (savedResult.success) {
            setSavedDestinations(savedResult.data);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
        
        // Add welcome message from Sasha
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm Sasha, your personal travel concierge. ✨\n\nI specialize in curating exclusive, discreet travel experiences for our distinguished members. Whether you're dreaming of a clothing-optional beach resort, a private villa getaway, or an adults-only luxury retreat, I'm here to make it happen.\n\nWhat kind of escape are you envisioning?`,
          timestamp: new Date(),
        }]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Parse destination cards from response
  const parseDestinations = (content: string): { text: string; destinations: DestinationCard[] } => {
    const destinations: DestinationCard[] = [];
    let cleanedText = content;
    
    // Find all destination JSON blocks
    const regex = /```destination\s*([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      try {
        const jsonStr = match[1].trim();
        const destination = JSON.parse(jsonStr);
        destinations.push(destination);
        cleanedText = cleanedText.replace(match[0], '');
      } catch (e) {
        console.error('Error parsing destination:', e);
      }
    }
    
    return { text: cleanedText.trim(), destinations };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/travel/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: inputMessage,
          user_fantasies: userFantasies,
          user_interests: userInterests,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Check if destination is saved
  const isDestinationSaved = (name: string) => {
    return savedDestinations.some(d => d.name === name);
  };

  // Handle save/unsave destination
  const handleSaveDestination = async (destination: DestinationCard) => {
    if (!currentUser) return;
    
    setSavingDestination(destination.name);
    
    const isSaved = isDestinationSaved(destination.name);
    
    if (isSaved) {
      // Unsave
      const savedDest = savedDestinations.find(d => d.name === destination.name);
      if (savedDest) {
        const result = await unsaveDestination(savedDest.id);
        if (result.success) {
          setSavedDestinations(prev => prev.filter(d => d.id !== savedDest.id));
          toast.success('Destination removed from saved');
        }
      }
    } else {
      // Save
      const result = await saveDestination(currentUser.uid, destination);
      if (result.success) {
        const newSaved: SavedDestination = {
          id: result.id!,
          userId: currentUser.uid,
          ...destination,
          savedAt: new Date(),
        };
        setSavedDestinations(prev => [newSaved, ...prev]);
        toast.success('Destination saved!', {
          description: 'Find it in your saved destinations',
        });
      }
    }
    
    setSavingDestination(null);
  };

  // Render destination card
  const DestinationCardComponent = ({ destination, showActions = true }: { destination: DestinationCard; showActions?: boolean }) => {
    const isSaved = isDestinationSaved(destination.name);
    const isSaving = savingDestination === destination.name;
    
    return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-darkBlue to-charcoal rounded-2xl overflow-hidden border border-gold/30 shadow-xl my-4"
    >
      {/* Image placeholder with gradient */}
      <div className="h-48 bg-gradient-to-br from-gold/20 to-gold/5 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-6xl">🏝️</span>
            <p className="text-gold/60 text-sm mt-2 font-body">{destination.location}</p>
          </div>
        </div>
        <div className="absolute top-4 left-4">
          <button
            onClick={() => handleSaveDestination(destination)}
            disabled={isSaving}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isSaved 
                ? 'bg-gold text-charcoal' 
                : 'bg-charcoal/80 text-gold hover:bg-gold hover:text-charcoal'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save destination'}
          >
            {isSaving ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-gold text-charcoal text-xs font-semibold rounded-full">
            {destination.priceRange}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-charcoal to-transparent"></div>
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-heading text-gold mb-1">{destination.name}</h3>
            <p className="text-offWhite/60 text-sm font-body">{destination.type}</p>
          </div>
        </div>
        
        <p className="text-offWhite/80 font-body text-sm mb-4">{destination.description}</p>
        
        {destination.highlights && destination.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {destination.highlights.map((highlight, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gold/10 text-gold/80 text-xs rounded-full font-body"
              >
                {highlight}
              </span>
            ))}
          </div>
        )}
        
        {showActions && (
          <div className="flex space-x-3">
            <button
              className="flex-1 py-3 bg-gold text-charcoal font-semibold rounded-xl hover:shadow-gold-glow transition-all flex items-center justify-center space-x-2"
              onClick={() => {
                setInputMessage(`Tell me more about ${destination.name} and help me book it.`);
                inputRef.current?.focus();
              }}
            >
              <span>Book Now</span>
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )};

  // Render message content with destination cards
  const renderMessageContent = (content: string) => {
    const { text, destinations } = parseDestinations(content);
    
    return (
      <>
        {text && (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
        {destinations.map((dest, i) => (
          <DestinationCardComponent key={i} destination={dest} />
        ))}
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading your concierge...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold/30">
            <span className="text-4xl">✈️</span>
          </div>
          <h1 className="text-3xl font-heading text-gold mb-4">Travel Concierge</h1>
          <p className="text-offWhite/70 font-body mb-8">
            Sign in to access Sasha, your personal luxury travel concierge who can help plan your perfect getaway.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      {/* Header */}
      <div className="bg-darkBlue/50 border-b border-gold/20 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gold/60 hover:text-gold transition-colors">
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center shadow-gold-glow">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-heading text-gold">Sasha</h1>
                <p className="text-offWhite/60 text-sm font-body">Luxury Travel Concierge</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-sm font-body">Online</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-gold text-charcoal rounded-2xl rounded-br-sm px-5 py-3'
                      : 'bg-darkBlue/70 text-offWhite rounded-2xl rounded-bl-sm px-5 py-3 border border-gold/10'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="font-body text-sm leading-relaxed">
                      {renderMessageContent(message.content)}
                    </div>
                  ) : (
                    <p className="font-body text-sm">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-darkBlue/70 rounded-2xl rounded-bl-sm px-5 py-3 border border-gold/10">
                <div className="flex space-x-2">
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-darkBlue/50 border-t border-gold/20 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Sasha about your dream destination..."
                className="w-full px-5 py-4 bg-charcoal border border-gold/20 rounded-2xl text-offWhite font-body focus:outline-none focus:border-gold transition-colors pr-12"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6 text-charcoal" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              'Clothing-optional resorts',
              'Private villas for couples',
              'Adults-only beach retreats',
              'Exclusive group experiences',
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputMessage(suggestion);
                  inputRef.current?.focus();
                }}
                className="px-4 py-2 bg-gold/10 text-gold/80 rounded-full text-sm font-body hover:bg-gold/20 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
