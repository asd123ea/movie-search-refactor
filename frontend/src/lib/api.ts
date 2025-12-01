import { Movie, SearchMoviesResponse, FavoritesResponse } from '@/types/movie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/movies';

// Helper to handle API responses and errors properly
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json();
}

export const movieApi = {
  searchMovies: async (query: string, page: number = 1): Promise<SearchMoviesResponse> => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (page < 1 || !Number.isInteger(page)) {
      throw new Error('Page must be a positive integer');
    }

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodedQuery}&page=${page}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return handleApiResponse<SearchMoviesResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to search movies');
    }
  },

  getFavorites: async (page: number = 1): Promise<FavoritesResponse> => {
    if (page < 1 || !Number.isInteger(page)) {
      throw new Error('Page must be a positive integer');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/favorites/list?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return handleApiResponse<FavoritesResponse>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get favorites');
    }
  },

  addToFavorites: async (movie: Movie): Promise<void> => {
    if (!movie || !movie.imdbID || !movie.title) {
      throw new Error('Invalid movie data');
    }

    try {

      const payload = {
        title: movie.title,
        imdbID: movie.imdbID,
        year: movie.year,
        poster: movie.poster,
      };

      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      await handleApiResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add movie to favorites');
    }
  },

  removeFromFavorites: async (imdbID: string): Promise<void> => {
    if (!imdbID || typeof imdbID !== 'string' || imdbID.trim().length === 0) {
      throw new Error('Invalid imdbID');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/favorites/${imdbID.trim()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await handleApiResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to remove movie from favorites');
    }
  },
};

