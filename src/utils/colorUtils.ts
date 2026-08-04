// Consistent hash-based color per id — pehle yeh sirf feed.tsx ke andar
// local function tha, ab shared hai (UserAvatar aur feed dono use karte hain)
// taaki same astrologer ka fallback color har jagah same rahe.

const BG_PALETTE = [
  "#6B21A8",
  "#1E3A5F",
  "#92400E",
  "#065F46",
  "#9D174D",
  "#4C1D95",
];

export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 997;
  return BG_PALETTE[hash % BG_PALETTE.length]!;
}
