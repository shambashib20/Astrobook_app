import ScreenHeader from "@/components/ScreenHeader";
import { useImageKitUpload } from "@/features/posts/hooks/usePosts";
import {
  useCreateService,
  useMyServices,
  useUpdateService,
} from "@/features/consultation/hooks/useConsultancyServices";
import {
  DURATION_OPTIONS,
  SERVICE_TAGS,
  type ConsultationService,
  type DurationMinutes,
} from "@/features/consultation/types";
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
import { SafeAreaView } from "react-native-safe-area-context";

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
  duration: 30 as DurationMinutes,
  price: "",
  coverImage: null as string | null,
  coverImageUrl: null as string | null,
  tags: [] as string[],
};

export default function ServicesScreen() {
  const [activeKind, setActiveKind] = useState<ServiceKind>("consultancy");

  const {
    services,
    loading: servicesLoading,
    fetchServices,
    deleteService,
  } = useMyServices();
  const { uploadImage, uploading } = useImageKitUpload();

  const basicService = services.find((s) => s.isBasic) ?? null;
  const normalServices = services.filter((s) => !s.isBasic);

  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { createService, loading: creating } = useCreateService(() => {
    fetchServices();
    setShowComposer(false);
    setForm(emptyForm);
  });
  const { updateService, loading: updating } = useUpdateService(() => {
    fetchServices();
    setShowComposer(false);
    setEditingId(null);
    setForm(emptyForm);
  });

  const [showBasicEdit, setShowBasicEdit] = useState(false);
  const [basicDuration, setBasicDuration] = useState<DurationMinutes>(30);
  const [basicPrice, setBasicPrice] = useState("");
  const { updateService: updateBasic, loading: savingBasic } = useUpdateService(
    () => {
      fetchServices();
      setShowBasicEdit(false);
    },
  );

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowComposer(true);
  };

  const openEditModal = (service: ConsultationService) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      shortDescription: service.shortDescription,
      about: service.about,
      duration: service.durationMinutes as DurationMinutes,
      price: service.price ?? "",
      coverImage: service.coverImage,
      coverImageUrl: service.coverImage,
      tags: service.tags,
    });
    setShowComposer(true);
  };

  const openBasicEdit = () => {
    if (!basicService) return;
    setBasicDuration(basicService.durationMinutes as DurationMinutes);
    setBasicPrice(basicService.price ?? "");
    setShowBasicEdit(true);
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

  const handleSaveNormalService = async () => {
    if (!form.coverImageUrl) {
      Alert.alert("Required", "Cover image upload karo pehle");
      return;
    }
    const payload = {
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      about: form.about.trim(),
      coverImage: form.coverImageUrl,
      durationMinutes: form.duration,
      price: form.price ? Number(form.price) : undefined,
      tags: form.tags,
    };

    if (editingId) {
      await updateService(editingId, payload);
    } else {
      await createService(payload);
    }
  };

  const handleSaveBasic = async () => {
    if (!basicService) return;
    await updateBasic(basicService.id, {
      durationMinutes: basicDuration,
      price: basicPrice ? Number(basicPrice) : undefined,
    });
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
            onPress={openBasicEdit}
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
              <View style={styles.serviceChips}>
                <View style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>
                    ⏱ {basicService.durationMinutes} min
                  </Text>
                </View>
                {basicService.price && (
                  <View style={styles.serviceChip}>
                    <Text style={styles.serviceChipText}>
                      ₹{basicService.price}
                    </Text>
                  </View>
                )}
              </View>
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
              "+ Add Service" se apni pehli service banao
            </Text>
          </View>
        ) : (
          normalServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => openEditModal(service)}
              activeOpacity={0.7}
            >
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
                  <View style={styles.serviceChip}>
                    <Text style={styles.serviceChipText}>
                      ⏱ {service.durationMinutes} min
                    </Text>
                  </View>
                  {service.price && (
                    <View style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>
                        ₹{service.price}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.serviceDeleteBtn}
                onPress={() => confirmDelete(service)}
              >
                <Text style={styles.serviceDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Create/Edit Normal Service Modal ── */}
      <Modal
        visible={showComposer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.composerCard}
            contentContainerStyle={{ gap: 12 }}
          >
            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>
                {editingId ? "Edit Service" : "Create Service"}
              </Text>
              <TouchableOpacity onPress={() => setShowComposer(false)}>
                <Text style={styles.composerClose}>✕</Text>
              </TouchableOpacity>
            </View>

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

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.chipsRow}>
              {DURATION_OPTIONS.map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.selectChip,
                    form.duration === mins && styles.selectChipActive,
                  ]}
                  onPress={() => setForm((p) => ({ ...p, duration: mins }))}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      form.duration === mins && styles.selectChipTextActive,
                    ]}
                  >
                    {mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="999"
              placeholderTextColor="#9CA3AF"
              value={form.price}
              onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
              keyboardType="numeric"
            />

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
                  {editingId ? "Save Changes" : "Create Service ✨"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Basic Consultancy Modal ── */}
      <Modal
        visible={showBasicEdit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBasicEdit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.composerCardSmall}>
            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>Edit Basic Consultation</Text>
              <TouchableOpacity onPress={() => setShowBasicEdit(false)}>
                <Text style={styles.composerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.basicEditNote}>
              Basic consultation ka sirf price aur duration edit ho sakta hai —
              yeh platform ne auto-create ki thi.
            </Text>

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.chipsRow}>
              {DURATION_OPTIONS.map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.selectChip,
                    basicDuration === mins && styles.selectChipActive,
                  ]}
                  onPress={() => setBasicDuration(mins)}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      basicDuration === mins && styles.selectChipTextActive,
                    ]}
                  >
                    {mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Price (₹)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="199"
              placeholderTextColor="#9CA3AF"
              value={basicPrice}
              onChangeText={setBasicPrice}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[
                styles.publishBtn,
                savingBasic && styles.publishBtnDisabled,
                { marginTop: 16 },
              ]}
              onPress={handleSaveBasic}
              disabled={savingBasic}
            >
              {savingBasic ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.publishBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
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
});
