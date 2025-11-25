export interface UserDto {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: 'ROLE_ARRENDADOR' | 'ROLE_ARRENDATARIO';
}
