export interface SearchParams {
  query: string;
  limit?: number;
  location?: string;
  priceRange?: string;
  rating?: string;
  sortBy?: string;
}

export interface HotelGroup {
  id: number;
  name: string;
  parent_id: number | null;
  logo: {
    url: string | null;
    thumbnail_url: string | null;
    description: string;
  };
}

export interface HotelImage {
  url: string;
  thumbnail_url: string;
  description: string;
}

export interface HotelInformation {
  title: string;
  description: string[];
}

export interface HotelLinks {
  self: {
    href: string;
    method: string;
  };
}

export interface Hotel {
  id: number;
  name: string;
  hotel_groups?: HotelGroup[];
  location: string;
  address?: string;
  description: string;
  fun_fact?: string | null;
  unique_experiences?: string | null;
  website?: string;
  instagram?: string;
  whatsapp?: string | null;
  latitude?: number;
  longitude?: number;
  display_order?: number;
  sustainability_initiative?: string | null;
  sustainability_rating?: number | null;
  short_info?: string | null;
  hotel_information?: HotelInformation[];
  amenities: string[];
  images: HotelImage[];
  videos: any[];
  links: HotelLinks;
  benefits?: string[]; 
  benefits_footnotes?: string[];  
  
  // Legacy fields for backward compatibility
  rating?: number;
  price?: number;
  image?: string;
  available?: boolean;
  distance?: string;
  reviewCount?: number;
  phone?: string;
  email?: string;
}

export interface SearchResponse {
  success: boolean;
  data: Hotel[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: any;
}

// Booking related types
export interface BookingDetails {
  hotelId: number;
  hotelName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfRooms: number;
  roomType?: string;
  specialRequests?: string;
  totalPrice?: number;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  bookingId?: string;
}

// Availability related types
export interface AvailabilityParams {
  hotel_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  currency: string;
  rooms: Array<{
    adults: number;
    children?: Array<{ age: number }>;
  }>;
}

export interface RateInfo {
  requested_currency_code?: string;
  rate?: number;
  rate_in_requested_currency?: number;
  total_to_book?: number;
  total_to_book_in_requested_currency?: number;
  currency_code?: string;
  is_tax_included?: boolean;
}

export interface Rate {
  rate_index: string;
  title?: string;
  description?: string;
  rate?: number;
  rate_in_requested_currency?: number;
  total_to_book?: number;
  total_to_book_in_requested_currency?: number;
  requested_currency_code?: string;
  currency_code?: string;
  additional_benefits?: string[];
  [key: string]: any; // For any other fields that might be present
}

export interface RoomType {
  id?: number;
  name?: string;
  description?: string;
  max_occupancy?: number;
  rate?: number | RateInfo;
  currency?: string;
  rate_index?: number | string; // Legacy field, kept for backward compatibility
  rates?: Rate[]; // Array of rates, each with its own rate_index
  lowest_rate?: number | RateInfo;
  [key: string]: any; // For any other fields that might be present (bed_size, bedrooms, etc.)
}

export interface AvailabilityResponse {
  hotel_id: number;
  hotel_name: string;
  is_available: boolean;
  session_id: string | null;
  default_currency: string | null;
  opened_at: string;
  is_under_refurbishment: boolean;
  refurbishment_ends_at: string | null;
  is_temporarily_closed: boolean;
  closed_from: string;
  closed_until: string;
  display_order: number | null;
  hotel_info: any | null;
  room_types: RoomType[];
  lowest_rate: number | RateInfo | null;
  links: {
    self: {
      href: string;
      method: string;
    };
    booking: {
      href: string;
      method: string;
    };
    hotel: {
      href: string;
      method: string;
    };
  };
}