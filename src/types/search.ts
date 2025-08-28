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
