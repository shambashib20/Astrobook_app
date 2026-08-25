import { apiClient } from "@/services/apiClient";

export type UserProfile = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  dateOfBirth: string | null;
  role: "user" | "astrologer" | "admin";
  interests: string[] | null;
  isOnboarded: boolean;
  isAstrologer: boolean;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  name?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  interests?: string[];
  avatarUrl?: string;
  bio?: string;
};

class UsersServiceApi {
  // NOTE: /users/me backend routes return the raw profile object directly —
  // NOT wrapped in { success, data } like consultation/posts endpoints do.
  // So the apiClient call's result IS the profile itself, not `.data`.
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>("/users/me");
    return res as unknown as UserProfile;
  }

  async updateProfile(dto: UpdateProfilePayload): Promise<UserProfile> {
    const res = await apiClient.patch<UserProfile>("/users/me", dto);
    return res as unknown as UserProfile;
  }

  async registerPushToken(
    expoPushToken: string,
    platform?: "ios" | "android",
  ): Promise<void> {
    await apiClient.post("/users/me/push-token", { expoPushToken, platform });
  }

  // ── Phone verification (Google-login users, onboarding ke andar) ──────────
  // Phone-login users ko yeh call karne ki zaroorat nahi — unka phone
  // already login ke time se account mein set hota hai.

  async sendPhoneOtp(phone: string): Promise<{ debugOtp?: string }> {
    const res = await apiClient.post<{ debugOtp?: string }>(
      "/users/me/phone/send-otp",
      { phone },
    );
    return { debugOtp: res.data?.debugOtp };
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<UserProfile> {
    const res = await apiClient.post<{ user: UserProfile }>(
      "/users/me/phone/verify-otp",
      { phone, otp },
    );
    return (res as any).user as UserProfile;
  }
}

export const usersService = new UsersServiceApi();