import { toast } from "@/components/toast";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { consultationService } from "../service";
import {
  VARIANT_DURATIONS,
  type ConsultationService,
  type ConsultationServiceVariant,
  type VariantDurationMinutes,
} from "../types";
import { DEFAULT_VARIANT_PRICES, parsePrice } from "../utils/servicePricing";

export const MAX_TAGS = 5;

type Drafts = Record<number, string>; // durationMinutes → price text

export type ServiceFormErrors = Partial<{
  title: string;
  shortDescription: string;
  about: string;
  cover: string;
  tags: string;
  prices: string;
}>;

const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.response?.data?.error?.[0]?.message || fallback;

function initialDrafts(variants: ConsultationServiceVariant[] | null): Drafts {
  const d: Drafts = {};
  VARIANT_DURATIONS.forEach((dur) => {
    const v = variants?.find((x) => x.durationMinutes === dur);
    // Variant ka price "399.00" aata hai — input mein "399" dikhao
    d[dur] = v ? String(Number(v.price)) : DEFAULT_VARIANT_PRICES[dur];
  });
  return d;
}

// Create + Edit dono ka form logic ek hi jagah. Save = details + saari prices
// ek saath (pehle har price ka alag Save tha, jo confusing tha).
export function useServiceEditor(
  service: ConsultationService | null,
  onSaved: () => void,
) {
  const isEdit = !!service;
  const isBasic = !!service?.isBasic;
  const { uploadImage, uploading, progress } = useImageKitUpload();

  const base = useMemo(
    () => ({
      title: service?.title ?? "",
      shortDescription: service?.shortDescription ?? "",
      about: service?.about ?? "",
      cover: service?.coverImage ?? null,
      tags: service?.tags ?? [],
    }),
    [service?.id],
  );

  const [title, setTitle] = useState(base.title);
  const [shortDescription, setShort] = useState(base.shortDescription);
  const [about, setAbout] = useState(base.about);
  const [coverLocal, setCoverLocal] = useState<string | null>(base.cover);
  const [coverUrl, setCoverUrl] = useState<string | null>(base.cover);
  const [tags, setTags] = useState<string[]>(base.tags);

  const [variants, setVariants] = useState<ConsultationServiceVariant[] | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(isEdit);
  const [variantsError, setVariantsError] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>(initialDrafts(null));
  const [baseDrafts, setBaseDrafts] = useState<Drafts>(initialDrafts(null));

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadVariants = async () => {
    if (!service) return;
    setVariantsLoading(true);
    setVariantsError(false);
    try {
      const data = await consultationService.getServiceVariants(service.id);
      setVariants(data);
      const d = initialDrafts(data);
      setDrafts(d);
      setBaseDrafts(d);
    } catch {
      setVariantsError(true);
    } finally {
      setVariantsLoading(false);
    }
  };

  useEffect(() => {
    if (service) loadVariants();
  }, [service?.id]);

  const toggleTag = (id: string) =>
    setTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= MAX_TAGS) {
        toast.show(`You can select up to ${MAX_TAGS} categories`, "error");
        return prev;
      }
      return [...prev, id];
    });

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const prevLocal = coverLocal;
    const prevUrl = coverUrl;
    setCoverLocal(uri);
    const url = await uploadImage(uri, `service_${Date.now()}.jpg`, "/astrobook/services");
    if (url) setCoverUrl(url);
    else {
      setCoverLocal(prevLocal);
      setCoverUrl(prevUrl);
      toast.show("Image upload failed — please try again", "error");
    }
  };

  const setPrice = (duration: number, text: string) =>
    setDrafts((p) => ({ ...p, [duration]: text.replace(/[^0-9.]/g, "") }));

  const errors: ServiceFormErrors = useMemo(() => {
    const e: ServiceFormErrors = {};
    if (!title.trim()) e.title = "Enter a service name";
    if (!shortDescription.trim()) e.shortDescription = "Add a short description";
    if (!about.trim()) e.about = "Describe what the session covers";
    if (!isEdit && !coverUrl) e.cover = "Add a cover image";
    if (!isBasic && tags.length === 0) e.tags = "Select at least one category";
    if (VARIANT_DURATIONS.some((d) => parsePrice(drafts[d]) === null))
      e.prices = "Enter a valid price for each duration";
    return e;
  }, [title, shortDescription, about, coverUrl, tags, drafts, isEdit, isBasic]);

  const hasErrors = Object.keys(errors).length > 0;

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return !!(title || shortDescription || about || coverUrl || tags.length);
    }
    return (
      title !== base.title ||
      shortDescription !== base.shortDescription ||
      about !== base.about ||
      coverUrl !== base.cover ||
      tags.join() !== base.tags.join() ||
      VARIANT_DURATIONS.some((d) => drafts[d] !== baseDrafts[d])
    );
  }, [title, shortDescription, about, coverUrl, tags, drafts, baseDrafts, base, isEdit]);

  const canSave = !saving && !uploading && (isEdit ? isDirty && !variantsLoading : true);

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.show("Please fix the highlighted fields", "error");
      return;
    }
    setSaving(true);
    let target: ConsultationService | null = service;
    try {
      const details = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        about: about.trim(),
        tags,
      };
      if (service) {
        await consultationService.updateService(service.id, {
          ...details,
          ...(coverUrl && coverUrl !== base.cover ? { coverImage: coverUrl } : {}),
        });
      } else {
        target = await consultationService.createService({
          ...details,
          coverImage: coverUrl!,
        });
      }

      // Prices: sirf jo badle hain wahi bhejo
      const list = variants ?? (await consultationService.getServiceVariants(target!.id));
      const changed = list.filter((v) => {
        const next = parsePrice(drafts[v.durationMinutes as VariantDurationMinutes]);
        return next !== null && next !== Number(v.price);
      });
      for (const v of changed) {
        await consultationService.updateServiceVariant(target!.id, v.id, {
          price: parsePrice(drafts[v.durationMinutes as VariantDurationMinutes])!,
        });
      }
      toast.show(isEdit ? "Service saved" : "Service created!");
      onSaved();
    } catch (e: any) {
      // Create ho chuka ho par price step fail → service list mein dikhegi;
      // user edit se price theek kar sakta hai
      if (!service && target) {
        onSaved();
        toast.show("Service created, but some prices could not be saved — use Edit to set them again", "error");
      } else {
        toast.show(errMsg(e, "Could not save — please try again"), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    isEdit,
    isBasic,
    title, setTitle,
    shortDescription, setShort,
    about, setAbout,
    coverLocal, pickCover, uploading, progress,
    tags, toggleTag,
    drafts, setPrice,
    variants, variantsLoading, variantsError, loadVariants,
    errors, submitted,
    isDirty, canSave, saving, save,
  };
}
