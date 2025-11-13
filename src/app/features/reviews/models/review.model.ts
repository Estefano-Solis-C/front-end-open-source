export class Review {
  public userName?: string; // Nombre del autor para mostrar en la UI
  public date: Date;

  constructor(
    public id: number,
    public vehicleId: number,
    public userId: number,
    public rating: number,
    public comment: string
  ) {
    this.date = new Date();
  }
}
