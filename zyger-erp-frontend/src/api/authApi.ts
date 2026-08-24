import apiClient from './axiosClient';

export interface LoginRequest { username: string; password: string; }
export interface SignupRequest { displayName: string; username: string; email: string; password: string; }
export interface ForgotPasswordRequest { email: string; }
export interface AuthResponse { token: string; username: string; role: string; }
export interface SignupResponse { message: string; username: string; }
export interface MessageResponse { message: string; }

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(res => res.data),
  signup: (data: SignupRequest) =>
    apiClient.post<SignupResponse>('/auth/signup', data).then(res => res.data),
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', data).then(res => res.data),
};
