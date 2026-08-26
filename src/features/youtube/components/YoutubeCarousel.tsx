import { Image as ExpoImage } from "expo-image";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useYoutubeVideos } from "../hooks/useYoutubeVideos";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function YoutubeCarousel({ limit = 3 }: { limit?: number }) {
  const { videos } = useYoutubeVideos(limit);
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (videos.length === 0) return null;

  const onSlideChange = (e: any) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / (SCREEN_WIDTH * 0.62),
    );
    setActiveSlide(index);
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  return (
    <View style={styles.sliderSection}>
      <FlatList
        ref={flatListRef}
        data={videos}
        horizontal
        pagingEnabled={false}
        snapToInterval={SCREEN_WIDTH * 0.62}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sliderContent}
        onMomentumScrollEnd={onSlideChange}
        keyExtractor={(item) => item.videoId}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.videoCard,
              index === activeSlide && styles.videoCardActive,
            ]}
            activeOpacity={0.9}
            onPress={() => openLink(item.url)}
          >
            <ExpoImage
              source={{ uri: item.thumbnailUrl }}
              style={styles.videoThumbnail}
              contentFit="cover"
              transition={150}
              cachePolicy="disk"
            />
            <Text style={styles.videoTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.playBtn}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <View style={styles.dotsRow}>
        {videos.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeSlide && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderSection: { width: "100%", marginBottom: 12 },
  sliderContent: { paddingHorizontal: 12, gap: 10 },
  videoCard: {
    width: SCREEN_WIDTH * 0.7,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1A1A2E",
    opacity: 0.75,
  },
  videoCardActive: { opacity: 1, transform: [{ scale: 1.03 }] },
  videoThumbnail: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  videoTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    padding: 12,
    paddingTop: 24,
    backgroundColor: "#00000090",
  },
  playBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00000060",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: "#FFF", fontSize: 10 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 30,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF40" },
  dotActive: { backgroundColor: "#FFF", width: 20 },
});
