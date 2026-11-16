//---------------------------------------------------------------------------------------------------
import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('statistics')
export class StatisticsController{
    constructor(private readonly statisticsService: StatisticsService) {}
    @Get()
    obtenerEstadisticas(
        @Query('institucionId', new ParseIntPipe({ optional: true })) institucionId?: number,
        @Query('desde') desde?: string, @Query('hasta') hasta?: string,
    ){
        return this.statisticsService.obtenerEstadisticas({ institucionId, desde, hasta });
    }
}