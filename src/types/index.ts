// ============================================================================
// USER TYPES
// ============================================================================

export type UserType = 'user' | 'band' | 'studio' | 'bar' | 'booking_agent' | 'booking_manager';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'deleted';
export type AgentStatus = 'pending' | 'active' | 'suspended';
export type SuspensionReason = 'admin_deleted' | 'payment_overdue' | 'user_deleted';

export interface User {
  id: string;
  email: string;
  recovery_email?: string;
  wallet_address?: string;
  user_type: UserType;
  name: string;
  status: UserStatus;
  requires_password_reset: boolean;
  custom_band_limit?: number;
  deleted_at?: string;
  suspension_reason?: SuspensionReason;
  is_admin_agent?: boolean;
  agent_status?: AgentStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  user_type: UserType;
  recovery_email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

// ============================================================================
// BAND TYPES
// ============================================================================

export type BandStatus = 'pending' | 'approved' | 'rejected';

export interface Band {
  id: string;
  user_id: string;
  booking_manager_id?: string;
  band_name: string;
  description?: string;
  genre?: string;
  eth_wallet?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    spotify?: string;
    youtube?: string;
  };
  status: BandStatus;
  admin_notes?: string;
  admin_email?: string;
  band_email?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  recovery_email?: string;
  created_at: string;
  // Joined fields from queries
  role?: 'owner' | 'member';
  owner_name?: string;
  owner_email?: string;
  booking_manager_name?: string;
  booking_manager_email?: string;
}

export interface BandLimits {
  maxBands: number;
  currentCount: number;
  canCreateMore: boolean;
  planName: string;
  isCustomLimit: boolean;
}

export interface CreateBandData {
  band_name: string;
  description?: string;
  genre?: string;
  website?: string;
  acknowledgeDuplicate?: boolean;
  admin_email?: string;
  is_solo?: boolean;
}

export interface JoinBandData {
  band_name: string;
  role?: string;
}

// ============================================================================
// BAND MEMBER TYPES
// ============================================================================

export type BandMemberStatus = 'active' | 'inactive' | 'pending';

export interface BandMemberPermissions {
  can_modify_profile: boolean;
  can_receive_band_emails: boolean;
  can_manage_members?: boolean;
  is_owner?: boolean;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  role?: string;
  status: BandMemberStatus;
  permissions: BandMemberPermissions;
  joined_at: string;
  // Joined fields
  name?: string;
  email?: string;
}

// ============================================================================
// VENUE TYPES
// ============================================================================

export interface Venue {
  id: string;
  user_id: string;
  venue_name: string;
  address: string;
  city: string;
  state: string;
  capacity?: number;
  eth_wallet?: string;
  description?: string;
  amenities?: string[];
  created_at: string;
  // Joined fields
  owner_name?: string;
  email?: string;
}

// ============================================================================
// TOUR TYPES
// ============================================================================

export type TourStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface TourDate {
  id: string;
  band_id: string;
  venue_id: string;
  booking_agent_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  status: TourStatus;
  payment_amount?: number;
  payment_currency?: string;
  payment_amount_eth?: number;
  payment_status?: 'pending' | 'paid' | 'partial' | 'overdue';
  exchange_rate?: number;
  notes?: string;
  created_at: string;
  // Joined fields from queries
  band_name?: string;
  venue_name?: string;
  venue_contact_email?: string;
  city?: string;
  state?: string;
  address?: string;
  tour_id?: string;
  tour_name?: string;
  computed_status?: TourStatus;
  payment_completed?: boolean;
  is_upcoming?: boolean;
  // KPI fields
  attendance?: number;
  bar_sales?: number;
  new_customers?: number;
}

export interface TourKPI {
  id: string;
  tour_date_id: string;
  attendance?: number;
  bar_sales?: number;
  sales_currency?: string;
  bar_sales_eth?: number;
  exchange_rate?: number;
  new_customers?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateTourData {
  band_id: string;
  venue_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  payment_amount?: number;
  payment_currency?: string;
  notes?: string;
}

// ============================================================================
// STUDIO TYPES
// ============================================================================

export interface RecordingStudio {
  id: string;
  user_id: string;
  studio_name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  equipment?: Equipment;
  daw_software?: string;
  hourly_rate?: number;
  eth_wallet?: string;
  website?: string;
  protools_version?: string;
  sonobus_enabled: boolean;
  webrtc_enabled: boolean;
  created_at: string;
  // Joined fields
  owner_name?: string;
  email?: string;
}

// Equipment and recording file types
export interface Equipment {
  [key: string]: string | number | boolean | string[];
}

export interface RecordingFile {
  filename: string;
  url?: string;
  size?: number;
  format?: string;
  uploadedAt?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  spotify?: string;
  soundcloud?: string;
  bandcamp?: string;
  [key: string]: string | undefined;
}

export interface FeatureValue {
  [key: string]: string | number | boolean | null;
}

export interface Metadata {
  [key: string]: string | number | boolean | null | undefined;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled';
export type ConnectionType = 'sonobus' | 'webrtc' | 'both' | 'livekit';

export interface StudioSession {
  id: string;
  studio_id: string;
  band_id: string;
  user_id?: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  connection_type?: ConnectionType;
  session_notes?: string;
  recording_files?: RecordingFile[];
  status: SessionStatus;
  livekit_room_name?: string;
  created_at: string;
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';
export type PaymentMethod = 'stripe' | 'eth_wallet' | 'bank_transfer' | 'paypal' | 'gift_card' | 'free';

export interface SubscriptionPlan {
  id: string;
  name: string;
  user_type: UserType;
  price_monthly: number;
  price_yearly?: number;
  features: string; // JSON string
  max_bands: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_method: PaymentMethod;
  stripe_subscription_id?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  plan_name?: string;
  price?: number;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';

export interface TourPayment {
  id: string;
  tour_date_id: string;
  venue_payment_amount: number;
  booking_agent_fee_percentage?: number;
  booking_agent_fee_amount?: number;
  other_fees_amount?: number;
  total_band_payout: number;
  payment_status: PaymentStatus;
  payment_date?: string;
  payment_method?: PaymentMethod;
  transaction_hash?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TourMemberPayout {
  id: string;
  tour_payment_id: string;
  user_id: string;
  band_member_name: string;
  payout_amount: number;
  payout_status: PaymentStatus;
  payment_method?: PaymentMethod;
  transaction_hash?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  encrypted_content: string;
  nonce?: string; // Base64 encoded nonce for E2EE decryption
  sender_public_key?: string;
  recipient_public_key?: string;
  read: boolean;
  created_at: string;
  // Joined fields
  sender_name?: string;
  sender_user_type?: UserType;
  recipient_name?: string;
  content?: string; // Decrypted content (client-side only)
}

export interface Conversation {
  user_id: string;
  name: string;
  user_type: UserType;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface SendMessageData {
  recipient_id: string;
  encrypted_content: string;
  sender_public_key?: string;
}

// ============================================================================
// MEDIA TYPES
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface BandMedia {
  id: string;
  band_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  media_type: MediaType;
  description?: string;
  is_public: boolean;
  uploaded_by: string;
  created_at: string;
}

// ============================================================================
// GIFT CARD TYPES
// ============================================================================

export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'cancelled';
export type RecipientType = 'user' | 'band' | 'venue' | 'studio';

export interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  recipient_type: RecipientType;
  recipient_id: string;
  issued_by: string;
  status: GiftCardStatus;
  expires_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  tour_date_id?: string;
  rating: number;
  review_text?: string;
  status: ReviewStatus;
  created_at: string;
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

export interface LiveStream {
  id: string;
  band_id: string;
  title: string;
  description?: string;
  scheduled_start: string;
  actual_start?: string;
  end_time?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewer_count?: number;
  mux_playback_id?: string;
  livekit_room_name?: string;
  created_at: string;
}

export interface StreamingContent {
  id: string;
  band_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'audio' | 'live_recording';
  mux_asset_id?: string;
  mux_playback_id?: string;
  duration?: number;
  thumbnail_url?: string;
  view_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// W-2 DOCUMENT TYPES
// ============================================================================

export interface W2Document {
  id: string;
  band_id: string;
  year: number;
  file_path: string;
  file_name: string;
  uploaded_at: string;
}

// ============================================================================
// ADMIN/BOOKING MANAGER TYPES
// ============================================================================

export interface BillingAdjustment {
  id: string;
  user_id: string;
  adjusted_by: string;
  original_amount: number;
  adjusted_amount: number;
  discount_percentage?: number;
  reason?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFeature {
  id: string;
  user_id: string;
  feature_type: string;
  feature_value?: FeatureValue;
  assigned_by: string;
  active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserState {
  id: string;
  user_id: string;
  state_type: string;
  state_value: string;
  metadata?: Metadata;
  assigned_by: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagedUser extends User {
  venue_name?: string;
  band_name?: string;
  subscriptions: UserSubscription[];
  billing_adjustments: BillingAdjustment[];
  features: UserFeature[];
  states: UserState[];
  assigned_at?: string;
  manager_notes?: string;
}

// ============================================================================
// DASHBOARD DATA TYPES
// ============================================================================

export interface ArtistDashboardData {
  bands: Band[];
  tours: TourDate[];
  media: BandMedia[];
  bookingAgents: User[];
}

export interface PaymentLedgerEntry extends TourMemberPayout {
  venue_payment_amount?: number;
  booking_agent_fee_percentage?: number;
  booking_agent_fee_amount?: number;
  other_fees_amount?: number;
  total_band_payout?: number;
  tour_payment_status?: PaymentStatus;
  payment_date?: string;
  tour_payment_notes?: string;
  tour_date_id?: string;
  tour_date?: string;
  start_time?: string;
  end_time?: string;
  tour_status?: TourStatus;
  payment_amount?: number;
  payment_currency?: string;
  band_id?: string;
  band_name?: string;
  venue_id?: string;
  venue_name?: string;
  city?: string;
  state?: string;
  tour_id?: string;
  tour_name?: string;
  booking_agent_name?: string;
  booking_agent_email?: string;
}

export interface BandPaymentSummary {
  tour_date_id: string;
  tour_date: string;
  start_time: string;
  tour_status: TourStatus;
  payment_amount?: number;
  payment_currency?: string;
  venue_name: string;
  city: string;
  state: string;
  tour_id?: string;
  tour_name?: string;
  tour_payment_id?: string;
  venue_payment_amount?: number;
  booking_agent_fee_percentage?: number;
  booking_agent_fee_amount?: number;
  other_fees_amount?: number;
  total_band_payout?: number;
  payment_status?: PaymentStatus;
  payment_date?: string;
  member_count: number;
  total_allocated: number;
  paid_amount: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface UpdateBandData {
  band_name?: string;
  description?: string;
  genre?: string;
  eth_wallet?: string;
  website?: string;
  social_links?: SocialLinks;
  booking_manager_id?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  recovery_email?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  recovery_email?: string;
  wallet_address?: string;
}

export interface CreateTourPaymentData {
  tour_date_id: string;
  venue_payment_amount: number;
  booking_agent_fee_percentage?: number;
  booking_agent_fee_amount?: number;
  other_fees_amount?: number;
  total_band_payout: number;
  payment_method?: PaymentMethod;
  transaction_hash?: string;
  notes?: string;
}

export interface CreateMemberPayoutData {
  user_id: string;
  band_member_name: string;
  payout_amount: number;
  payment_method?: PaymentMethod;
  notes?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SelectOption {
  label: string;
  value: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum' },
];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  user: 'Artist',
  band: 'Band',
  studio: 'Recording Studio',
  bar: 'Venue',
  booking_agent: 'Booking Agent',
  booking_manager: 'Booking Manager',
};

export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  succeeded: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
};
