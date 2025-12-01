'use client';

import { useMemo, useState } from 'react';
import { useSearchMovies, useAddToFavorites, useRemoveFromFavorites } from '@/hooks/useMovies';
import { Movie } from '@/types/movie';
import SearchBar from '@/components/searchBar';
import MovieCard from '@/components/MovieCard';
import Pagination from '@/components/pagination';

const RESULTS_PER_PAGE = 10;

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data: searchResults, isLoading, isError, error: queryError } = useSearchMovies(
    searchQuery,
    currentPage,
    searchEnabled
  );
  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();

  // Memoize totalPages calculation
  const totalPages = useMemo(() => {
    if (!searchResults?.data.totalResults) return 0;
    return Math.ceil(parseInt(searchResults.data.totalResults) / RESULTS_PER_PAGE);
  }, [searchResults?.data.totalResults]);

  const handleSearch = (query: string) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      setError('Please enter a search query');
      return;
    }
    setError(null);
    setSearchQuery(query);
    setSearchEnabled(true);
    setCurrentPage(1);
  };

  const handleToggleFavorite = async (movie: Movie) => {
    try {
      setError(null);
      if (movie.isFavorite) {
        await removeFromFavorites.mutateAsync(movie.imdbID);
      } else {
        await addToFavorites.mutateAsync(movie);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update favorites';
      setError(errorMessage);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && totalPages >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Determine what content to show
  const hasSearchResults = searchResults?.data.movies && searchResults.data.movies.length > 0;
  const shouldShowEmptyState = !isLoading && !searchQuery;
  const shouldShowNoResults = !isLoading && searchQuery && !hasSearchResults;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text">
              Movie Finder
            </h1>
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Searching for movies...</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2 text-red-600">Search Error</h2>
            <p className="text-muted-foreground">
              {queryError ? String(queryError) : 'An error occurred while searching. Please try again.'}
            </p>
          </div>
        )}

        {shouldShowEmptyState && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Start Your Search</h2>
            <p className="text-muted-foreground">
              Search for your favorite movies and add them to your favorites
            </p>
          </div>
        )}

        {shouldShowNoResults && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">
              No movies found for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {hasSearchResults && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {searchResults.data.movies.map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  isFavorite={movie.isFavorite ?? false}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

