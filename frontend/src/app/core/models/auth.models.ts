export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
}
