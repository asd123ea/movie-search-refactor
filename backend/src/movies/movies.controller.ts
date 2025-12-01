import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MovieDto } from './dto/movie.dto';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('search')
  async searchMovies(@Query('q') query: string, @Query('page') page?: string) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new BadRequestException('Search query is required and cannot be empty');
    }

    const pageNumber = this.parsePageNumber(page);

    return await this.moviesService.getMovieByTitle(query.trim(), pageNumber);
  }

  @Post('favorites')
  addToFavorites(@Body() movieToAdd: MovieDto) {
    if (!movieToAdd) {
      throw new BadRequestException('Movie data is required');
    }
    return this.moviesService.addToFavorites(movieToAdd);
  }

  @Delete('favorites/:imdbID')
  removeFromFavorites(@Param('imdbID') imdbID: string) {
    if (!imdbID || typeof imdbID !== 'string' || imdbID.trim().length === 0) {
      throw new BadRequestException('imdbID is required');
    }
    return this.moviesService.removeFromFavorites(imdbID.trim());
  }

  @Get('favorites/list')
  getFavorites(@Query('page') page?: string) {
    const pageNumber = this.parsePageNumber(page);

    return this.moviesService.getFavorites(pageNumber);
  }

   private parsePageNumber(page?: string): number {
    let pageNumber = 1;
    if (page !== undefined) {
      pageNumber = parseInt(page, 10);
      if (isNaN(pageNumber) || pageNumber < 1) {
        throw new BadRequestException('Page must be a valid positive integer');
      }
    }
    return pageNumber;
  }
}

