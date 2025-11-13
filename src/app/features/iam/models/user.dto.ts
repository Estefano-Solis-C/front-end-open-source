export interface UserDto {
  id?: number; // El ID es opcional al crear
  name: string;
  email: string;
  password: string; // En una app real, esto se manejaría de forma segura (hash)
  role: 'ROLE_ARRENDADOR' | 'ROLE_ARRENDATARIO';
}
