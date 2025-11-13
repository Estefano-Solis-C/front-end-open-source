export interface ReviewDto {
  id: number;
  vehicleId: number;
  userId: number;
  rating: number;
  comment: string;
  userName?: string; // Guardaremos el nombre del autor directamente en el JSON
  date: string; // La fecha se guardará como string
}
