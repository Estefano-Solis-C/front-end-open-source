import Vehicle from '../models/vehicle.model';
import { VehicleDto } from '../models/vehicle.dto';

/**
 * @summary Maps Vehicle DTOs to domain models and vice versa.
 */
export class VehicleAssembler {
  /**
   * @summary Convert an API DTO to a Vehicle domain model.
   * @param dto - The raw DTO from the API.
   * @returns Vehicle domain model instance.
   */
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

  /**
   * @summary Convert a Vehicle domain model to an API DTO.
   * @param model - The Vehicle domain model.
   * @returns DTO ready to be sent to the API.
   */
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
