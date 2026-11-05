import {
  AstroColors,
  AstroRadius,
  AstroType,
  MIN_TOUCH,
} from "@/constants/astro-theme";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDeleteReview, useSubmitReview } from "../hooks/useReviews";
import type { MyReview } from "../types";
import { ratingLabel, StarPicker } from "./Stars";

export type ReviewTarget = {
  appointmentId: string;
  astrologerId: string;
  astrologerName?: string | null;
  existing?: MyReview;
};

const MAX = 1000;

// Bottom-sheet: star chuno + optional comment. Pehle se review hai to edit
// mode (pre-filled) aur "Review hatao" option.
export default function ReviewModal({
  target,
  onClose,
}: {
  target: ReviewTarget | null;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = useSubmitReview();
  const remove = useDeleteReview();

  useEffect(() => {
    setRating(target?.existing?.rating ?? 0);
    setComment(target?.existing?.comment ?? "");
  }, [target?.appointmentId, target?.existing?.id]);

  if (!target) return null;
  const isEdit = !!target.existing;
  const busy = submit.isPending || remove.isPending;

  const onSave = () => {
    if (rating < 1 || busy) return;
    submit.mutate(
      {
        appointmentId: target.appointmentId,
        astrologerId: target.astrologerId,
        rating,
        comment,
      },
      { onSuccess: onClose },
    );
  };

  const onDelete = () => {
    if (busy) return;
    remove.mutate(
      { appointmentId: target.appointmentId, astrologerId: target.astrologerId },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>
            {isEdit ? "Update your rating" : "How was your session?"}
          </Text>
          {target.astrologerName ? (
            <Text style={styles.sub}>with {target.astrologerName}</Text>
          ) : null}

          <View style={styles.pickerWrap}>
            <StarPicker value={rating} onChange={setRating} />
            <Text style={styles.ratingText}>
              {rating > 0 ? ratingLabel(rating) : "Tap a star to rate"}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment (optional)"
            placeholderTextColor={AstroColors.textMuted}
            multiline
            maxLength={MAX}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {comment.length}/{MAX}
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, (rating < 1 || busy) && styles.saveBtnOff]}
            disabled={rating < 1 || busy}
            onPress={onSave}
            accessibilityRole="button"
          >
            {submit.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveText}>
                {isEdit ? "Update" : "Submit"}
              </Text>
            )}
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity
              style={styles.deleteBtn}
              disabled={busy}
              onPress={onDelete}
              accessibilityRole="button"
            >
              {remove.isPending ? (
                <ActivityIndicator color={AstroColors.danger} />
              ) : (
                <Text style={styles.deleteText}>Remove Review</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,29,91,0.45)" },
  sheet: {
    backgroundColor: AstroColors.surface,
    borderTopLeftRadius: AstroRadius.xl,
    borderTopRightRadius: AstroRadius.xl,
    padding: 20,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AstroColors.border,
    marginBottom: 14,
  },
  title: { ...AstroType.title, color: AstroColors.ink, textAlign: "center" },
  sub: {
    ...AstroType.caption,
    color: AstroColors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  pickerWrap: { alignItems: "center", marginVertical: 18, gap: 8 },
  ratingText: { ...AstroType.body, color: AstroColors.brand, fontWeight: "700" },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: AstroColors.border,
    backgroundColor: AstroColors.canvas,
    borderRadius: AstroRadius.md,
    padding: 12,
    fontSize: 14,
    color: AstroColors.text,
  },
  counter: {
    ...AstroType.micro,
    color: AstroColors.textMuted,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 12,
  },
  saveBtn: {
    minHeight: MIN_TOUCH,
    borderRadius: AstroRadius.pill,
    backgroundColor: AstroColors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnOff: { opacity: 0.45 },
  saveText: { ...AstroType.button, color: AstroColors.onBrand },
  deleteBtn: {
    minHeight: MIN_TOUCH,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  deleteText: { ...AstroType.body, color: AstroColors.danger, fontWeight: "700" },
});
