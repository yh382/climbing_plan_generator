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

  appleSignIn: (
    identityToken: string,
    fullName?: string,
    authorizationCode?: string | null,
  ) =>
    api.post<AuthTokens>('/auth/apple', {
      identity_token: identityToken,
      full_name: fullName,
      // BE exchanges this for a refresh_token and stores it; required for
      // server-side /auth/revoke at account deletion (Apple guideline).
      authorization_code: authorizationCode ?? undefined,
    }),
};
