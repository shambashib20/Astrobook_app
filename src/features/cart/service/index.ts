import { apiClient } from "@/services/apiClient";
import type {
  CartItem,
  AddCartItemPayload,
  CartCheckoutOrderResponse,
  CartCheckoutVerifyPayload,
  CartCheckoutVerifyResponse,
} from "../types";

class CartServiceApi {
  private readonly base = "/cart";

  async addItem(dto: AddCartItemPayload): Promise<CartItem> {
    const res = await apiClient.post<{ item: CartItem }>(
      `${this.base}/items`,
      dto,
    );
    return res.data.item;
  }

  async getMyCart(): Promise<CartItem[]> {
    const res = await apiClient.get<{ items: CartItem[] }>(this.base);
    return res.data.items;
  }

  async setSlot(id: string, scheduledAt: string): Promise<CartItem> {
    const res = await apiClient.patch<{ item: CartItem }>(
      `${this.base}/items/${id}/slot`,
      { scheduledAt },
    );
    return res.data.item;
  }

  async removeItem(id: string): Promise<void> {
    await apiClient.delete(`${this.base}/items/${id}`);
  }

  // NOTE: /cart/checkout/* raw object return karte hain (jaise /payments/*) —
  // {success, data} envelope mein NAHI

  async createCheckoutOrder(
    cartItemIds: string[],
  ): Promise<CartCheckoutOrderResponse> {
    const res = await apiClient.post<CartCheckoutOrderResponse>(
      `${this.base}/checkout/create-order`,
      { cartItemIds },
    );
    return res as unknown as CartCheckoutOrderResponse;
  }

  async verifyCheckout(
    payload: CartCheckoutVerifyPayload,
  ): Promise<CartCheckoutVerifyResponse> {
    const res = await apiClient.post<CartCheckoutVerifyResponse>(
      `${this.base}/checkout/verify`,
      payload,
    );
    return res as unknown as CartCheckoutVerifyResponse;
  }
}

export const cartService = new CartServiceApi();
