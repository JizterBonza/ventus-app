# Search API Implementation

This document describes the search functionality implementation using the provided API endpoint.

## API Endpoint

**Base URL:** `https://api-staging.littleemperors.com/v2`

**Search Endpoint:** `/search`

**Sample Request:**
```
GET /v2/search?query=philippines&limit=20
```

## Implementation Overview

The search functionality has been implemented with the following components:

### 1. TypeScript Types (`src/types/search.ts`)

Defines interfaces for:
- `SearchParams`: Parameters for search requests
- `Hotel`: Hotel data structure
- `SearchResponse`: API response structure
- `ApiError`: Error response structure

### 2. API Utilities (`src/utils/api.ts`)

Provides functions for:
- `searchHotels()`: Main search function with full parameter support
- `searchHotelsByQuery()`: Simple search by query string
- `searchHotelsAdvanced()`: Advanced search with filters
- `getHotelDetails()`: Get individual hotel details

### 3. Custom Hook (`src/hooks/useSearch.ts`)

React hook that manages:
- Search state (loading, error, results)
- Search functions
- Error handling

### 4. Components

#### SearchBar (`src/components/shared/SearchBar.tsx`)
- Reusable search input component
- Auto-complete functionality
- Navigation to search results

#### Search Page (`src/pages/Search.tsx`)
- Full search interface
- Advanced filters (price, rating, sorting)
- Grid/List view modes
- Real-time API integration

#### Search Demo (`src/components/shared/SearchDemo.tsx`)
- Demo component showcasing API usage
- Test buttons for different search scenarios

## Usage Examples

### Basic Search
```typescript
import { searchHotelsByQuery } from '../utils/api';

const results = await searchHotelsByQuery('philippines', 20);
```

### Advanced Search
```typescript
import { searchHotelsAdvanced } from '../utils/api';
import { SearchParams } from '../types/search';

const searchParams: SearchParams = {
  query: 'philippines',
  limit: 20,
  priceRange: 'medium',
  rating: '4',
  sortBy: 'price-low'
};

const results = await searchHotelsAdvanced(searchParams);
```

### Using the Custom Hook
```typescript
import { useSearch } from '../hooks/useSearch';

const { hotels, loading, error, searchByQuery } = useSearch();

// Search for hotels
await searchByQuery('philippines', 20);
```

## Search Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `query` | string | Search query (location, hotel name, etc.) | Yes |
| `limit` | number | Number of results to return | No |
| `location` | string | Specific location filter | No |
| `checkIn` | string | Check-in date (YYYY-MM-DD) | No |
| `checkOut` | string | Check-out date (YYYY-MM-DD) | No |
| `adults` | number | Number of adult guests | No |
| `children` | number | Number of children | No |
| `rooms` | number | Number of rooms | No |
| `priceRange` | string | Price range filter (low/medium/high) | No |
| `rating` | string | Minimum rating filter | No |
| `sortBy` | string | Sort order (price-low/price-high/rating/distance) | No |

## Error Handling

The implementation includes comprehensive error handling:

1. **Network Errors**: CORS, connection issues
2. **API Errors**: Invalid responses, server errors
3. **Validation Errors**: Missing required parameters
4. **User Feedback**: Loading states, error messages

## Features

### Search Functionality
- ✅ Real-time API integration
- ✅ Query-based search
- ✅ Advanced filtering
- ✅ Sorting options
- ✅ Pagination support (via limit parameter)

### User Interface
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Auto-complete suggestions
- ✅ Grid/List view modes
- ✅ Filter sidebar

### Data Handling
- ✅ TypeScript type safety
- ✅ Fallback images for missing hotel photos
- ✅ Graceful handling of missing data
- ✅ Data validation

## Testing the API

You can test the API endpoint directly:

```bash
curl "https://api-staging.littleemperors.com/v2/search?query=philippines&limit=20"
```

Or use the demo component in the application to test different search scenarios.

## Integration Notes

1. **CORS**: Ensure the API supports CORS for browser requests
2. **Rate Limiting**: Consider implementing rate limiting for production use
3. **Caching**: Consider caching search results for better performance
4. **Authentication**: Add authentication headers if required by the API

## Future Enhancements

- [ ] Implement search result caching
- [ ] Add search history
- [ ] Implement search suggestions
- [ ] Add map integration
- [ ] Implement booking functionality
- [ ] Add user reviews and ratings
- [ ] Implement price alerts
- [ ] Add multi-language support
