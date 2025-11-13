export class Booking {
  constructor(
    public id: number,
    public vehicleId: number,
    public userId: number,
    public startDate: Date,
    public endDate: Date,
    public totalPrice: number,
    public status: string
  ) {}
}
