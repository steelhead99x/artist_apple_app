// User types
export type UserType = 'artist' | 'band' | 'studio' | 'venue' | 'booking_agent' | 'manager';

export interface User {
  id: string;
  username: string;
  email: string;
  userType: UserType;
  profileImage?: string;
  bio?: string;
  createdAt: string;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  userType: UserType;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Project types (example - adjust based on your API)
export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  collaborators: User[];
  createdAt: string;
  updatedAt: string;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: MediaFile[];
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

// Location type
export interface Location {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

// Media types
export interface MediaFile {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: number;
  uploadedAt: string;
}

// Booking types
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type BookingType = 'performance' | 'recording' | 'venue_rental';

export interface BookingRequest {
  id: string;
  requesterId: string;
  targetId: string;
  type: BookingType;
  eventDate: string;
  endDate?: string;
  status: BookingStatus;
  details: string;
  offer?: {
    amount: number;
    currency: string;
    terms: string;
  };
  venueId?: string;
  createdAt: string;
  updatedAt: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  date: string;
  venueId?: string;
  artistIds: string[];
  description: string;
  ticketUrl?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
}

// Extended user types
export interface Artist extends User {
  userType: 'artist';
  genres?: string[];
  instruments?: string[];
  location?: Location;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    spotify?: string;
    youtube?: string;
  };
  mediaGallery?: MediaFile[];
  verified?: boolean;
}

export interface Band extends User {
  userType: 'band';
  genres?: string[];
  members?: BandMember[];
  location?: Location;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    spotify?: string;
    youtube?: string;
  };
  mediaGallery?: MediaFile[];
  verified?: boolean;
}

export interface BandMember {
  userId?: string;
  name: string;
  role: string;
  instrument?: string;
}

export interface RecordingStudio extends User {
  userType: 'studio';
  specifications?: string[];
  hourlyRate?: number;
  dailyRate?: number;
  equipment?: string[];
  location?: Location;
  capacity?: number;
  mediaGallery?: MediaFile[];
  verified?: boolean;
}

export interface Venue extends User {
  userType: 'venue';
  capacity?: number;
  location?: Location;
  amenities?: string[];
  technicalSpecs?: {
    stageSize?: string;
    soundSystem?: string;
    lighting?: string;
    parking?: string;
  };
  pricing?: {
    baseRate?: number;
    deposit?: number;
    minimumSpend?: number;
  };
  mediaGallery?: MediaFile[];
  verified?: boolean;
}

export interface BookingAgent extends User {
  userType: 'booking_agent';
  agency?: string;
  rosterIds?: string[];
  specialties?: string[];
  commission?: number;
  location?: Location;
  verified?: boolean;
}

// Search types
export interface SearchFilters {
  userType?: UserType[];
  location?: {
    city?: string;
    radius?: number;
  };
  genres?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  availability?: {
    startDate?: string;
    endDate?: string;
  };
  verified?: boolean;
}

export interface SearchResult {
  users: User[];
  total: number;
  page: number;
  perPage: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'booking_request' | 'booking_response' | 'collaboration' | 'system';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  createdAt: string;
}
