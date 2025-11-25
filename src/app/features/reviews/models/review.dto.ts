export interface ReviewDto {
  id: number;
  vehicleId: number;
  renterId: number;
  rating: number;
  comment: string;
  userName?: string;
  date: string;
}
