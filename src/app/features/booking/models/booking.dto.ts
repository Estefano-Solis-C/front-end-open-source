export interface BookingDto {
  id: number;
  vehicleId: number;
  renterId: number;
  ownerId: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}
