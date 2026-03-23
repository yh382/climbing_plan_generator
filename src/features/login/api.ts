import { api } from '../../lib/apiClient';
import type { AuthTokens } from './types';

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<AuthTokens>('/auth/register', data),

  forgotPassword: (email: string) =>
    api.post<{ ok: boolean }>('/auth/forgot-password', { email }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: boolean }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  appleSignIn: (identityToken: string, fullName?: string) =>
    api.post<AuthTokens>('/auth/apple', {
      identity_token: identityToken,
      full_name: fullName,
    }),
};
