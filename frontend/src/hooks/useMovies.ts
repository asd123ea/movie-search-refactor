import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movieApi } from '@/lib/api';

export const useSearchMovies = (query: string, page: number = 1, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['movies', 'search', query, page],
    queryFn: () => movieApi.searchMovies(query, page),
    enabled: enabled && query.trim().length > 0,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useFavorites = (page: number = 1) => {
  return useQuery({
    queryKey: ['movies', 'favorites', page],
    queryFn: () => movieApi.getFavorites(page),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAddToFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: movieApi.addToFavorites,
    onSuccess: () => {
      // Invalidate only favorites-related queries, not all movie queries
      queryClient.invalidateQueries({ queryKey: ['movies', 'favorites'] });
      // Refetch all search queries to update isFavorite status
      queryClient.invalidateQueries({ queryKey: ['movies', 'search'] });
    },
    onError: (error) => {
      console.error('Failed to add favorite:', error);
    },
  });
};

export const useRemoveFromFavorites = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: movieApi.removeFromFavorites,
    onSuccess: () => {
      // Invalidate only favorites-related queries
      queryClient.invalidateQueries({ queryKey: ['movies', 'favorites'] });
      // Refetch all search queries to update isFavorite status
      queryClient.invalidateQueries({ queryKey: ['movies', 'search'] });
    },
    onError: (error) => {
      console.error('Failed to remove favorite:', error);
    },
  });
};

