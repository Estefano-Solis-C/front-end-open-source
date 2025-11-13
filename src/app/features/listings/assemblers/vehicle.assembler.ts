import { Vehicle } from '../models/vehicle.model';
import { VehicleDto } from '../models/vehicle.dto';

export class VehicleAssembler {
  static toModel(dto: any): Vehicle { // Lo ponemos como 'any' para aceptar ownerId
    return new Vehicle(
      dto.id,
      dto.brand,
      dto.model,
      dto.year,
      dto.pricePerDay,
      dto.status || dto.state, // Acepta 'status' o 'state' desde el JSON
      dto.imageUrl,
      dto.ownerId // Mapeamos el ownerId
    );
  }

  static toDto(model: Vehicle): VehicleDto {
    const dto: any = { // Lo ponemos como 'any' para añadir ownerId
      id: model.id,
      brand: model.brand,
      model: model.model,
      year: model.year,
      pricePerDay: model.pricePerDay,
      status: model.status,
      imageUrl: model.imageUrl,
      ownerId: model.ownerId
    };
    return dto;
  }
}
