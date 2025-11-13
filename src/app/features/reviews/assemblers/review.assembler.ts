import { Review } from '../models/review.model';
import { ReviewDto } from '../models/review.dto';

export class ReviewAssembler {
  static toModel(dto: ReviewDto): Review {
    const model = new Review(
      dto.id,
      dto.vehicleId,
      dto.userId,
      dto.rating,
      dto.comment
    );
    model.userName = dto.userName;
    model.date = new Date(dto.date);
    return model;
  }

  static toDto(model: Review): ReviewDto {
    return {
      id: model.id,
      vehicleId: model.vehicleId,
      userId: model.userId,
      rating: model.rating,
      comment: model.comment,
      userName: model.userName,
      date: model.date.toISOString() // Convertir la fecha a string
    };
  }
}
