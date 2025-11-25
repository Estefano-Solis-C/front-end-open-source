class Vehicle {
  public ownerName?: string;

  constructor(
    public id: number,
    public brand: string,
    public model: string,
    public year: number,
    public pricePerDay: number,
    public status: 'available' | 'rented',
    public imageUrl: string,
    public ownerId: number
  ) {}
}

export default Vehicle
