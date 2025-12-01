"use client";

import { useState } from "react";
import MovieCard from "@/components/MovieCard";
import Pagination from "@/components/pagination";

import { Button } from "@/components/ui/button";
import { useAddToFavorites, useFavorites, useRemoveFromFavorites } from "@/hooks/useMovies";
import { Movie } from "@/types/movie";
import Link from "next/link";

const Favorites = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { data: favorites, isLoading, isError, error: fetchError } = useFavorites(currentPage);

  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();

  const handleToggleFavorite = async (movie: Movie) => {
    setError(null);
    try {
      // On favorites page, toggle should remove the movie
      await removeFromFavorites.mutateAsync(movie.imdbID);

      // If current page becomes empty after removal, go to previous page
      const currentFavoritesCount = favorites?.data?.favorites?.length ?? 0;
      if (currentFavoritesCount <= 1 && currentPage > 1) {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
    }
  };

  const handlePageChange = (page: number) => {
    const totalPages = Number(favorites?.data?.totalPages ?? 1);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalResults = Number(favorites?.data.totalResults ?? 0) || 0;
  const totalPagesNumber = Number(favorites?.data?.totalPages ?? 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-4xl md:text-5xl text-white font-bold  bg-clip-text ">
              My Favorites
            </h1>
          </div>
          <p className="text-center text-muted-foreground">
            {totalResults} {totalResults === 1 ? "movie" : "movies"} saved
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Loading favorites...</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No Favorites Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start adding movies to your favorites from the search page
            </p>
            <Link href="/">
              <Button className="bg-gradient-primary">
                Search Movies
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {favorites?.data?.favorites?.map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            {totalPagesNumber > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesNumber}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}
      </div>
    </div>
  );
};

export default Favorites;

