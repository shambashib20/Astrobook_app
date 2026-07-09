import { apiClient } from "@/services/apiClient";
import type { ConsultationService } from "@/features/consultation/types";
import type { AstrologerProfile, AstrologerSlot } from "../types";

class AstrologersServiceApi {
  private readonly base = "/astrologers";

  // NOTE: backend sends { astrologer }, { astrologers }, { services },
  // { slots } directly — NOT wrapped in { success, data } like consultation
  // module endpoints. apiClient's return value IS this raw object.

  async getAll(): Promise<AstrologerProfile[]> {
    const res = await apiClient.get<{ astrologers: AstrologerProfile[] }>(
      this.base,
    );
    return (res as any).astrologers;
  }

  async getById(id: string): Promise<AstrologerProfile> {
    const res = await apiClient.get<{ astrologer: AstrologerProfile }>(
      `${this.base}/${id}`,
    );
    return (res as any).astrologer;
  }

  async getServices(id: string): Promise<ConsultationService[]> {
    const res = await apiClient.get<{ services: ConsultationService[] }>(
      `${this.base}/${id}/services`,
    );
    return (res as any).services;
  }

  async getSlots(id: string): Promise<AstrologerSlot[]> {
    const res = await apiClient.get<{ slots: AstrologerSlot[] }>(
      `${this.base}/${id}/slots`,
    );
    return (res as any).slots;
  }
}

export const astrologersService = new AstrologersServiceApi();
