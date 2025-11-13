export class Vehicle {
  public ownerName?: string; // Propiedad para el nombre del arrendador

  constructor(
    public id: number,
    public brand: string,
    public model: string,
    public year: number,
    public pricePerDay: number,
    public status: 'available' | 'rented',
    public imageUrl: string,
    public ownerId: number // Es importante tener el ownerId en el modelo
  ) {}
}
