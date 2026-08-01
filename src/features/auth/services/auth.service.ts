import { AuthResult, AuthUser } from "@/features/auth/store/auth.store";
import { apiClient } from "@/services/apiClient";

export type OnboardPayload = {
  name: string;
  email?: string;
  dateOfBirth?: string;
  interests?: string[];
};

class AuthService {
  async getOtp(phone: string): Promise<{ debugOtp?: string }> {
    const res = await apiClient.post<{ debugOtp?: string }>(
      "/auth/send-otp",
      { phone },
      { withToken: false },
    );
    return { debugOtp: res.data?.debugOtp };
  }

  async verifyOtp(phone: string, otp: string): Promise<AuthResult> {
    const res = await apiClient.post<AuthResult>(
      "/auth/verify-otp",
      { phone, otp },
      { withToken: false },
    );
    return res.data;
  }

  async googleLogin(idToken: string): Promise<AuthResult> {
    const res = await apiClient.post<AuthResult>(
      "/auth/google",
      { idToken },
      { withToken: false },
    );
    return res.data;
  }

  async onboard(payload: OnboardPayload): Promise<void> {
    const res = await apiClient.post<{ user: AuthUser }>(
      "/users/onboarding",
      payload,
    );
  }

  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<{ user: AuthUser }>("/auth/me");
    return res.data.user;
  }

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post("/auth/logout", { refreshToken });
  }
}

export const authService = new AuthService();