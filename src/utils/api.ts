import { SearchParams, SearchResponse, ApiError, Hotel } from '../types/search';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/v2' 
  : 'https://api-staging.littleemperors.com/v2';
const API_TOKEN = 'lev2_U4Jp8lyg5iXR2mTQVJEn_sbfi9YLSzE3NTIxNDQxODY';

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
  
  console.log('Making API request to:', url);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', API_BASE_URL);
  
  try {
    const response = await fetch(url, {
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
  console.log('Hotel details URL:', url);
  
  try {
    const response = await fetch(url, {
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
    console.log('Testing API connectivity with URL:', testUrl);
    
    const response = await fetch(testUrl, {
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
    console.log('Testing with sample URL:', sampleUrl);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API Base URL:', API_BASE_URL);
    
    const response = await fetch(sampleUrl, {
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
    
    const response = await fetch(testUrl, {
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
  
  console.log('Making enhanced API request to:', url);
  
  try {
    const response = await fetch(url, {
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
