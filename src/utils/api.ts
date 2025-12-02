import { SearchParams, SearchResponse, ApiError, Hotel, BookingDetails, BookingResponse, AvailabilityParams, AvailabilityResponse } from '../types/search';
import { sendBookingEmailViaEmailJS, sendBookingEmailViaFormService, sendBookingEmailViaMailto } from './emailService';

// API Configuration with CORS proxy for production
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return '/v2'; // Use proxy in development
  } else {
    // Use CORS proxy in production to avoid CORS issues
    const corsProxy = 'https://corsproxy.io/?';
    const apiUrl = 'https://api-staging.littleemperors.com/v2';
    return `${corsProxy}${encodeURIComponent(apiUrl)}`;
  }
};

// Get the actual API URL (without proxy) for logging purposes
const getActualApiBaseUrl = () => {
  return 'https://api-staging.littleemperors.com/v2';
};

// Convert a proxy URL to the actual API URL for logging
const getActualApiUrl = (url: string): string => {
  const actualBase = getActualApiBaseUrl();
  
  // If it's a relative URL (development proxy), extract the path and construct full URL
  if (url.startsWith('/')) {
    return `${actualBase}${url}`;
  }
  
  // If it contains the actual API URL, extract it
  if (url.includes('api-staging.littleemperors.com')) {
    // Extract the path and query from the URL
    const match = url.match(/api-staging\.littleemperors\.com\/v2(\/.*)/);
    if (match) {
      return `${actualBase}${match[1]}`;
    }
  }
  
  // If it's a proxy URL, try to extract the encoded URL
  const proxyMatch = url.match(/https:\/\/corsproxy\.io\/\?url=(.+)/);
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
const API_TOKEN = 'lev2_U4Jp8lyg5iXR2mTQVJEn_sbfi9YLSzE3NTIxNDQxODY';

// Fallback CORS proxies in case the primary one fails
const FALLBACK_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

/**
 * Makes an API request with fallback proxies
 */
const makeApiRequest = async (url: string, options: RequestInit): Promise<Response> => {
  // Try the primary URL first
  try {
    // Log the actual API URL (without proxy) for clarity
    const actualUrl = getActualApiUrl(url);
    console.log('Attempting API request with primary URL:', actualUrl);
    const response = await fetch(url, options);
    
    // If the response is ok, return it
    if (response.ok) {
      return response;
    }
    
    // If it's a CORS error or network error, try fallback proxies
    if (response.status === 0 || response.status === 403 || response.status === 404) {
      throw new Error('Primary proxy failed, trying fallbacks');
    }
    
    return response;
  } catch (error) {
    console.warn('Primary API request failed, trying fallback proxies:', error);
    
    // Try fallback proxies
    for (const proxy of FALLBACK_PROXIES) {
      try {
        const fallbackUrl = `${proxy}${encodeURIComponent(url.replace(getApiBaseUrl(), 'https://api-staging.littleemperors.com/v2'))}`;
        console.log('Trying fallback proxy:', fallbackUrl);
        
        const response = await fetch(fallbackUrl, {
          ...options,
          headers: {
            ...options.headers,
            'Origin': window.location.origin
          }
        });
        
        if (response.ok) {
          console.log('Fallback proxy succeeded');
          return response;
        }
      } catch (fallbackError) {
        console.warn('Fallback proxy failed:', fallbackError);
        continue;
      }
    }
    
    // If all proxies fail, throw the original error
    throw error;
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

/**
 * Transforms API response data into Hotel objects
 */
const transformApiDataToHotels = (apiData: any[]): Hotel[] => {
  return apiData
    .filter(item => item.type === 'hotel') // Only include hotel items
    .map((item, index) => ({
      id: item.id || index + 1,
      name: item.text || 'Unknown Hotel',
      location: item.location || 'Unknown Location',
      rating: Math.floor(Math.random() * 3) + 3, // Random rating between 3-5
      price: Math.floor(Math.random() * 200) + 100, // Random price between 100-300
      image: `/assets/img/rooms/${(index % 8) + 1}.jpg`, // Cycle through available images
      amenities: ['WiFi', 'Pool', 'Restaurant'], // Default amenities
      description: `Experience luxury and comfort at ${item.text}. Located in ${item.location}, this hotel offers world-class amenities and exceptional service.`,
      available: true,
      distance: `${Math.floor(Math.random() * 10) + 1} km from city center`,
      reviewCount: Math.floor(Math.random() * 500) + 50,
      address: `${item.location}`,
      phone: '+63 2 1234 5678',
      email: 'info@example.com',
      website: 'https://example.com',
      latitude: 14.5995, // Manila coordinates
      longitude: 120.9842,
      
      // Required fields for new Hotel interface
      images: [
        {
          url: `/assets/img/rooms/${(index % 8) + 1}.jpg`,
          thumbnail_url: `/assets/img/rooms/${(index % 8) + 1}.jpg`,
          description: 'Hotel image'
        }
      ],
      videos: [],
      links: {
        self: {
          href: `https://api-staging.littleemperors.com/v2/hotels/${item.id || index + 1}`,
          method: 'GET'
        }
      }
    }));
};

/**
 * Makes a search request to the API with authorization
 */
export const searchHotels = async (params: SearchParams): Promise<SearchResponse> => {
  const searchParams = buildSearchParams(params);
  const url = `${API_BASE_URL}/search?${searchParams.toString()}`;
  
  // Log the actual API URL (without proxy) for clarity
  const actualUrl = getActualApiUrl(url);
  console.log('Making API request to:', actualUrl);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', API_BASE_URL);
  
  try {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Status Text:', response.statusText);
    console.log('API Response URL:', response.url);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response Body:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Response Data:', data);
    
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
      console.warn('Unexpected API response format:', data);
      hotels = [];
    }
    
    return {
      success: true,
      data: hotels,
      total: hotels.length,
      page: 1,
      limit: params.limit || 20
    } as SearchResponse;
  } catch (error) {
    console.error('searchHotels error:', error);
    throw error;
  }
};

/**
 * Search hotels with a simple query (for basic search functionality)
 */
export const searchHotelsByQuery = async (query: string, limit: number = 20): Promise<Hotel[]> => {
  try {
    console.log('searchHotelsByQuery called with:', { query, limit });
    const response = await searchHotels({ query, limit });
    console.log('searchHotelsByQuery response:', response);
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
  console.log('searchHotelsAdvanced response:', response);
  return response.data || [];
};

/**
 * Get hotel details by ID using the hotel details API
 */
export const getHotelDetails = async (hotelId: number): Promise<Hotel> => {
  const url = `${API_BASE_URL}/hotels/${hotelId}`;
  
  console.log('Fetching hotel details for ID:', hotelId);
  // Log the actual API URL (without proxy) for clarity
  const actualUrl = getActualApiUrl(url);
  console.log('Hotel details URL:', actualUrl);
  
  try {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('Hotel details response status:', response.status);
    console.log('Hotel details response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hotel details error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Hotel details response data:', data);
    
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
      
      // Legacy fields for backward compatibility (using fallback values)
      rating: hotelData.rating || Math.floor(Math.random() * 3) + 3,
      price: hotelData.price || Math.floor(Math.random() * 200) + 100,
      image: hotelData.images && hotelData.images.length > 0 ? hotelData.images[0].url : undefined,
      available: true,
      distance: hotelData.distance || `${Math.floor(Math.random() * 10) + 1} km from city center`,
      reviewCount: hotelData.reviewCount || Math.floor(Math.random() * 500) + 50,
      phone: hotelData.phone || '+63 2 1234 5678',
      email: hotelData.email || 'info@example.com'
    };
  } catch (error) {
    console.error('getHotelDetails error:', error);
    throw error;
  }
};

/**
 * Test API connectivity
 */
export const testApiConnectivity = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const testUrl = `${API_BASE_URL}/search?query=test&limit=1`;
    // Log the actual API URL (without proxy) for clarity
    const actualTestUrl = getActualApiUrl(testUrl);
    console.log('Testing API connectivity with URL:', actualTestUrl);
    
    const response = await makeApiRequest(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('Test response status:', response.status);
    console.log('Test response URL:', response.url);
    
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
    console.log('Testing with sample URL:', actualSampleUrl);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API Base URL:', API_BASE_URL);
    
    const response = await makeApiRequest(sampleUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('Sample URL response status:', response.status);
    console.log('Sample URL response URL:', response.url);
    console.log('Sample URL response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      return {
        success: false,
        message: `Sample URL test failed with status: ${response.status} - ${response.statusText}. Response: ${errorText}`
      };
    }
    
    const data = await response.json();
    console.log('Sample URL test response data:', data);
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
    console.log('Testing API endpoint:', testUrl);
    
    const response = await makeApiRequest(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('Endpoint test response status:', response.status);
    console.log('Endpoint test response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Endpoint test error response:', errorText);
      return {
        success: false,
        message: `Endpoint test failed with status: ${response.status} - ${response.statusText}. Response: ${errorText}`
      };
    }
    
    const data = await response.json();
    console.log('Endpoint test response data:', data);
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
  console.log('Fetching hotel details for batch:', hotelIds);
  
  try {
    // Fetch all hotel details in parallel
    const hotelPromises = hotelIds.map(id => getHotelDetails(id));
    const hotels = await Promise.allSettled(hotelPromises);
    
    // Filter out failed requests and return successful ones
    const successfulHotels = hotels
      .filter((result): result is PromiseFulfilledResult<Hotel> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedHotels = hotels
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);
    
    if (failedHotels.length > 0) {
      console.warn('Some hotel details failed to fetch:', failedHotels);
    }
    
    console.log(`Successfully fetched ${successfulHotels.length} out of ${hotelIds.length} hotel details`);
    return successfulHotels;
  } catch (error) {
    console.error('getHotelDetailsBatch error:', error);
    throw error;
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
  console.log('Making enhanced API request to:', actualUrl);
  
  try {
    const response = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API Response Data:', data);
    
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
      console.warn('API response does not contain expected data array:', data);
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
    console.log('Sending booking email with details:', bookingDetails);
    
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
    console.log('Submitting booking form with details:', bookingDetails);
    
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
    console.log('Form data prepared:', Object.fromEntries(formData.entries()));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Booking form submitted successfully');
    
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
export const checkHotelAvailability = async (params: AvailabilityParams): Promise<AvailabilityResponse[]> => {
  const url = `${API_BASE_URL}/hotels/availability`;
  
  console.log('Checking hotel availability with params:', params);
  
  try {
    // Log the actual API URL (without proxy) for clarity
    const actualApiUrl = `${getActualApiBaseUrl()}/hotels/availability`;
    console.log('Availability API URL:', actualApiUrl);
    
    const response = await makeApiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(params),
    });
    
    console.log('Availability response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Availability error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Availability response data:', data);
    
    // The API returns an array of availability responses
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      // If it's a single object, wrap it in an array
      return [data];
    }
  } catch (error) {
    console.error('checkHotelAvailability error:', error);
    throw error;
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
  creditCard: {
    number: string;
    name: string;
    cvc: string;
    brand_name: string;
    exp_month: string;
    exp_year: string;
  };
  rooms: Array<{
    adults: number;
    children?: Array<{ age: number }>;
  }>;
}

export const submitBooking = async (bookingData: BookingRequest): Promise<BookingResponse> => {
  const url = `${API_BASE_URL}/hotels/bookings`;
  
  console.log('Submitting booking with data:', bookingData);
  
  try {
    // Validate required fields
    if (!bookingData.sessionId || bookingData.sessionId.trim() === '') {
      throw new Error('Session ID is required. Please ensure you have completed the availability check.');
    }
    
    if (!bookingData.creditCard.exp_month || bookingData.creditCard.exp_month.trim() === '') {
      throw new Error('Expiration month is required.');
    }
    
    // Log the actual API URL (without proxy) for clarity
    const actualApiUrl = `${getActualApiBaseUrl()}/hotels/bookings`;
    console.log('Booking API URL:', actualApiUrl);
    
    // Convert exp_month from string to integer (remove leading zeros)
    const expMonthInt = parseInt(bookingData.creditCard.exp_month, 10);
    if (isNaN(expMonthInt) || expMonthInt < 1 || expMonthInt > 12) {
      throw new Error('Invalid expiration month. Please select a valid month.');
    }
    
    // Validate rateIndex is provided
    if (!bookingData.rateIndex || bookingData.rateIndex.trim() === '') {
      throw new Error('Rate index is required. Please select a valid room type from the availability check.');
    }
    
    const trimmedRateIndex = bookingData.rateIndex.trim();
    
    // rateIndex can be either a string identifier (e.g., "SODR79-R7O") or a numeric string
    // Try to parse as number if it's numeric, otherwise keep as string
    let rateIndexValue: string | number = trimmedRateIndex;
    const parsedInt = parseInt(trimmedRateIndex, 10);
    if (!isNaN(parsedInt) && String(parsedInt) === trimmedRateIndex) {
      // It's a valid integer string, send as number
      rateIndexValue = parsedInt;
    }
    // Otherwise keep as string (for identifiers like "SODR79-R7O")
    
    // Prepare JSON body with proper data types
    const requestBody = {
      start_date: bookingData.startDate,
      end_date: bookingData.endDate,
      session_id: bookingData.sessionId,
      rate_index: rateIndexValue,
      hotel_id: bookingData.hotelId,
      guest_name: bookingData.guestName,
      guest_email: bookingData.guestEmail,
      credit_card: {
        number: bookingData.creditCard.number,
        name: bookingData.creditCard.name,
        cvc: bookingData.creditCard.cvc,
        brand_name: bookingData.creditCard.brand_name,
        exp_month: expMonthInt, // Convert to integer
        exp_year: bookingData.creditCard.exp_year,
      },
      rooms: bookingData.rooms.map(room => ({
        adults: room.adults,
        children: room.children || [],
      })),
    };
    
    console.log('Booking request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await makeApiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Booking response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Booking error response:', errorText);
      
      // Try to parse error response for better error messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors) {
          // Check for generic errors (usually in the "_" field)
          if (errorData.errors._) {
            const genericError = Array.isArray(errorData.errors._) 
              ? errorData.errors._[0] 
              : errorData.errors._;
            throw new Error(genericError);
          }
          // Check for rate_index errors
          if (errorData.errors.rate_index) {
            const rateError = Array.isArray(errorData.errors.rate_index) 
              ? errorData.errors.rate_index[0] 
              : errorData.errors.rate_index;
            if (rateError.includes('not found') || rateError.includes('invalid')) {
              throw new Error('The provided rate_index is not found in this session. Please check availability again to get a valid rate index.');
            }
            throw new Error(`Rate index error: ${rateError}. Please check availability again and select a valid rate.`);
          }
          // Check for session_id errors
          if (errorData.errors.session_id) {
            const sessionError = Array.isArray(errorData.errors.session_id)
              ? errorData.errors.session_id[0]
              : errorData.errors.session_id;
            if (sessionError.includes('invalid') || sessionError.includes('expired')) {
              throw new Error('The session has expired or is invalid. Please check availability again to get a new session ID.');
            }
            throw new Error(`Session error: ${sessionError}. Please check availability again.`);
          }
          // Check for other field-specific errors
          const errorKeys = Object.keys(errorData.errors);
          if (errorKeys.length > 0) {
            // Get the first error field and its message
            const firstErrorKey = errorKeys[0];
            const firstError = Array.isArray(errorData.errors[firstErrorKey])
              ? errorData.errors[firstErrorKey][0]
              : errorData.errors[firstErrorKey];
            throw new Error(`${firstErrorKey}: ${firstError}`);
          }
        }
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      } catch (parseError) {
        // If parsing fails, check if it's a rate_index or session-related error in the text
        if (errorText.includes('rate_index') || errorText.includes('rate index')) {
          throw new Error('The provided rate_index is not found in this session. Please check availability again to get a valid rate index.');
        }
        if (errorText.includes('session_id') && (errorText.includes('invalid') || errorText.includes('expired'))) {
          throw new Error('The session has expired or is invalid. Please check availability again to get a new session ID.');
        }
        // If parsing fails, use the original error text
      }
      
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Booking response data:', data);
    
    // Handle API error responses
    if (!data.success && data.success !== undefined) {
      return {
        success: false,
        message: data.message || 'Booking failed',
      };
    }
    
    return {
      success: true,
      message: data.message || 'Booking submitted successfully!',
      bookingId: data.booking_id || data.id || undefined,
    };
  } catch (error) {
    console.error('submitBooking error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit booking. Please try again.',
    };
  }
};
