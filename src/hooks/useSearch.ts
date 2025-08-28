import { useState, useCallback, useEffect } from 'react';
import { Hotel, SearchParams } from '../types/search';
import { searchHotels, searchHotelsByQuery, searchHotelsAdvanced, searchHotelsEnhanced } from '../utils/api';

interface UseSearchReturn {
  hotels: Hotel[];
  loading: boolean;
  error: string | null;
  searchByQuery: (query: string, limit?: number) => Promise<void>;
  searchAdvanced: (params: SearchParams) => Promise<void>;
  clearError: () => void;
  clearResults: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug error state changes
  const setErrorWithLog = (errorMessage: string | null) => {
    console.log('Setting error state:', errorMessage);
    setError(errorMessage);
  };

  const searchByQuery = useCallback(async (query: string, limit: number = 20) => {
    if (!query.trim()) {
      setErrorWithLog('Please enter a search query');
      return;
    }

    setLoading(true);
    setErrorWithLog(null);

    try {
      console.log('Searching for query:', query, 'with limit:', limit);
      const results = await searchHotelsByQuery(query, limit);
      console.log('Search results:', results);
      console.log('Results type:', typeof results);
      console.log('Results is array:', Array.isArray(results));
      console.log('Results length:', results?.length);
      
      if (Array.isArray(results)) {
        setHotels(results);
        if (results.length === 0) {
          setErrorWithLog('No hotels found for your search criteria');
        } else {
          // Clear any previous errors if we got results
          setErrorWithLog(null);
        }
      } else {
        console.error('Expected array but got:', results);
        setErrorWithLog('Invalid response format from API');
        setHotels([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setErrorWithLog(errorMessage);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAdvanced = useCallback(async (params: SearchParams) => {
    if (!params.query?.trim()) {
      setErrorWithLog('Please enter a search query');
      return;
    }

    setLoading(true);
    setErrorWithLog(null);

    try {
      console.log('Advanced search with params:', params);
      const results = await searchHotelsAdvanced(params);
      console.log('Advanced search results:', results);
      console.log('Results type:', typeof results);
      console.log('Results length:', results?.length);
      
      if (Array.isArray(results)) {
        setHotels(results);
        if (results.length === 0) {
          setErrorWithLog('No hotels found for your search criteria');
        } else {
          // Clear any previous errors if we got results
          setErrorWithLog(null);
        }
      } else {
        console.error('Expected array but got:', results);
        setErrorWithLog('Invalid response format from API');
        setHotels([]);
      }
    } catch (err) {
      console.error('Advanced search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setErrorWithLog(errorMessage);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorWithLog(null);
  }, []);

  const clearResults = useCallback(() => {
    setHotels([]);
    setErrorWithLog(null);
  }, []);

  // Monitor error state changes
  useEffect(() => {
    console.log('Error state changed to:', error);
  }, [error]);

  return {
    hotels,
    loading,
    error,
    searchByQuery,
    searchAdvanced,
    clearError,
    clearResults,
  };
};
