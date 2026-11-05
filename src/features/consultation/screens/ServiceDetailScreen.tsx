import { toast } from "@/components/toast";
import { useAstrologerProfile } from "@/features/astrologer/hooks/useAstrologerProfile";
import { cartService } from "@/features/cart/service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import ServiceDetailView, {
  ServiceStateView,
} from "../components/ServiceDetailView";

export default function ServiceDetailScreen() {
  const router = useRouter();
  // Route file [id].tsx hai, isliye param "id" = serviceId.
  // `editVariantId` cart ke pencil icon se aata hai — wahi variant pre-select.
  const { id: serviceId, astroId, editVariantId } = useLocalSearchParams<{
    id: string;
    astroId: string;
    editVariantId?: string;
  }>();

  const { astrologer, services, loading, error, fetchProfile } =
    useAstrologerProfile(astroId);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const variants = service?.variants ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Variants aate hi pre-select: edit variant > 30-min default > pehla
  useEffect(() => {
    if (variants.length === 0 || selectedId) return;
    const pick =
      variants.find((v) => v.id === editVariantId) ??
      variants.find((v) => v.isDefault) ??
      variants[0];
    if (pick) setSelectedId(pick.id);
  }, [variants, editVariantId, selectedId]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(user)/(tabs)/feed" as any);

  if (loading) return <ServiceStateView onBack={goBack} loading />;

  if (error || !astrologer || !service) {
    return (
      <ServiceStateView
        onBack={goBack}
        message={error ?? "This service was not found or is no longer available"}
        onRetry={fetchProfile}
      />
    );
  }

  const addToCart = async () => {
    if (!selectedId) return;
    setAdding(true);
    try {
      const item = await cartService.addItem({
        astrologerId: astrologer.id,
        serviceId: service.id,
        variantId: selectedId,
      });
      toast.show(
        item.wasAlreadyInCart
          ? "Already in cart — duration and price updated"
          : "Added to cart",
      );
      // Cart se edit karke aaye the → wapas cart pe
      if (editVariantId) router.back();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to add to cart",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <ServiceDetailView
      title={service.title}
      about={service.about}
      serviceId={service.id}
      astrologerName={astrologer.name}
      astrologerId={astrologer.id}
      astrologerAvatar={astrologer.avatarUrl}
      rating={astrologer.rating ?? astrologer.meta?.rating ?? 0}
      reviews={astrologer.totalReviews ?? astrologer.meta?.reviews ?? 0}
      variants={variants}
      selectedId={selectedId}
      onSelect={setSelectedId}
      fallbackPrice={service.price}
      adding={adding}
      onBack={goBack}
      onOpenAstrologer={() =>
        router.push({
          pathname: "/(user)/astrologer-profile" as any,
          params: { id: astrologer.id },
        })
      }
      onAddToCart={addToCart}
      onBook={() =>
        router.push({
          pathname: "/(user)/book-slot" as any,
          params: {
            astroId: astrologer.id,
            serviceId: service.id,
            variantId: selectedId,
          },
        })
      }
    />
  );
}
