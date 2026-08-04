import { apiClient } from "@/services/apiClient";
import type {
    AstrologerApplicationStatus,
    SubmitAstrologerApplicationPayload,
} from "../types";

class AstrologerApplicationServiceApi {
  // NOTE: /users/* routes yahan bhi raw object return karte hain, jaise
  // /users/me karta hai — { success, data } wrapper nahi hai.

  async getStatus(): Promise<AstrologerApplicationStatus> {
    const res = await apiClient.get<AstrologerApplicationStatus>(
      "/users/me/astrologer-application",
    );
    return res as unknown as AstrologerApplicationStatus;
  }

  async submit(
    payload: SubmitAstrologerApplicationPayload,
  ): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(
      "/users/request-astrologer-upgrade",
      payload,
    );
    return res as unknown as { message: string };
  }
}

export const astrologerApplicationService = new AstrologerApplicationServiceApi();