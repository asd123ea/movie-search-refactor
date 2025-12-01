import { HttpException, HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { MovieDto } from './dto/movie.dto';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';

interface OmdbMovie {
  Title: string;
  imdbID: string;
  Year: string;
  Poster: string;
}

interface OmdbSearchResponse {
  Response: string;
  Search?: OmdbMovie[];
  totalResults?: string;
  Error?: string;
}

@Injectable()
export class MoviesService implements OnModuleInit {
  private favorites: MovieDto[] = [];
  private readonly favoritesFilePath = path.join(process.cwd(), 'data', 'favorites.json');
  private readonly apiKey = process.env.OMDB_API_KEY;

  constructor() {
    if (!this.apiKey) {
      throw new Error('OMDB_API_KEY environment variable is not set');
    }
  }

  async onModuleInit(): Promise<void> {
    await this.loadFavorites();
  }

  private async loadFavorites(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.favoritesFilePath, 'utf-8').catch(err => {
        if ((err as any).code === 'ENOENT') return null;
        throw err;
      });

      if (!fileContent) {
        this.favorites = [];
        return;
      }

      const parsed: unknown = JSON.parse(fileContent);
      if (!this.isValidFavoritesArray(parsed)) {
        this.favorites = [];
        return;
      }

      this.favorites = parsed;

    } catch (error) {
      console.error('Error loading favorites:', error);
      this.favorites = [];
    }
  }

  private isValidMovie(movie: unknown): movie is MovieDto {
    return (
      typeof movie === "object" &&
      movie !== null &&
      "title" in movie &&
      "imdbID" in movie &&
      "year" in movie &&
      "poster" in movie
    );
  }

  private isValidFavoritesArray(parsed: unknown): parsed is MovieDto[] {
    return Array.isArray(parsed) && parsed.every((m) => this.isValidMovie(m));
  }

  private async saveFavorites(): Promise<void> {
    try {
      const dir = path.dirname(this.favoritesFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.favoritesFilePath, JSON.stringify(this.favorites, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving favorites:', error);
      throw new HttpException(
        'Failed to save favorites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async searchMovies(title: string, page: number = 1): Promise<OmdbSearchResponse> {
    try {
      const encodedTitle = encodeURIComponent(title);
      const url = `http://www.omdbapi.com/?apikey=${this.apiKey}&s=${encodedTitle}&type=movie&page=${page}`;
      const response = await axios.get<OmdbSearchResponse>(url, {
        timeout: 5000,
      });
      if (response.data.Response === "False" || response.data.Error) {
        return { Response: "", totalResults: "0" };
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new HttpException(
            'Request timeout - OMDb API is taking too long to respond',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        throw new HttpException(
          'Failed to search movies - API error',
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw error;
    }
  }

  async getMovieByTitle(title: string, page: number = 1) {
    try {
      const response = await this.searchMovies(title, page);

      // OMDb API returns Response: "False" (string) when no results
      if (response.Response === 'False' || response.Error || !response.Search) {
        return {
          data: {
            movies: [],
            count: 0,
            totalResults: '0',
          },
        };
      }

      // Reload favorites to ensure freshness
      await this.loadFavorites();

      const formattedResponse = response.Search.map((movie: OmdbMovie) => {
        const isFavorite = this.favorites.some(fav => fav.imdbID === movie.imdbID);
        return {
          title: movie.Title,
          imdbID: movie.imdbID,
          year: this.parseYear(movie.Year),
          poster: movie.Poster || undefined,
          isFavorite,
        };
      });

      return {
        data: {
          movies: formattedResponse,
          count: formattedResponse.length,
          totalResults: response.totalResults || '0',
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search movies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private parseYear(yearStr: string): number {
    const match = yearStr.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async addToFavorites(movieToAdd: MovieDto) {
    try {
      await this.loadFavorites();

      // Check if already exists
      if (this.favorites.some(fav => fav.imdbID.toLowerCase() === movieToAdd.imdbID.toLowerCase())) {
        throw new HttpException(
          'Movie already in favorites',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.favorites.push(movieToAdd);
      await this.saveFavorites();

      return {
        data: {
          message: 'Movie added to favorites',
          movie: movieToAdd,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to add movie to favorites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeFromFavorites(movieId: string) {
    try {
      await this.loadFavorites();

      const foundIndex = this.favorites.findIndex(movie => movie.imdbID.toLowerCase() === movieId.toLowerCase());

      if (foundIndex === -1) {
        throw new HttpException(
          'Movie not found in favorites',
          HttpStatus.NOT_FOUND,
        );
      }

      this.favorites.splice(foundIndex, 1);
      await this.saveFavorites();

      return {
        data: {
          message: 'Movie removed from favorites',
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to remove movie from favorites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFavorites(page: number = 1, pageSize: number = 10) {
    try {
      // Reload to ensure freshness
      await this.loadFavorites();

      if (page < 1) {
        throw new HttpException(
          'Page must be at least 1',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedFavorites = this.favorites.slice(startIndex, endIndex);
      const totalPages = Math.ceil(this.favorites.length / pageSize);

      return {
        data: {
          favorites: paginatedFavorites,
          count: paginatedFavorites.length,
          totalResults: this.favorites.length.toString(),
          currentPage: page,
          totalPages: Math.max(1, totalPages),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get favorites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

