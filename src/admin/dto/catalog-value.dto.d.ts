declare class CamposDeCatalogo {
    descripcion?: string | null;
    capacidadMaxima?: number | null;
    edadMinima?: number | null;
    edadMaxima?: number | null;
    valor?: number | null;
    unidad?: string | null;
}
export declare class CreateCatalogValueDto extends CamposDeCatalogo {
    nombre: string;
    activo?: boolean;
}
export declare class UpdateCatalogValueDto extends CamposDeCatalogo {
    nombre?: string;
    activo?: boolean;
}
export {};
