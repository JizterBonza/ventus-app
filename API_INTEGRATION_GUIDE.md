# API Integration Guide

## Overview

The application has been successfully integrated with the Little Emperors API endpoint:
```
https://api-staging.littleemperors.com/v2/search?query=Philippines&limit=20
```

## API Configuration

### Base Configuration
- **Base URL**: `https://api-staging.littleemperors.com/v2`
- **API Token**: `lev2_U4Jp8lyg5iXR2mTQVJEn_sbfi9YLSzE3NTIxNDQxODY`
- **Endpoint**: `/search`

### Request Format
The API accepts the following parameters:
- `query` (required): Search query/location
- `limit` (optional): Number of results to return (default: 20)
- `priceRange` (optional): Price range filter
- `rating` (optional): Minimum rating filter
- `sortBy` (optional): Sorting criteria

### Headers
All API requests include:
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer {API_TOKEN}`

## Implementation Details

### Core API Functions

#### 1. `searchHotels(params: SearchParams)`
Main search function that handles all API requests with proper error handling.

#### 2. `searchHotelsByQuery(query: string, limit: number)`
Simplified search function for basic queries.

#### 3. `searchHotelsAdvanced(params: SearchParams)`
Advanced search with filters and sorting.

#### 4. `searchHotelsEnhanced(params: SearchParams)`
Enhanced version with better error handling and response validation.

### Response Structure
The API returns data in the following format:
```typescript
interface SearchResponse {
  success: boolean;
  data: Hotel[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}
```

### Hotel Data Structure
```typescript
interface Hotel {
  id: number;
  name: string;
  location: string;
  rating: number;
  price: number;
  image: string;
  amenities: string[];
  description: string;
  available: boolean;
  distance?: string;
  reviewCount?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}
```

## Usage Examples

### Basic Search
```typescript
import { searchHotelsByQuery } from '../utils/api';

const results = await searchHotelsByQuery('Philippines', 20);
```

### Advanced Search
```typescript
import { searchHotelsAdvanced } from '../utils/api';

const searchParams = {
  query: 'Philippines',
  limit: 20,
  priceRange: 'medium',
  rating: '4',
  sortBy: 'rating'
};

const results = await searchHotelsAdvanced(searchParams);
```

### Testing API Connection
```typescript
import { testSampleUrl } from '../utils/api';

const result = await testSampleUrl();
console.log('API Test Result:', result);
```

## Integration Points

### 1. Search Page (`/search`)
- Main search interface
- Filters and sorting options
- Real-time API integration
- Error handling and loading states

### 2. Home Page (`/`)
- Search form redirects to search page
- Popular destinations with direct search links

### 3. Search Hook (`useSearch`)
- Centralized search state management
- API call handling
- Error and loading state management

### 4. API Test Component
- Built-in testing interface
- Connection verification
- Response validation

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors**: Connection failures, timeouts
2. **API Errors**: Invalid responses, authentication failures
3. **Data Validation**: Missing or malformed data
4. **User Feedback**: Clear error messages and loading states

## Testing

### Manual Testing
1. Navigate to the Search page
2. Click "Show API Test" button
3. Test API connection
4. Test search functionality
5. Verify results display correctly

### Automated Testing
The API functions include console logging for debugging:
- Request URLs
- Response status codes
- Response data structure
- Error details

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the API server allows requests from your domain
2. **Authentication Errors**: Verify the API token is valid and properly formatted
3. **Rate Limiting**: Check if you're hitting API rate limits
4. **Network Issues**: Verify internet connectivity and API server availability

### Debug Steps

1. Open browser developer tools
2. Check the Network tab for API requests
3. Review console logs for error messages
4. Use the API test component to verify connectivity
5. Check response data structure matches expected format

## Future Enhancements

1. **Caching**: Implement response caching for better performance
2. **Pagination**: Add support for paginated results
3. **Real-time Updates**: Implement WebSocket connections for live data
4. **Offline Support**: Add offline functionality with cached data
5. **Advanced Filters**: Add more sophisticated filtering options

## Security Considerations

1. **API Token**: Store securely and rotate regularly
2. **Input Validation**: Validate all user inputs before sending to API
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Rate Limiting**: Implement client-side rate limiting
5. **HTTPS**: Ensure all API communications use HTTPS

## Support

For API-related issues:
1. Check the API documentation
2. Verify API server status
3. Review error logs
4. Test with the provided test component
5. Contact API provider for technical support
