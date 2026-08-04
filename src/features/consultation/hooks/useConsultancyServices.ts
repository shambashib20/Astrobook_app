import { useState } from "react";
import { Alert } from "react-native";
import { consultationService } from "../service";
import type {
  ConsultationService,
  ConsultationServiceVariant,
  CreateServicePayload,
  UpdateServicePayload,
} from "../types";

// ─── useMyServices ──────────────────────────────────────────────────────────
// List + delete — astrologer ki apni services (Basic + normal, Basic pehle)

export function useMyServices() {
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await consultationService.getMyServices();
      setServices(data);
    } catch (err: any) {
      console.log(
        "getMyServices error:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
      const msg =
        err?.response?.status === 403
          ? "Astrologer permission nahi hai (role check fail) — DB mein role='astrologer' hai ya nahi check karo"
          : err?.response?.data?.message || "Services load nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteService = async (id: string) => {
    try {
      await consultationService.deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      // Basic consultancy delete nahi ho sakti — backend BadRequestError deta hai
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Service delete nahi hui",
      );
    }
  };

  return { services, loading, refreshing, fetchServices, deleteService };
}

// ─── useCreateService ────────────────────────────────────────────────────────
// Sirf naya "normal" service banane ke liye (Basic auto-created hoti hai)

export function useCreateService(
  onSuccess?: (service: ConsultationService) => void,
) {
  const [loading, setLoading] = useState(false);

  const createService = async (dto: CreateServicePayload) => {
    if (
      !dto.title.trim() ||
      !dto.shortDescription.trim() ||
      !dto.about.trim()
    ) {
      Alert.alert("Required", "Title, description aur about zaroori hai");
      return;
    }
    if (!dto.coverImage) {
      Alert.alert("Required", "Cover image upload karo");
      return;
    }
    if (!dto.tags || dto.tags.length === 0) {
      Alert.alert("Required", "Kam se kam ek tag/category select karo");
      return;
    }
    try {
      setLoading(true);
      const service = await consultationService.createService(dto);
      onSuccess?.(service);
      return service;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Service create nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return { createService, loading };
}

// ─── useUpdateService ────────────────────────────────────────────────────────
// Kisi bhi service ka edit — title/desc/cover/about/tags (Basic ho ya
// normal). Price ab is se edit nahi hota — useUpdateServiceVariant use karo.

export function useUpdateService(
  onSuccess?: (service: ConsultationService) => void,
) {
  const [loading, setLoading] = useState(false);

  const updateService = async (id: string, dto: UpdateServicePayload) => {
    setLoading(true);
    try {
      const service = await consultationService.updateService(id, dto);
      onSuccess?.(service);
      return service;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Service update nahi hui";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return { updateService, loading };
}

// ─── useServiceVariants ────────────────────────────────────────────────────
// Ek service ke 5 fixed duration variants fetch karna — astrologer edit
// modal aur user detail page (variant selector), dono yahi use karte hain.

export function useServiceVariants(serviceId: string | null | undefined) {
  const [variants, setVariants] = useState<ConsultationServiceVariant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVariants = async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const data = await consultationService.getServiceVariants(serviceId);
      setVariants(data);
      return data;
    } catch (err: any) {
      console.log(
        "getServiceVariants error:",
        err?.response?.status,
        err?.response?.data ?? err?.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return { variants, loading, fetchVariants, setVariants };
}

// ─── useUpdateServiceVariant ────────────────────────────────────────────────
// Astrologer sirf ek variant ka price edit karta hai (duration fixed hai)

export function useUpdateServiceVariant(
  onSuccess?: (variant: ConsultationServiceVariant) => void,
) {
  const [loading, setLoading] = useState(false);

  const updateVariant = async (
    serviceId: string,
    variantId: string,
    price: number,
  ) => {
    setLoading(true);
    try {
      const variant = await consultationService.updateServiceVariant(
        serviceId,
        variantId,
        { price },
      );
      onSuccess?.(variant);
      return variant;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.[0]?.message ||
        "Price update nahi hua";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return { updateVariant, loading };
}
