import { Booking } from '../models/booking.model';
import { BookingDto } from '../models/booking.dto';

export class BookingAssembler {
  static toModel(dto: BookingDto): Booking {
    return new Booking(
      dto.id,
      dto.vehicleId,
      dto.renterId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.totalPrice,
      dto.status
    );
  }
}
