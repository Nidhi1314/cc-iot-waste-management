import { apiRequest } from '../../lib/api-client';
import type { LoginRequest, LoginResponse } from '../../types/api';

export function login(payload: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}
