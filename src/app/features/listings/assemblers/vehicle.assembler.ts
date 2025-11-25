import Vehicle from '../models/vehicle.model';
import {VehicleDto} from '../models/vehicle.dto';

export class VehicleAssembler {
  static toModel(dto: VehicleDto): Vehicle {
    return new Vehicle(
      dto.id,
      dto.brand,
      dto.model,
      dto.year,
      dto.pricePerDay,
      dto.status,
      dto.imageUrl,
      dto.ownerId
    );
  }

  static toDto(model: Vehicle): VehicleDto {
    return {
      id: model.id,
      brand: model.brand,
      model: model.model,
      year: model.year,
      pricePerDay: model.pricePerDay,
      status: model.status,
      imageUrl: model.imageUrl,
      ownerId: model.ownerId
    };
  }
}
