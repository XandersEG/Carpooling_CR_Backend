//---------------------------------------------------------------------------------------------------
import { Injectable } from "@nestjs/common";
import { 
    resumenCantidadDatos, 
    conductoresPorGenero, 
    pasajerosPorGenero, 
    viajesPorMetodoPago,
    FiltrosEstadisticas
} from "./statistics.queries.js"

// Esta pal frontend t(->-)t

@Injectable()
export class StatisticsService{
    async obtenerEstadisticas(filtros: FiltrosEstadisticas){
        const [resumen, conductoresGenero, pasajerosGenero, viajesMetodoPago] = await Promise.all([
            resumenCantidadDatos(filtros),
            conductoresPorGenero(filtros),
            pasajerosPorGenero(filtros),
            viajesPorMetodoPago(filtros)
        ]);
        return{
            resumenDatos: resumen,
            conductoresGenero: conductoresGenero,
            pasajerosGenero: pasajerosGenero,
            viajesMetodo: viajesMetodoPago
        }
    }
}