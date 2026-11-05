import { AstroColors } from "@/constants/astro-theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import type { FavoriteItemType } from "../types";

type Props = {
  itemId: string;
  itemType?: FavoriteItemType;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

// Kahin bhi lagao — service detail, card, list. State React Query cache se
// aati hai, isliye ek jagah toggle karte hi baaki sab jagah sync ho jaata hai.
export default function FavoriteButton({
  itemId,
  itemType = "service",
  size = 20,
  style,
}: Props) {
  const { data: ids } = useFavoriteIds(itemType);
  const toggle = useToggleFavorite(itemType);
  const isFavorite = !!ids?.includes(itemId);

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
      accessibilityState={{ selected: isFavorite }}
      onPress={() => toggle.mutate({ itemId, isFavorite })}
    >
      <Ionicons
        name={isFavorite ? "heart" : "heart-outline"}
        size={size}
        color={AstroColors.brand}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
});
