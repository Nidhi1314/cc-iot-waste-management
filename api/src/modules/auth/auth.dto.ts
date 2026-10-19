import { z } from 'zod';

export const loginSchema = z.object({
  userCode: z.string().min(1, 'User code is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export interface JwtPayload {
  sub: string;
  userCode: string;
  role: 'ADMIN' | 'DRIVER';
}

export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  userCode: z.string().min(1),
  role: z.enum(['ADMIN', 'DRIVER']),
});

export interface loginResponse {
  accessToken: string;
  user: {
    id: string;
    userCode: string;
    role: 'ADMIN' | 'DRIVER';
  };
}
