//---------------------------------------------------------------------------------------------------
import { Injectable } from "@nestjs/common";
import { 
    resumenCantidadDatos, 
    conductoresPorGenero, 
    pasajerosPorGenero, 
    viajesPorMetodoPago,
    FiltrosEstadisticas,
    usuariosPorRangoEdad
} from "./statistics.queries.js"

//

@Injectable()
export class StatisticsService{
    async obtenerEstadisticas(filtros: FiltrosEstadisticas){
        const [resumen, conductoresGenero, pasajerosGenero, viajesMetodoPago, usuariosRangoEdad] = await Promise.all([
            resumenCantidadDatos(filtros),
            conductoresPorGenero(filtros),
            pasajerosPorGenero(filtros),
            viajesPorMetodoPago(filtros),
            usuariosPorRangoEdad(filtros)
        ]);
        return{
            resumenDatos: resumen,
            conductoresGenero: conductoresGenero,
            pasajerosGenero: pasajerosGenero,
            viajesMetodo: viajesMetodoPago,
            rangoEdad: usuariosRangoEdad
        }
    }
}