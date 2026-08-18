import ScreenHeader from "@/components/ScreenHeader";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { useUser } from "@/features/auth/store/auth.store";
import {
  useCreateService,
  useMyServices,
  useServiceVariants,
  useUpdateService,
  useUpdateServiceVariant,
} from "@/features/consultation/hooks/useConsultancyServices";
import {
  SERVICE_TAGS,
  VARIANT_DURATION_LABELS,
  VARIANT_DURATIONS,
  type ConsultationService,
  type ConsultationServiceVariant,
} from "@/features/consultation/types";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type ServiceKind = "consultancy" | "courses" | "products";

const KINDS: { key: ServiceKind; label: string; enabled: boolean }[] = [
  { key: "consultancy", label: "Consultancy", enabled: true },
  { key: "courses", label: "Courses", enabled: false },
  { key: "products", label: "Products", enabled: false },
];

const emptyForm = {
  title: "",
  shortDescription: "",
  about: "",
  coverImage: null as string | null,
  coverImageUrl: null as string | null,
  tags: [] as string[],
};

// 30-min variant ka price hi card pe "starting from" ke tarah dikhta hai
function defaultVariantPrice(service: ConsultationService): string | null {
  const def = service.variants?.find((v) => v.isDefault);
  return def?.price ?? service.price ?? null;
}

// Amount se platform commission kaat ke astrologer ka payout nikalta hai
function computeEarningsBreakup(amount: number, commissionPercentage: number) {
  const commissionAmount = (amount * commissionPercentage) / 100;
  const payoutAmount = amount - commissionAmount;
  return { commissionAmount, payoutAmount };
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const [activeKind, setActiveKind] = useState<ServiceKind>("consultancy");

  // Har astrologer ka apna commissionPercentage — dynamically unke khud ke
  // profile se aata hai, isliye price breakup automatically har astrologer
  // ke liye alag/correct hota hai
  const currentUser = useUser();
  const { astrologer: ownProfile } = useAstrologerProfile(currentUser?.id);
  const commissionPercentage = ownProfile?.meta?.commissionPercentage ?? 0;

  const {
    services,
    loading: servicesLoading,
    fetchServices,
    deleteService,
  } = useMyServices();
  const { uploadImage, uploading } = useImageKitUpload();

  const basicService = services.find((s) => s.isBasic) ?? null;
  const normalServices = services.filter((s) => !s.isBasic);

  // ── Ek hi unified Edit modal — details (title/desc/about/cover/tags) AND
  // niche 5 duration+price rows, dono same form mein. Basic ho ya normal,
  // dono isi flow se edit hote hain.
  const [showComposer, setShowComposer] = useState(false);
  // null = naya service create ho raha hai; kisi service pe set hone ka
  // matlab edit mode — usi ke variants bhi neeche load ho jaate hain
  const [editingService, setEditingService] =
    useState<ConsultationService | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { createService, loading: creating } = useCreateService((service) => {
    fetchServices();
    // Create hote hi seedha isi service ke edit-mode mein switch — taaki
    // astrologer turant niche apni 5 variant prices bhi set kar sake,
    // form band karne/dobara kholne ki zaroorat nahi.
    setEditingService(service);
  });
  const { updateService, loading: updating } = useUpdateService((service) => {
    fetchServices();
    setEditingService(service);
  });

  const {
    variants,
    loading: variantsLoading,
    fetchVariants,
    setVariants,
  } = useServiceVariants(editingService?.id);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const { updateVariant, loading: savingVariant } = useUpdateServiceVariant();
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (!editingService) {
      setVariants([]);
      setPriceDrafts({});
      return;
    }
    fetchVariants().then((data) => {
      if (data) {
        const drafts: Record<string, string> = {};
        data.forEach((v) => (drafts[v.id] = v.price));
        setPriceDrafts(drafts);
      }
    });
  }, [editingService?.id]);

  const openCreateModal = () => {
    setEditingService(null);
    setForm(emptyForm);
    setShowComposer(true);
  };

  const openEditModal = (service: ConsultationService) => {
    setEditingService(service);
    setForm({
      title: service.title,
      shortDescription: service.shortDescription,
      about: service.about,
      coverImage: service.coverImage,
      coverImageUrl: service.coverImage,
      tags: service.tags,
    });
    setShowComposer(true);
  };

  const toggleTag = (tagId: string) => {
    setForm((prev) => {
      const has = prev.tags.includes(tagId);
      if (has) return { ...prev, tags: prev.tags.filter((t) => t !== tagId) };
      if (prev.tags.length >= 5) {
        Alert.alert("Limit", "Max 5 tags select kar sakte ho");
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tagId] };
    });
  };

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setForm((prev) => ({ ...prev, coverImage: uri }));

    const url = await uploadImage(
      uri,
      `service_${Date.now()}.jpg`,
      "/astrobook/services",
    );
    if (url) setForm((prev) => ({ ...prev, coverImageUrl: url }));
    else setForm((prev) => ({ ...prev, coverImage: null }));
  };

  const closeComposer = () => {
    setShowComposer(false);
    setEditingService(null);
    setForm(emptyForm);
  };

  const handleSaveNormalService = async () => {
    // Cover sirf naya service banate waqt zaroori hai. Edit mode mein
    // (Basic consultancy ka toh cover hota hi nahi) required nahi.
    if (!editingService && !form.coverImageUrl) {
      Alert.alert("Required", "Cover image upload karo pehle");
      return;
    }

    if (editingService) {
      await updateService(editingService.id, {
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        about: form.about.trim(),
        ...(form.coverImageUrl && { coverImage: form.coverImageUrl }),
        tags: form.tags,
      });
    } else {
      await createService({
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        about: form.about.trim(),
        coverImage: form.coverImageUrl!,
        tags: form.tags,
      });
    }
  };

  const handleSaveVariantPrice = async (
    variant: ConsultationServiceVariant,
  ) => {
    if (!editingService) return;
    const draft = priceDrafts[variant.id];
    const price = Number(draft);
    if (!draft || isNaN(price) || price <= 0) {
      Alert.alert("Invalid", "Sahi price daalo");
      return;
    }
    setSavingVariantId(variant.id);
    const updated = await updateVariant(editingService.id, variant.id, price);
    setSavingVariantId(null);
    if (updated) {
      setVariants((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v)),
      );
      // List screen pe bhi price turant reflect ho (default variant hai toh)
      fetchServices();
    }
  };

  const confirmDelete = (service: ConsultationService) => {
    Alert.alert(
      "Delete Service",
      `"${service.title}" delete karna chahte ho?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteService(service.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="🔮 My Services"
        subtitle="Apni consultancy, courses aur products manage karo"
      />

      {/* ── Kind Selector ── */}
      <View style={styles.kindRow}>
        {KINDS.map((k) => (
          <TouchableOpacity
            key={k.key}
            style={[
              styles.kindTab,
              activeKind === k.key && styles.kindTabActive,
              !k.enabled && styles.kindTabDisabled,
            ]}
            onPress={() => {
              if (!k.enabled) {
                Alert.alert("Coming Soon", `${k.label} jald aa raha hai!`);
                return;
              }
              setActiveKind(k.key);
            }}
          >
            <Text
              style={[
                styles.kindTabText,
                activeKind === k.key && styles.kindTabTextActive,
              ]}
            >
              {k.label}
              {!k.enabled ? " (Soon)" : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Basic Consultancy ── */}
        <Text style={styles.sectionTitle}>⭐ Basic Consultation</Text>
        {servicesLoading ? (
          <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
        ) : basicService ? (
          <TouchableOpacity
            style={styles.basicCard}
            onPress={() => openEditModal(basicService)}
            activeOpacity={0.7}
          >
            <View style={styles.basicIconBox}>
              <Text style={styles.basicIcon}>⭐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.basicTitle}>{basicService.title}</Text>
              <Text style={styles.basicDesc} numberOfLines={1}>
                {basicService.shortDescription}
              </Text>
              <Text style={styles.variantHint}>
                5 duration options · 30 min se ₹
                {defaultVariantPrice(basicService) ?? "—"}
              </Text>
            </View>
            <Text style={styles.editHint}>Edit ✏️</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Basic consultancy nahi mili — dobara login try karo
            </Text>
          </View>
        )}

        {/* ── Normal Services ── */}
        <View style={styles.servicesSectionHeader}>
          <Text style={styles.sectionTitle}>My Consultancy Services</Text>
          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={openCreateModal}
          >
            <Text style={styles.addServiceBtnText}>+ Add Service</Text>
          </TouchableOpacity>
        </View>

        {servicesLoading ? (
          <ActivityIndicator color="#9d0399" style={{ marginTop: 12 }} />
        ) : normalServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔮</Text>
            <Text style={styles.emptyText}>Koi service nahi hai abhi</Text>
            <Text style={styles.emptySubtext}>
              "+ Add Service" se apni pehli service banao — 5 duration variants
              apne aap ban jaayenge
            </Text>
          </View>
        ) : (
          normalServices.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              {service.coverImage && (
                <Image
                  source={{ uri: service.coverImage }}
                  style={styles.serviceImage}
                />
              )}
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>
                  {service.shortDescription}
                </Text>
                <View style={styles.serviceChips}>
                  {service.tags.slice(0, 2).map((tag) => {
                    const label =
                      SERVICE_TAGS.find((t) => t.id === tag)?.label ?? tag;
                    return (
                      <View key={tag} style={styles.serviceChip}>
                        <Text style={styles.serviceChipText}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.variantHint}>
                  5 duration options · 30 min se ₹
                  {defaultVariantPrice(service) ?? "—"}
                </Text>
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => openEditModal(service)}
                  >
                    <Text style={styles.cardActionText}>Edit ✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.serviceDeleteBtn}
                onPress={() => confirmDelete(service)}
              >
                <Text style={styles.serviceDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Unified Create/Edit Modal — details form + (edit mode mein)
          niche 5 duration/price rows, sab ek hi form mein ── */}
      <Modal
        visible={showComposer}
        animationType="slide"
        transparent
        onRequestClose={closeComposer}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.composerCard}
            contentContainerStyle={{
              gap: 12,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>
                {editingService ? "Edit Service" : "Create Service"}
              </Text>
              <TouchableOpacity onPress={closeComposer}>
                <Text style={styles.composerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!editingService && (
              <Text style={styles.basicEditNote}>
                Service create hote hi 5 duration variants (10/30/45 min, 1 hr,
                1.5 hr) apne aap ban jaayenge, default prices ke saath — baad
                mein "Prices" se har ek edit kar sakte ho.
              </Text>
            )}

            <Text style={styles.fieldLabel}>Service Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Kundli Reading"
              placeholderTextColor="#9CA3AF"
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              maxLength={255}
            />

            <Text style={styles.fieldLabel}>Short Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Deep insights into your birth chart..."
              placeholderTextColor="#9CA3AF"
              value={form.shortDescription}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, shortDescription: v }))
              }
              maxLength={500}
              multiline
            />

            <Text style={styles.fieldLabel}>About (detailed)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Is service mein kya milega, detail mein likho..."
              placeholderTextColor="#9CA3AF"
              value={form.about}
              onChangeText={(v) => setForm((p) => ({ ...p, about: v }))}
              multiline
            />

            <Text style={styles.fieldLabel}>Cover Image</Text>
            <TouchableOpacity
              style={styles.imagePickerBox}
              onPress={pickCoverImage}
              disabled={uploading}
            >
              {form.coverImage ? (
                <Image
                  source={{ uri: form.coverImage }}
                  style={styles.coverPreview}
                />
              ) : (
                <Text style={styles.imagePickerText}>
                  {uploading ? "Uploading..." : "📷 Tap to upload cover image"}
                </Text>
              )}
              {uploading && (
                <ActivityIndicator
                  color="#9d0399"
                  style={StyleSheet.absoluteFill}
                />
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>
              Tags / Categories ({form.tags.length}/5)
            </Text>
            <View style={styles.chipsRow}>
              {SERVICE_TAGS.map((tag) => {
                const isSelected = form.tags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.selectChip,
                      isSelected && styles.selectChipActive,
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text
                      style={[
                        styles.selectChipText,
                        isSelected && styles.selectChipTextActive,
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Pricing — sirf edit mode mein (naya service create hote
                hi variants auto-create ho jaate hain, phir yeh section
                turant dikhne lagta hai) ── */}
            {editingService && (
              <>
                <Text style={styles.fieldLabel}>
                  Pricing — 5 duration options
                </Text>
                <Text style={styles.basicEditNote}>
                  Duration fixed hai — sirf price edit ho sakta hai. 30 min wala
                  default hai, user detail page pe wahi pehle se selected rehta
                  hai.
                </Text>
                {variantsLoading ? (
                  <ActivityIndicator color="#9d0399" style={{ marginTop: 4 }} />
                ) : (
                  <View style={{ gap: 10 }}>
                    {VARIANT_DURATIONS.map((duration) => {
                      const variant = variants.find(
                        (v) => v.durationMinutes === duration,
                      );
                      if (!variant) return null;
                      const dirty =
                        priceDrafts[variant.id] !== undefined &&
                        priceDrafts[variant.id] !== variant.price;
                      const draftValue =
                        priceDrafts[variant.id] ?? variant.price;
                      const draftAmount = Number(draftValue);
                      const hasValidAmount =
                        draftValue !== "" && !isNaN(draftAmount);
                      const { commissionAmount, payoutAmount } = hasValidAmount
                        ? computeEarningsBreakup(
                            draftAmount,
                            commissionPercentage,
                          )
                        : { commissionAmount: 0, payoutAmount: 0 };
                      return (
                        <View key={variant.id} style={{ gap: 6 }}>
                          <View style={styles.variantRow}>
                            <View style={styles.variantDurationBox}>
                              <Text style={styles.variantDurationText}>
                                {VARIANT_DURATION_LABELS[duration]}
                              </Text>
                              {variant.isDefault && (
                                <Text style={styles.variantDefaultBadge}>
                                  Default
                                </Text>
                              )}
                            </View>
                            <View style={styles.variantPriceInputWrap}>
                              <Text style={styles.variantRupeeSign}>₹</Text>
                              <TextInput
                                style={styles.variantPriceInput}
                                value={priceDrafts[variant.id] ?? variant.price}
                                onChangeText={(v) =>
                                  setPriceDrafts((p) => ({
                                    ...p,
                                    [variant.id]: v,
                                  }))
                                }
                                keyboardType="numeric"
                              />
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.variantSaveBtn,
                                !dirty && styles.variantSaveBtnDisabled,
                              ]}
                              disabled={!dirty || savingVariant}
                              onPress={() => handleSaveVariantPrice(variant)}
                            >
                              {savingVariant &&
                              savingVariantId === variant.id ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={styles.variantSaveBtnText}>
                                  Save
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                          {hasValidAmount && (
                            <View style={styles.breakupBox}>
                              <Text style={styles.breakupText}>
                                Platform fee ({commissionPercentage}%): ₹
                                {commissionAmount.toFixed(2)}
                              </Text>
                              <Text style={styles.breakupPayoutText}>
                                You get: ₹{payoutAmount.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={[
                styles.publishBtn,
                (creating || updating || uploading) &&
                  styles.publishBtnDisabled,
              ]}
              onPress={handleSaveNormalService}
              disabled={creating || updating || uploading}
            >
              {creating || updating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.publishBtnText}>
                  {editingService ? "Save Details" : "Create Service ✨"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9F5FF" },

  kindRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9F5FF",
  },
  kindTab: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  kindTabActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  kindTabDisabled: { opacity: 0.5 },
  kindTabText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  kindTabTextActive: { color: "#FFF" },

  content: { padding: 16, gap: 12 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 8,
  },
  servicesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  addServiceBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addServiceBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDE9FF",
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },

  basicCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F5D57A",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    elevation: 2,
  },
  basicIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  basicIcon: { fontSize: 20 },
  basicTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A2E" },
  basicDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  variantHint: {
    fontSize: 11,
    color: "#9d0399",
    fontWeight: "700",
    marginTop: 4,
  },
  editHint: { fontSize: 12, color: "#9d0399", fontWeight: "700" },

  serviceCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FF",
    overflow: "hidden",
    flexDirection: "row",
    elevation: 2,
  },
  serviceImage: { width: 90, height: 90 },
  serviceInfo: { flex: 1, padding: 12, gap: 6 },
  serviceTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A2E" },
  serviceDesc: { fontSize: 12, color: "#6B7280" },
  serviceChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  serviceChip: {
    backgroundColor: "#F5F0FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  serviceChipText: { fontSize: 11, color: "#6B21A8", fontWeight: "600" },
  cardActionsRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  cardActionBtn: { paddingVertical: 2 },
  cardActionText: { fontSize: 12, color: "#9d0399", fontWeight: "700" },
  serviceDeleteBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  serviceDeleteText: { fontSize: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  composerCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  composerCardSmall: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 10,
    maxHeight: "80%",
  },
  composerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  composerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  composerClose: { fontSize: 18, color: "#9CA3AF", padding: 4 },
  basicEditNote: { fontSize: 12, color: "#9CA3AF", marginBottom: 4 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  input: {
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip: {
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    backgroundColor: "#F9F5FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectChipActive: { backgroundColor: "#9d0399", borderColor: "#9d0399" },
  selectChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  selectChipTextActive: { color: "#FFF" },

  imagePickerBox: {
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    borderStyle: "dashed",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePickerText: { color: "#9d0399", fontWeight: "600", fontSize: 13 },
  coverPreview: { width: "100%", height: "100%" },

  publishBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#9d0399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  publishBtnDisabled: {
    backgroundColor: "#D1D5DB",
    elevation: 0,
    shadowOpacity: 0,
  },
  publishBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  // ── Variant price editor rows ──
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
  },
  variantDurationBox: { width: 70 },
  variantDurationText: { fontSize: 13, fontWeight: "800", color: "#1A1A2E" },
  variantDefaultBadge: {
    fontSize: 9,
    color: "#9d0399",
    fontWeight: "700",
    marginTop: 2,
  },
  variantPriceInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#EDE9FF",
    paddingHorizontal: 10,
  },
  variantRupeeSign: { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },
  variantPriceInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "700",
  },
  variantSaveBtn: {
    backgroundColor: "#9d0399",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  variantSaveBtnDisabled: { backgroundColor: "#D1D5DB" },
  variantSaveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  // ── Astrologer earnings breakup (price minus platform commission) ──
  breakupBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F0FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 80,
  },
  breakupText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  breakupPayoutText: { fontSize: 12, color: "#0F9D58", fontWeight: "800" },
});