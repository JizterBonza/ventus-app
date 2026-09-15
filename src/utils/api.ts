import { SearchParams, SearchResponse, ApiError, Hotel, BookingDetails, BookingResponse, AvailabilityParams, AvailabilityResponse, HotelCalendarRate, PredictiveSearchResult } from '../types/search';
import { sendBookingEmailViaEmailJS, sendBookingEmailViaFormService, sendBookingEmailViaMailto } from './emailService';
import { getAuthToken, isAuthenticated } from './authService';

const DEFAULT_API_BASE = 'https://ventus-backend.onrender.com/v2';

// API base: development uses dev proxy; production uses REACT_APP_API_BASE (backend proxy) or direct API.
const getApiBaseUrl = () => {
  // Prefer an explicitly configured backend in every environment. This keeps local
  // verification on the same authenticated API path used by production.
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '/v2'; // Fall back to the local development proxy.
  }
  // Staging: use backend proxy (e.g. https://ventus-backend.onrender.com/v2) to avoid CORS; no public proxy needed.
  return DEFAULT_API_BASE;
};

// Actual API base for logging and for deciding whether to use CORS proxy
const getActualApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
};

// Primary CORS proxy. allorigins handles preflight for staging; corsproxy.io can block or rate-limit.
// Override via REACT_APP_CORS_PROXY (e.g. your own proxy on Render) for reliability.
const DEFAULT_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * In production, the browser blocks direct API calls (CORS). We must send the
 * full URL (path + query) to a CORS proxy that returns CORS headers for your origin.
 * Override via REACT_APP_CORS_PROXY (e.g. your own proxy on Render) if needed.
 */
const getProxiedUrl = (actualUrl: string): string => {
  if (process.env.NODE_ENV === 'development') {
    return actualUrl;
  }
  const proxyBase = process.env.REACT_APP_CORS_PROXY ?? DEFAULT_CORS_PROXY;
  const base = proxyBase.endsWith('=') || proxyBase.endsWith('/') ? proxyBase : `${proxyBase}?url=`;
  return `${base}${encodeURIComponent(actualUrl)}`;
};

// Convert a proxy URL to the actual API URL for logging
const getActualApiUrl = (url: string): string => {
  const actualBase = getActualApiBaseUrl();
  
  // Check if this is a backend proxy URL - if so, extract path for logging but keep backend URL
  const authApiUrl = process.env.REACT_APP_AUTH_API_URL;
  const backendBase = authApiUrl ? authApiUrl.replace(/\/api\/auth.*$/, '') : '';
  if (backendBase && url.startsWith(backendBase)) {
    // This is a backend proxy URL - extract path for logging purposes
    const pathMatch = url.match(new RegExp(`${backendBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/v2(/.*)`));
    if (pathMatch) {
      // Return the actual API URL for logging, but the original URL will be used for fetch
      return `${actualBase}${pathMatch[1]}`;
    }
    // If no match, return as-is (shouldn't happen, but safe fallback)
    return url;
  }
  
  // If it's a relative URL (development proxy), strip /v2 and append to base
  if (url.startsWith('/')) {
    const path = url.startsWith('/v2/') ? url.slice(4) : url.slice(1);
    return `${actualBase}/${path}`;
  }
  
  // If it contains the actual API URL, extract it
  if (url.includes('api-staging.littleemperors.com')) {
    // Extract the path and query from the URL
    const match = url.match(/api-staging\.littleemperors\.com\/v2(\/.*)/);
    if (match) {
      return `${actualBase}${match[1]}`;
    }
  }
  
  // If it's a CORS proxy URL (?url= or ?encoded), try to extract the destination URL
  const proxyMatch = url.match(/(?:corsproxy\.io|allorigins\.win\/raw)\/?\?(?:url=)?(.+)/) ?? url.match(/\?url=(.+)/);
  if (proxyMatch) {
    try {
      return decodeURIComponent(proxyMatch[1]);
    } catch {
      // If decoding fails, construct from path
      const pathMatch = url.match(/\/v2(\/.*)/);
      if (pathMatch) {
        return `${actualBase}${pathMatch[1]}`;
      }
    }
  }
  
  // Fallback: try to replace the base URL
  return url.replace(API_BASE_URL, actualBase);
};

const API_BASE_URL = getApiBaseUrl();
// Supplier credentials are deliberately never bundled into the browser. The Ventus
// backend owns the Little Emperors token and forwards only authorised requests.
const API_TOKEN = '';

// Fallback CORS proxies if primary fails (e.g. CORS blocked, rate limit, or preflight issue)
const FALLBACK_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

/**
 * When using a CORS proxy, we must not trigger a preflight (OPTIONS). Custom
 * headers (Authorization, Content-Type) trigger preflight, and public proxies
 * often don't return Access-Control-Allow-Origin on that response. So for
 * GET requests to a proxy we send a "simple" request: no custom headers.
 * The proxy fetches the URL server-side (without our auth); the API may still
 * allow unauthenticated GET for search/hotels. Set REACT_APP_API_DIRECT=true
 * when the API allows your origin (CORS) so we call the API directly with auth.
 */

/**
 * Makes an API request with fallback proxies.
 * In production, the full destination URL is wrapped in a CORS proxy. We use
 * simple requests (no custom headers) when calling the proxy to avoid preflight.
 */
/**
 * When using a CORS proxy we cannot send Authorization header (triggers preflight).
 * Append token to URL so the API can authenticate; many APIs accept access_token query param.
 */
const urlWithAuthIfProxied = (actualUrl: string, useProxy: boolean): string => {
  if (!useProxy || !API_TOKEN) return actualUrl;
  const sep = actualUrl.includes('?') ? '&' : '?';
  return `${actualUrl}${sep}access_token=${encodeURIComponent(API_TOKEN)}`;
};

const makeApiRequest = async (url: string, options: RequestInit): Promise<Response> => {
  // Check if we're using backend proxy FIRST (before converting URL)
  const authApiUrl = process.env.REACT_APP_AUTH_API_URL;
  const backendBase = authApiUrl
    ? authApiUrl.replace(/\/api\/auth.*$/, '')
    : 'https://ventus-backend.onrender.com';
  const usingBackendProxy = Boolean(backendBase) &&
                            !process.env.REACT_APP_API_DIRECT && 
                            (url.startsWith('/v2') || url.startsWith(backendBase) || API_BASE_URL.startsWith(backendBase));
  
  // Get actual API URL for logging purposes only
  const actualUrl = getActualApiUrl(url);
  // Skip CORS proxy when using backend proxy (REACT_APP_API_BASE) or when API allows direct CORS (REACT_APP_API_DIRECT)
  
  // Debug logging for staging/production (comment back in to view API request debug)
  // if (process.env.NODE_ENV === 'production') {
  //   console.log('🔍 API Request Debug:', {
  //     environment: process.env.NODE_ENV,
  //     REACT_APP_AUTH_API_URL: authApiUrl || 'NOT SET',
  //     backendBase: backendBase || 'N/A',
  //     API_BASE_URL,
  //     url,
  //     actualUrl, // For logging only
  //     usingBackendProxy,
  //     REACT_APP_API_DIRECT: process.env.REACT_APP_API_DIRECT || 'NOT SET'
  //   });
  // }
  
  // Only use CORS proxy if:
  // 1. In production AND
  // 2. Not using direct mode AND
  // 3. Not using backend proxy (backend proxy handles CORS)
  const useProxy = process.env.NODE_ENV === 'production' && 
                   !process.env.REACT_APP_API_DIRECT && !process.env.REACT_APP_API_BASE && 
                   !usingBackendProxy;
  
  // If using backend proxy, use the original URL (don't convert it)
  // Otherwise, use CORS proxy logic
  const urlForRequest = urlWithAuthIfProxied(actualUrl, useProxy);
  const fetchUrl = usingBackendProxy ? url : (useProxy ? getProxiedUrl(urlForRequest) : url);

  // When calling a proxy, use a "simple" request (no custom headers) so the
  // browser does not send OPTIONS preflight; public proxies often fail preflight.
  let requestOptions: RequestInit = useProxy && (options.method === 'GET' || options.method === undefined)
    ? { method: 'GET' }
    : options;

  if (usingBackendProxy) {
    const headers = new Headers(options.headers || {});
    headers.delete('Authorization');
    const memberToken = getAuthToken();
    if (memberToken) headers.set('Authorization', `Bearer ${memberToken}`);
    requestOptions = { ...options, headers };
  }

  // Enhanced debug logging (comment back in to view fetch details)
  // if (process.env.NODE_ENV === 'production') {
  //   console.log('🚀 Fetch Details:', {
  //     usingBackendProxy,
  //     useProxy,
  //     fetchUrl,
  //     actualUrlForLogging: actualUrl,
  //     requestMethod: options.method || 'GET',
  //     hasAuthHeader: !!(options.headers as any)?.['Authorization']
  //   });
  // }

  try {
    // console.log('Attempting API request with primary URL:', actualUrl);
    // console.log('📍 Actual fetch URL:', fetchUrl);
    //
    // if (usingBackendProxy) {
    //   console.log('✅ Using backend proxy - request will go to:', fetchUrl);
    // }
    //
    const response = await fetch(fetchUrl, requestOptions);
    //
    // if (response.ok) {
    //   if (usingBackendProxy) {
    //     console.log('✅ Backend proxy request succeeded');
    //   }
    //   return response;
    // }
    if (response.ok) {
      return response;
    }
    
    // Preserve backend status codes so callers can handle validation responses
    // (for example, retrying a calendar request in a supported currency).
    if (usingBackendProxy) {
      return response;
    }
    
    if (response.status === 0 || response.status === 403 || response.status === 404) {
      throw new Error('Primary proxy failed, trying fallbacks');
    }
    
    return response;
  } catch (error) {
    // If using backend proxy, don't try CORS fallback proxies
    if (usingBackendProxy) {
      console.error('❌ Backend proxy request failed:', error);
      throw new Error(
        'Unable to connect to the backend service. Please check if the backend is running and accessible.'
      );
    }
    
    console.warn('Primary API request failed, trying fallback proxies:', error);
    
    // Only try CORS fallback proxies if not using backend proxy
    for (const proxy of FALLBACK_PROXIES) {
      try {
        const fallbackUrl = `${proxy}${encodeURIComponent(urlForRequest)}`;
        // console.log('Trying fallback proxy:', fallbackUrl);
        const fallbackOpts = useProxy && (options.method === 'GET' || options.method === undefined)
          ? { method: 'GET' }
          : { ...options, headers: { ...options.headers, 'Origin': window.location.origin } };
        const response = await fetch(fallbackUrl, fallbackOpts);
        
        if (response.ok) {
          // console.log('Fallback proxy succeeded');
          return response;
        }
      } catch (fallbackError) {
        console.warn('Fallback proxy failed:', fallbackError);
        continue;
      }
    }
    
    throw new Error(
      'Search is temporarily unavailable. Please try again in a few minutes.'
    );
  }
};

/**
 * Builds query parameters for the search API
 */
const buildSearchParams = (params: SearchParams): URLSearchParams => {
  const searchParams = new URLSearchParams();
  
  // Required parameters - query is the location
  if (params.query) {
    searchParams.append('query', params.query);
  }
  
  // Optional parameters
  if (params.limit) {
    searchParams.append('limit', params.limit.toString());
  }
  
  // Location is the same as query, so we don't need to add it separately
  // if (params.location) {
  //   searchParams.append('location', params.location);
  // }
  
  if (params.priceRange) {
    searchParams.append('priceRange', params.priceRange);
  }
  
  if (params.rating) {
    searchParams.append('rating', params.rating);
  }
  
  if (params.sortBy) {
    searchParams.append('sortBy', params.sortBy);
  }
  
  return searchParams;
};

/** Extract a single numeric price from API value (number or RateInfo-like object). */
const numericPrice = (value: any): number | undefined => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const n = value.rate_in_requested_currency ?? value.rate ?? value.total_to_book_in_requested_currency ?? value.total_to_book;
    return typeof n === 'number' ? n : undefined;
  }
  return undefined;
};

const mapApiItemToHotel = (item: any, index = 0): Hotel => {
  const images = Array.isArray(item.images)
    ? item.images
        .map((image: any) => typeof image === 'string'
          ? { url: image, thumbnail_url: image, description: item.text || item.name || 'Hotel image' }
          : image)
        .filter((image: any) => image?.url)
    : item.image
      ? [{ url: item.image, thumbnail_url: item.image, description: item.text || item.name || 'Hotel image' }]
      : [];

  return {
    id: item.id || item.hotel_id || index + 1,
    name: item.text || item.name || item.hotel_name || 'Unknown Hotel',
    hotel_groups: item.hotel_groups || [],
    location: item.location || '',
    rating: item.rating ?? undefined,
    price: numericPrice(item.price) ?? numericPrice(item.min_price) ?? numericPrice(item.lowest_rate) ?? undefined,
    image: images[0]?.url,
    amenities: item.amenities || [],
    description: item.description || '',
    available: item.available ?? item.is_available ?? true,
    distance: item.distance,
    reviewCount: item.reviewCount,
    address: item.address,
    phone: item.phone,
    email: item.email,
    website: item.website,
    latitude: item.latitude,
    longitude: item.longitude,
    display_order: item.display_order,
    sustainability_initiative: item.sustainability_initiative,
    sustainability_rating: item.sustainability_rating,
    short_info: item.short_info,
    hotel_information: item.hotel_information || [],
    benefits: item.benefits || [],
    benefits_footnotes: item.benefits_footnotes || [],
    images,
    videos: item.videos || [],
    links: item.links || {
      self: {
        href: `${API_BASE_URL}/hotels/${item.id || item.hotel_id || index + 1}`,
        method: 'GET'
      }
    }
  };
};

/** Transforms predictive-search hotel matches into result-card records. */
const transformApiDataToHotels = (apiData: any[]): Hotel[] => apiData
  .filter(item => item.type === 'hotel')
  .map(mapApiItemToHotel);

/**
 * Makes a search request to the API with authorization
 */
const HOTEL_SEARCH_MEMORY_TTL_MS = 5 * 60 * 1000;
const HOTEL_SEARCH_STORAGE_TTL_MS = 30 * 60 * 1000;
const HOTEL_SEARCH_STORAGE_PREFIX = 'ventus:hotel-search:v2:';
const HOTEL_SEARCH_MEMORY_MAX_ENTRIES = 50;
const hotelSearchMemoryCache = new Map<string, { response: SearchResponse; expiresAt: number }>();
const hotelSearchInflight = new Map<string, Promise<SearchResponse>>();

export const searchHotels = async (params: SearchParams): Promise<SearchResponse> => {
  const normalizedParams = {
    ...params,
    query: params.query.trim().toLowerCase(),
  };
  const searchParams = buildSearchParams(normalizedParams);
  const url = `${API_BASE_URL}/search?${searchParams.toString()}`;
  const cacheKey = searchParams.toString();
  const cachedSearch = hotelSearchMemoryCache.get(cacheKey);
  if (cachedSearch && cachedSearch.expiresAt > Date.now()) {
    hotelSearchMemoryCache.delete(cacheKey);
    hotelSearchMemoryCache.set(cacheKey, cachedSearch);
    return cachedSearch.response;
  }
  if (cachedSearch) hotelSearchMemoryCache.delete(cacheKey);

  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${HOTEL_SEARCH_STORAGE_PREFIX}${encodeURIComponent(cacheKey)}`;
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as {
        response?: SearchResponse;
        expiresAt?: number;
      } | null;
      if (stored?.response && stored.expiresAt && stored.expiresAt > Date.now()) {
        hotelSearchMemoryCache.set(cacheKey, {
          response: stored.response,
          expiresAt: Math.min(stored.expiresAt, Date.now() + HOTEL_SEARCH_MEMORY_TTL_MS),
        });
        return stored.response;
      }
      if (stored) window.localStorage.removeItem(storageKey);
    } catch {
      // Continue with the network request when browser storage is unavailable.
    }
  }

  const inflightSearch = hotelSearchInflight.get(cacheKey);
  if (inflightSearch) return inflightSearch;
  
  // Log the actual API URL (without proxy) for clarity
  const actualUrl = getActualApiUrl(url);
  // console.log('Making API request to:', actualUrl);
  // console.log('Environment:', process.env.NODE_ENV);
  // console.log('API Base URL:', API_BASE_URL);
  //
  const request = (async () => {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('API Response Status:', response.status);
    // console.log('API Response Status Text:', response.statusText);
    // console.log('API Response URL:', response.url);
    // console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('API Error Response Body:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    //
    const data = await response.json();
    // console.log('API Response Data:', data);
    
    // Handle API auth error (proxy can't send Bearer; API only accepts Bearer header)
    if (data && (data.error === 'authentication' || data.message === 'Unauthenticated.')) {
      throw new Error(
        'Search requires a valid API token. The staging API only accepts Bearer token in the Authorization header. ' +
        'When using a CORS proxy we send the token in the URL, which this API does not accept. ' +
        'Fix: Set REACT_APP_API_DIRECT=true in your production/staging environment and ensure the API allows CORS from your origin (e.g. your Render URL). ' +
        'Alternatively run a backend proxy that forwards requests with the Bearer header.'
      );
    }
    
    // Handle API error responses
    if (!data.success && data.success !== undefined) {
      throw new Error(data.message || 'Search failed');
    }
    
    // Transform the API data to Hotel objects
    let hotels: Hotel[] = [];
    
    if (Array.isArray(data)) {
      // Direct array format - transform to hotels
      hotels = transformApiDataToHotels(data);
    } else if (data.data && Array.isArray(data.data)) {
      // Standard format with data array
      hotels = transformApiDataToHotels(data.data);
    } else if (data.hotels && Array.isArray(data.hotels)) {
      // Hotels array format
      hotels = transformApiDataToHotels(data.hotels);
    } else {
      // console.warn('Unexpected API response format:', data);
      hotels = [];
    }
    
    const searchResponse = {
      success: true,
      data: hotels,
      total: hotels.length,
      page: 1,
      limit: normalizedParams.limit || 20
    } as SearchResponse;

    while (hotelSearchMemoryCache.size >= HOTEL_SEARCH_MEMORY_MAX_ENTRIES) {
      const oldestKey = hotelSearchMemoryCache.keys().next().value;
      if (oldestKey === undefined) break;
      hotelSearchMemoryCache.delete(oldestKey);
    }
    hotelSearchMemoryCache.set(cacheKey, {
      response: searchResponse,
      expiresAt: Date.now() + HOTEL_SEARCH_MEMORY_TTL_MS,
    });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          `${HOTEL_SEARCH_STORAGE_PREFIX}${encodeURIComponent(cacheKey)}`,
          JSON.stringify({
            response: searchResponse,
            expiresAt: Date.now() + HOTEL_SEARCH_STORAGE_TTL_MS,
          })
        );
      } catch {
        // The in-memory cache remains available if local storage is full/disabled.
      }
    }
    return searchResponse;
  })()
    .catch((error) => {
    console.error('searchHotels error:', error);
    throw error;
    })
    .finally(() => hotelSearchInflight.delete(cacheKey));

  hotelSearchInflight.set(cacheKey, request);
  return request;
};

/**
 * Search hotels with a simple query (for basic search functionality)
 */
export const searchHotelsByQuery = async (query: string, limit: number = 20): Promise<Hotel[]> => {
  try {
    // console.log('searchHotelsByQuery called with:', { query, limit });
    const response = await searchHotels({ query, limit });
    // console.log('searchHotelsByQuery response:', response);
    return response.data || [];
  } catch (error) {
    console.error('searchHotelsByQuery error:', error);
    throw error;
  }
};

/**
 * Search hotels with advanced filters
 */
export const searchHotelsAdvanced = async (params: SearchParams): Promise<Hotel[]> => {
  const response = await searchHotels(params);
  // console.log('searchHotelsAdvanced response:', response);
  return response.data || [];
};

/**
 * Get hotel details by ID using the hotel details API
 */
const HOTEL_DETAILS_MEMORY_TTL_MS = 10 * 60 * 1000;
const HOTEL_DETAILS_MEMORY_MAX_ENTRIES = 100;
const hotelDetailsMemoryCache = new Map<number, { hotel: Hotel; expiresAt: number }>();
const hotelDetailsInflight = new Map<number, Promise<Hotel>>();

const fetchHotelDetails = async (hotelId: number): Promise<Hotel> => {
  const url = `${API_BASE_URL}/hotels/${hotelId}`;
  
  // console.log('Fetching hotel details for ID:', hotelId);
  // Log the actual API URL (without proxy) for clarity
  const actualUrl = getActualApiUrl(url);
  // console.log('Hotel details URL:', actualUrl);
  //
  try {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('Hotel details response status:', response.status);
    // console.log('Hotel details response URL:', response.url);
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Hotel details error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    //
    const data = await response.json();
    // console.log('Hotel details response data:', data);
    
    // Handle API auth error (e.g. missing/invalid token, or proxy stripped headers)
    if (data && (data.error === 'authentication' || data.message === 'Unauthenticated.')) {
      throw new Error('Hotel details are temporarily unavailable from the Ventus service.');
    }
    
    // Handle API error responses
    if (!data.success && data.success !== undefined) {
      throw new Error(data.message || 'Failed to fetch hotel details');
    }
    
    // The API response is the hotel data directly
    const hotelData = data;
    
    // Transform API data to Hotel object with the new structure
    return {
      id: hotelData.id || hotelId,
      name: hotelData.name || 'Unknown Hotel',
      hotel_groups: hotelData.hotel_groups || [],
      location: hotelData.location || 'Unknown Location',
      address: hotelData.address,
      description: hotelData.description || 'No description available',
      fun_fact: hotelData.fun_fact,
      unique_experiences: hotelData.unique_experiences,
      website: hotelData.website,
      instagram: hotelData.instagram,
      whatsapp: hotelData.whatsapp,
      latitude: hotelData.latitude,
      longitude: hotelData.longitude,
      display_order: hotelData.display_order,
      sustainability_initiative: hotelData.sustainability_initiative,
      sustainability_rating: hotelData.sustainability_rating,
      short_info: hotelData.short_info,
      hotel_information: hotelData.hotel_information || [],
      amenities: hotelData.amenities || [],
      benefits: hotelData.benefits || [], 
      benefits_footnotes: hotelData.benefits_footnotes || [],
      images: hotelData.images || [],
      videos: hotelData.videos || [],
      links: hotelData.links,
      
      // Legacy fields for backward compatibility (no fake fallbacks for price/rating)
      rating: hotelData.rating ?? undefined,
      price: numericPrice(hotelData.price) ?? numericPrice(hotelData.min_price) ?? numericPrice(hotelData.lowest_rate) ?? undefined,
      image: hotelData.images && hotelData.images.length > 0 ? hotelData.images[0].url : undefined,
      available: true,
      distance: hotelData.distance || undefined,
      reviewCount: hotelData.reviewCount || undefined,
      phone: hotelData.phone || undefined,
      email: hotelData.email || undefined
    };
  } catch (error) {
    console.error('getHotelDetails error:', error);
    throw error;
  }
};

export const getHotelDetails = async (hotelId: number): Promise<Hotel> => {
  const cached = hotelDetailsMemoryCache.get(hotelId);
  if (cached && cached.expiresAt > Date.now()) {
    hotelDetailsMemoryCache.delete(hotelId);
    hotelDetailsMemoryCache.set(hotelId, cached);
    return cached.hotel;
  }
  if (cached) hotelDetailsMemoryCache.delete(hotelId);

  const inflight = hotelDetailsInflight.get(hotelId);
  if (inflight) return inflight;

  const request = fetchHotelDetails(hotelId)
    .then((hotel) => {
      if (hotelDetailsMemoryCache.has(hotelId)) hotelDetailsMemoryCache.delete(hotelId);
      while (hotelDetailsMemoryCache.size >= HOTEL_DETAILS_MEMORY_MAX_ENTRIES) {
        const oldestHotelId = hotelDetailsMemoryCache.keys().next().value;
        if (oldestHotelId === undefined) break;
        hotelDetailsMemoryCache.delete(oldestHotelId);
      }
      hotelDetailsMemoryCache.set(hotelId, {
        hotel,
        expiresAt: Date.now() + HOTEL_DETAILS_MEMORY_TTL_MS,
      });
      return hotel;
    })
    .finally(() => hotelDetailsInflight.delete(hotelId));

  hotelDetailsInflight.set(hotelId, request);
  return request;
};

/**
 * Test API connectivity
 */
export const testApiConnectivity = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const testUrl = `${API_BASE_URL}/search?query=test&limit=1`;
    // Log the actual API URL (without proxy) for clarity
    const actualTestUrl = getActualApiUrl(testUrl);
    // console.log('Testing API connectivity with URL:', actualTestUrl);
    //
    const response = await makeApiRequest(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('Test response status:', response.status);
    // console.log('Test response URL:', response.url);
    //
    if (!response.ok) {
      return {
        success: false,
        message: `API responded with status: ${response.status} - ${response.statusText}. URL: ${response.url}`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      message: 'API is accessible',
      data
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Test the exact URL format from the sample
 */
export const testSampleUrl = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // Test with the correct URL format (using proxy in development)
    const sampleUrl = `${API_BASE_URL}/search?query=Philippines&limit=20`;
    // Log the actual API URL (without proxy) for clarity
    const actualSampleUrl = getActualApiUrl(sampleUrl);
    // console.log('Testing with sample URL:', actualSampleUrl);
    // console.log('Environment:', process.env.NODE_ENV);
    // console.log('API Base URL:', API_BASE_URL);
    //
    const response = await makeApiRequest(sampleUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('Sample URL response status:', response.status);
    // console.log('Sample URL response URL:', response.url);
    // console.log('Sample URL response headers:', Object.fromEntries(response.headers.entries()));
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Error response body:', errorText);
      return {
        success: false,
        message: `Sample URL test failed with status: ${response.status} - ${response.statusText}. Response: ${errorText}`
      };
    }
    //
    const data = await response.json();
    // console.log('Sample URL test response data:', data);
    return {
      success: true,
      message: 'Sample URL test successful',
      data
    };
  } catch (error) {
    console.error('Sample URL test error:', error);
    return {
      success: false,
      message: `Sample URL test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Test basic API endpoint accessibility
 */
export const testApiEndpoint = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const testUrl = `${API_BASE_URL}/search`;
    // console.log('Testing API endpoint:', testUrl);
    //
    const response = await makeApiRequest(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('Endpoint test response status:', response.status);
    // console.log('Endpoint test response URL:', response.url);
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Endpoint test error response:', errorText);
      return {
        success: false,
        message: `Endpoint test failed with status: ${response.status} - ${response.statusText}. Response: ${errorText}`
      };
    }
    //
    const data = await response.json();
    // console.log('Endpoint test response data:', data);
    return {
      success: true,
      message: 'API endpoint is accessible',
      data
    };
  } catch (error) {
    console.error('Endpoint test error:', error);
    return {
      success: false,
      message: `Endpoint test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Fetch hotel details for multiple hotels in parallel
 */
export const getHotelDetailsBatch = async (hotelIds: number[]): Promise<Hotel[]> => {
  try {
    const authApiUrl = process.env.REACT_APP_AUTH_API_URL || 'https://ventus-backend.onrender.com/api/auth';
    const backendBase = authApiUrl.replace(/\/api\/auth.*$/, '');
    const response = await fetch(`${backendBase}/api/hotels/details-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelIds }),
    });
    if (!response.ok) throw new Error(`Hotel detail batch failed (${response.status})`);
    const data = await response.json();
    const content = Array.isArray(data?.content) ? data.content : [];
    return content.map((hotelData: any) => ({
      ...hotelData,
      id: Number(hotelData.id),
      name: hotelData.name || 'Unknown Hotel',
      location: hotelData.location || 'Unknown Location',
      description: hotelData.description || '',
      hotel_information: hotelData.hotel_information || [],
      amenities: hotelData.amenities || [],
      benefits: hotelData.benefits || [],
      benefits_footnotes: hotelData.benefits_footnotes || [],
      images: hotelData.images || [],
      price: numericPrice(hotelData.price) ?? numericPrice(hotelData.min_price) ?? numericPrice(hotelData.lowest_rate) ?? undefined,
      image: hotelData.images?.[0]?.url,
      available: true,
    } as Hotel));
  } catch (error) {
    console.warn('Batch enrichment unavailable; using cached individual hotel details.', error);
    const hotels = await Promise.allSettled(hotelIds.map((id) => getHotelDetails(id)));
    return hotels
      .filter((result): result is PromiseFulfilledResult<Hotel> => result.status === 'fulfilled')
      .map((result) => result.value);
  }
};

/** Return the supplier's raw hotel/location/inspiration matches. */
export const searchPredictions = async (
  query: string,
  limit = 20,
  types: PredictiveSearchResult['type'][] = ['hotel', 'location', 'inspiration'],
): Promise<PredictiveSearchResult[]> => {
  const params = new URLSearchParams({
    query: query.trim(),
    limit: String(Math.max(1, Math.min(limit, 100))),
  });
  types.forEach((type) => params.append('types[]', type));
  const response = await makeApiRequest(`${API_BASE_URL}/search?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Hotel search failed (${response.status})`);
  const data = await response.json();
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return items.filter((item: any): item is PredictiveSearchResult =>
    Number.isInteger(Number(item?.id)) &&
    typeof item?.text === 'string' &&
    ['hotel', 'location', 'inspiration'].includes(item?.type)
  ).map((item: any) => ({
    id: Number(item.id),
    text: item.text,
    type: item.type,
    location: item.location,
  }));
};

/** Fetch complete destination/inspiration collections from the supplier's paginated hotel endpoint. */
const COLLECTION_RESULTS_CACHE_TTL_MS = 30 * 60 * 1000;
const COLLECTION_RESULTS_STORAGE_PREFIX = 'ventus:hotel-collection:v2:';
const collectionResultsMemoryCache = new Map<string, { hotels: Hotel[]; expiresAt: number }>();
const collectionResultsInflight = new Map<string, Promise<Hotel[]>>();

const getCollectionResultsCacheKey = (target: 'location' | 'inspiration', id: number, perPage: number) =>
  `${target}:${id}:${perPage}`;

const readCachedCollectionResults = (cacheKey: string): Hotel[] | null => {
  const memoryEntry = collectionResultsMemoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry.hotels;
  if (memoryEntry) collectionResultsMemoryCache.delete(cacheKey);

  if (typeof window === 'undefined') return null;
  try {
    const rawEntry = window.localStorage.getItem(`${COLLECTION_RESULTS_STORAGE_PREFIX}${cacheKey}`);
    if (!rawEntry) return null;
    const storedEntry = JSON.parse(rawEntry) as { hotels?: Hotel[]; expiresAt?: number };
    if (!Array.isArray(storedEntry.hotels) || !storedEntry.expiresAt || storedEntry.expiresAt <= Date.now()) {
      window.localStorage.removeItem(`${COLLECTION_RESULTS_STORAGE_PREFIX}${cacheKey}`);
      return null;
    }
    collectionResultsMemoryCache.set(cacheKey, {
      hotels: storedEntry.hotels,
      expiresAt: storedEntry.expiresAt,
    });
    return storedEntry.hotels;
  } catch {
    return null;
  }
};

const cacheCollectionResults = (cacheKey: string, hotels: Hotel[]) => {
  const entry = { hotels, expiresAt: Date.now() + COLLECTION_RESULTS_CACHE_TTL_MS };
  collectionResultsMemoryCache.set(cacheKey, entry);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${COLLECTION_RESULTS_STORAGE_PREFIX}${cacheKey}`, JSON.stringify(entry));
  } catch {
    // Storage may be disabled or full; the in-memory cache still works.
  }
};

const searchHotelCollection = async (
  target: 'location' | 'inspiration',
  id: number,
  perPage = 10,
): Promise<Hotel[]> => {
  const cacheKey = getCollectionResultsCacheKey(target, id, perPage);
  const cachedResults = readCachedCollectionResults(cacheKey);
  if (cachedResults) return cachedResults;

  const inflightRequest = collectionResultsInflight.get(cacheKey);
  if (inflightRequest) return inflightRequest;

  const targetParam = target === 'location' ? 'location_id' : 'inspiration_id';
  const request = (async () => {
    try {
      const fetchPage = async (page: number) => {
        const url = `${API_BASE_URL}/hotels?${targetParam}=${id}&per_page=${perPage}&page=${page}`;
        const response = await makeApiRequest(url, { method: 'GET' });
        if (!response.ok) throw new Error(`Hotel results page ${page} failed (${response.status})`);
        return response.json();
      };

      const firstPage = await fetchPage(1);
      const totalPages = Math.max(1, Number(firstPage?.page?.total_pages) || 1);
      const pages: any[] = [firstPage];
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
      for (let index = 0; index < remainingPages.length; index += 6) {
        const pageNumbers = remainingPages.slice(index, index + 6);
        const pageResults = await Promise.all(pageNumbers.map(fetchPage));
        pages.push(...pageResults);
      }
      const hotels = pages
        .flatMap((data) => data.data || data.content || [])
        .map(mapApiItemToHotel);
      cacheCollectionResults(cacheKey, hotels);
      return hotels;
    } catch (error) {
      console.error(`searchHotelsBy${target === 'location' ? 'Location' : 'Inspiration'} error:`, error);
      throw error;
    }
  })().finally(() => collectionResultsInflight.delete(cacheKey));

  collectionResultsInflight.set(cacheKey, request);
  return request;
};

export const searchHotelsByLocation = (locationId: number, perPage = 10): Promise<Hotel[]> =>
  searchHotelCollection('location', locationId, perPage);

export const searchHotelsByInspiration = (inspirationId: number, perPage = 10): Promise<Hotel[]> =>
  searchHotelCollection('inspiration', inspirationId, perPage);

export const prefetchInspirationHotels = async (inspirationId: number, perPage: number = 10): Promise<void> => {
  try {
    await searchHotelsByInspiration(inspirationId, perPage);
  } catch {
    // Prefetch is opportunistic; the results page will retry and display errors normally.
  }
};

/**
 * Enhanced search function with better error handling and response mapping
 */
export const searchHotelsEnhanced = async (params: SearchParams): Promise<SearchResponse> => {
  const searchParams = buildSearchParams(params);
  const url = `${API_BASE_URL}/search?${searchParams.toString()}`;
  
  // Log the actual API URL (without proxy) for clarity
  const actualUrl = getActualApiUrl(url);
  // console.log('Making enhanced API request to:', actualUrl);
  //
  try {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    //
    // console.log('API Response Status:', response.status);
    // console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    //
    const data = await response.json();
    // console.log('API Response Data:', data);
    
    // Handle API error responses
    if (!data.success && data.success !== undefined) {
      throw new Error(data.message || 'Search failed');
    }
    
    // Transform the API data to Hotel objects
    let hotels: Hotel[] = [];
    
    if (Array.isArray(data)) {
      // Direct array format - transform to hotels
      hotels = transformApiDataToHotels(data);
    } else if (data.data && Array.isArray(data.data)) {
      // Standard format with data array
      hotels = transformApiDataToHotels(data.data);
    } else if (data.hotels && Array.isArray(data.hotels)) {
      // Hotels array format
      hotels = transformApiDataToHotels(data.hotels);
    } else {
      // console.warn('API response does not contain expected data array:', data);
      hotels = [];
    }
    
    return {
      success: true,
      data: hotels,
      total: hotels.length,
      page: 1,
      limit: params.limit || 20,
      message: hotels.length === 0 ? 'No results found' : undefined
    } as SearchResponse;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Send booking details via email using multiple fallback methods
 */
export const sendBookingEmail = async (bookingDetails: BookingDetails): Promise<BookingResponse> => {
  try {
    // console.log('Sending booking email with details:', bookingDetails);
    //
    // Try EmailJS first (if configured)
    try {
      const emailjsResult = await sendBookingEmailViaEmailJS(bookingDetails);
      if (emailjsResult.success) {
        return emailjsResult;
      }
    } catch (error) {
      console.warn('EmailJS failed, trying form service:', error);
    }
    
    // Try form service as fallback
    try {
      const formServiceResult = await sendBookingEmailViaFormService(bookingDetails);
      if (formServiceResult.success) {
        return formServiceResult;
      }
    } catch (error) {
      console.warn('Form service failed, using mailto fallback:', error);
    }
    
    // Use mailto as final fallback
    const mailtoResult = sendBookingEmailViaMailto(bookingDetails);
    return mailtoResult;
    
  } catch (error) {
    console.error('Error sending booking email:', error);
    return {
      success: false,
      message: 'Failed to send booking request. Please try again or contact us directly.',
    };
  }
};

/**
 * Alternative booking method using a simple form submission service
 * This uses a free service like Formspree or Netlify Forms
 */
export const submitBookingForm = async (bookingDetails: BookingDetails): Promise<BookingResponse> => {
  try {
    // console.log('Submitting booking form with details:', bookingDetails);
    //
    // Generate a unique booking ID
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('hotel_name', bookingDetails.hotelName);
    formData.append('guest_name', bookingDetails.guestName);
    formData.append('guest_email', bookingDetails.guestEmail);
    formData.append('guest_phone', bookingDetails.guestPhone);
    formData.append('check_in_date', bookingDetails.checkInDate);
    formData.append('check_out_date', bookingDetails.checkOutDate);
    formData.append('number_of_guests', bookingDetails.numberOfGuests.toString());
    formData.append('number_of_rooms', bookingDetails.numberOfRooms.toString());
    formData.append('room_type', bookingDetails.roomType || '');
    formData.append('special_requests', bookingDetails.specialRequests || '');
    formData.append('total_price', bookingDetails.totalPrice?.toString() || '');
    formData.append('submitted_at', new Date().toISOString());
    
    // For demonstration, we'll simulate the form submission
    // In a real implementation, you would submit to a service like Formspree
    // console.log('Form data prepared:', Object.fromEntries(formData.entries()));
    //
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    //
    // console.log('Booking form submitted successfully');
    
    return {
      success: true,
      message: 'Booking request submitted successfully! We will contact you soon to confirm your reservation.',
      bookingId: bookingId
    };
    
  } catch (error) {
    console.error('Error submitting booking form:', error);
    return {
      success: false,
      message: 'Failed to submit booking request. Please try again or contact us directly.',
    };
  }
};

/**
 * Check hotel availability
 */
const HOTEL_AVAILABILITY_MEMORY_TTL_MS = 2 * 60 * 1000;
const hotelAvailabilityMemoryCache = new Map<string, { results: AvailabilityResponse[]; expiresAt: number }>();
const hotelAvailabilityInflight = new Map<string, Promise<AvailabilityResponse[]>>();

export const checkHotelAvailability = async (params: AvailabilityParams): Promise<AvailabilityResponse[]> => {
  const cacheKey = JSON.stringify({
    ...params,
    currency: params.currency.trim().toUpperCase(),
  });
  const cached = hotelAvailabilityMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  if (cached) hotelAvailabilityMemoryCache.delete(cacheKey);

  const inflight = hotelAvailabilityInflight.get(cacheKey);
  if (inflight) return inflight;

  const url = `${API_BASE_URL}/hotels/availability`;
  //
  // console.log('Checking hotel availability with params:', params);
  //
  const request = (async () => {
    // Log the actual API URL (without proxy) for clarity
    const actualApiUrl = `${getActualApiBaseUrl()}/hotels/availability`;
    // console.log('Availability API URL:', actualApiUrl);
    //
    const response = await makeApiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(params),
    });
    //
    // console.log('Availability response status:', response.status);
    //
    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Availability error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    //
    const data = await response.json();
    // console.log('Availability response data:', data);
    //
    // The API returns an array of availability responses
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      // If it's a single object, wrap it in an array
      return [data];
    }
  })()
    .then((results) => {
      hotelAvailabilityMemoryCache.set(cacheKey, {
        results,
        expiresAt: Date.now() + HOTEL_AVAILABILITY_MEMORY_TTL_MS,
      });
      return results;
    })
    .catch((error) => {
    console.error('checkHotelAvailability error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    const isNetworkError = err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message.includes('temporarily unavailable') ||
      err.message.includes('NetworkError');
    if (isNetworkError) {
      console.warn(
        'Staging fix: set REACT_APP_API_BASE to your backend URL (e.g. https://ventus-backend.onrender.com/v2) and deploy the backend /v2 proxy, or set REACT_APP_API_DIRECT=true if the API allows CORS.'
      );
      throw new Error(
        'Unable to connect to the backend service. Please check if the backend is running and accessible.'
      );
    }
    throw error;
    })
    .finally(() => hotelAvailabilityInflight.delete(cacheKey));

  hotelAvailabilityInflight.set(cacheKey, request);
  return request;
};

const HOTEL_CALENDAR_MEMORY_TTL_MS = 10 * 60 * 1000;
const hotelCalendarMemoryCache = new Map<string, { rates: HotelCalendarRate[]; expiresAt: number }>();
const hotelCalendarInflight = new Map<string, Promise<HotelCalendarRate[]>>();

/** Fetches the same nightly-rate calendar used by the Little Emperors property search. */
export const getHotelCalendarRates = async (
  hotelId: number,
  currency = 'GBP'
): Promise<HotelCalendarRate[]> => {
  const normalizedCurrency = currency.trim().toUpperCase() || 'GBP';
  const cacheKey = `${hotelId}:${normalizedCurrency}`;
  const cached = hotelCalendarMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rates;
  if (cached) hotelCalendarMemoryCache.delete(cacheKey);

  const inflight = hotelCalendarInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = (async () => {
    const fetchCalendar = (currencyCode: string) => {
      const searchParams = new URLSearchParams({ currency: currencyCode });
      return makeApiRequest(
        `${API_BASE_URL}/hotels/${hotelId}/calendar?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
        }
      );
    };

    let response = await fetchCalendar(normalizedCurrency);
    // The supplier's availability endpoint supports more currencies than its
    // calendar endpoint. Fall back to its GBP calendar instead of leaving the
    // date picker blank for visitors whose local currency is rejected.
    if (!response.ok && normalizedCurrency !== 'GBP' && (response.status === 400 || response.status === 422)) {
      response = await fetchCalendar('GBP');
    }

    if (!response.ok) {
      throw new Error(`Unable to load the hotel rate calendar (${response.status})`);
    }

    const data = await response.json();
    const rates = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
    const normalizedRates: HotelCalendarRate[] = rates
      .filter((item: any) => item && typeof item.date === 'string')
      .map((item: any) => ({
        date: item.date,
        rate: item.rate ?? null,
        currency: item.currency || normalizedCurrency,
        is_closed: Boolean(item.is_closed),
      }));

    hotelCalendarMemoryCache.set(cacheKey, {
      rates: normalizedRates,
      expiresAt: Date.now() + HOTEL_CALENDAR_MEMORY_TTL_MS,
    });
    return normalizedRates;
  })();

  hotelCalendarInflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    hotelCalendarInflight.delete(cacheKey);
  }
};

/**
 * Submit a booking to the API
 * POST /v2/hotels/bookings
 */
export interface BookingRequest {
  hotelId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  sessionId: string;
  rateIndex: string;
  guestName: string;
  guestEmail: string;
  eta?: string;
  rooms: Array<{
    adults: number;
    children?: Array<{ age: number }>;
  }>;
}

export const submitBooking = async (bookingData: BookingRequest): Promise<BookingResponse> => {
  const url = `${API_BASE_URL}/hotels/bookings`;
  if (!isAuthenticated()) {
    throw new Error('You must be logged in to make a booking. Please log in and try again.');
  }
  if (!bookingData.sessionId.trim() || !bookingData.rateIndex.trim()) {
    throw new Error('Your room selection has expired. Please check availability and select the rate again.');
  }

  // The supplier's secure iframe has already attached the card to this session.
  // No card number, CVC or payment token is handled by Ventus here.
  const requestBody: Record<string, unknown> = {
    start_date: bookingData.startDate,
    end_date: bookingData.endDate,
    session_id: bookingData.sessionId.trim(),
    rate_index: bookingData.rateIndex.trim(),
    hotel_id: bookingData.hotelId,
    guest_name: bookingData.guestName.trim(),
    guest_email: bookingData.guestEmail.trim(),
    ...(bookingData.eta ? { eta: bookingData.eta } : {}),
    rooms: bookingData.rooms.map((room, index) => ({
      adults: room.adults,
      children: room.children || [],
      ...(index === 0 ? {
        guest_name: bookingData.guestName.trim(),
        guest_email: bookingData.guestEmail.trim(),
        send_email_to_guest: true,
      } : {}),
    })),
  };

  const response = await makeApiRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(requestBody),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data?.errors?.session_id || data?.errors?.rate_index) {
      throw new Error('This live rate has expired. Please check availability and select the room again.');
    }
    const firstError = data?.errors
      ? Object.values(data.errors).flat().find((value) => typeof value === 'string')
      : null;
    throw new Error(
      (typeof firstError === 'string' && firstError) ||
      data?.message ||
      'The hotel could not confirm this booking. Please try again.'
    );
  }

  return {
    success: true,
    message: data.confirmation_number
      ? `Booking confirmed. Confirmation number: ${data.confirmation_number}`
      : 'Booking confirmed successfully.',
    bookingId: data.id != null ? String(data.id) : undefined,
    confirmationNumber: data.confirmation_number || undefined,
    state: data.state || undefined,
  };
};

export interface BookingRequestSubmission {
  hotelId: number;
  hotelName: string;
  sessionId: string;
  rateIndex: string;
  startDate: string;
  endDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomType?: string;
  specialRequests?: string;
  rooms: Array<{
    adults: number;
    children?: Array<{ age: number }>;
  }>;
  quotedAmount?: number | null;
  quotedCurrency?: string;
}

/**
 * Records a member booking request without taking payment. Ventus confirms the
 * live rate and benefits before a booking or charge is made.
 */
export const submitBookingRequest = async (
  bookingData: BookingRequestSubmission
): Promise<BookingResponse> => {
  const token = getAuthToken();
  if (!token) throw new Error('Please log in to request this booking.');

  const backendBase = getActualApiBaseUrl().replace(/\/v2\/?$/, '');
  const response = await fetch(`${backendBase}/api/booking-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bookingData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Unable to send this booking request.');
  }
  return {
    success: true,
    message: data.message || 'Your booking request has been received.',
    bookingId: data.bookingId,
  };
};
