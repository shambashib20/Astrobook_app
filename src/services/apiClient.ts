import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type ApiResponse<T = any> = {
  success: boolean;
  data: T;
  message?: string;
};

type RequestOptions = {
  withToken?: boolean; // default: true
  params?: Record<string, any>;
  headers?: Record<string, string>;
};

type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: any) => void;
};

// ─────────────────────────────────────────────────────────────
// ApiClient Class
// ─────────────────────────────────────────────────────────────

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: QueueItem[] = [];

  constructor() {
    this.instance = axios.create({
      baseURL:
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1` ||
        "http://192.168.0.200:8080/api/v1",
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });

    this._setupInterceptors();
  }

  // ── Private: Interceptors ──────────────────────────────────

  private _setupInterceptors() {
    // Request — accessToken auto-attach (withToken mode)
    this.instance.interceptors.request.use(async (config) => {
      if (config.headers["__withToken"] === "true") {
        const token = await AsyncStorage.getItem("accessToken");
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      // Internal header hata do — backend ko nahi jaana chahiye
      delete config.headers["__withToken"];
      return config;
    });

    // Response — 401 pe silent refresh
    this.instance.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;

        // 401 aaya + withToken request thi + already retry nahi ki
        if (
          error.response?.status === 401 &&
          !original._retry &&
          original.headers?.Authorization
        ) {
          original._retry = true;

          // Refresh already chal raha hai — queue mein wait karo
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.refreshQueue.push({
                resolve: (newToken) => {
                  original.headers.Authorization = `Bearer ${newToken}`;
                  resolve(this.instance(original));
                },
                reject,
              });
            });
          }

          this.isRefreshing = true;

          try {
            const newToken = await this._refresh();

            // Queue mein jo requests wait kar rahi thi — unko naya token do
            this.refreshQueue.forEach((item) => item.resolve(newToken));
            this.refreshQueue = [];

            original.headers.Authorization = `Bearer ${newToken}`;
            this.isRefreshing = false;
            return this.instance(original);
          } catch (err: any) {
            this.refreshQueue.forEach((item) => item.reject(err));
            this.refreshQueue = [];
            this.isRefreshing = false;

            // Sirf tabhi tokens clear karo jab backend ne refresh token ko
            // GENUINELY reject kiya ho (401/400 — matlab token invalid ya
            // expired hai). Network error / server temporarily down jaisi
            // transient failures pe tokens ko haath mat lagao — warna ek
            // valid session bhi wipe ho jaati hai aur user ko bewajah
            // dobara OTP se login karna padta hai.
            const isAuthRejection =
              err?.response?.status === 401 || err?.response?.status === 400;
            if (isAuthRejection) {
              await this._clearTokens();
            }
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // ── Private: Token Refresh ─────────────────────────────────

  private async _refresh(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    // Seedha axios use karo — instance nahi (infinite loop avoid)
    const res = await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/refresh`,
      { refreshToken },
    );

    const { accessToken, refreshToken: newRefreshToken } = res.data.data;

    await AsyncStorage.setItem("accessToken", accessToken);
    await AsyncStorage.setItem("refreshToken", newRefreshToken);

    return accessToken;
  }

  // ── Private: Clear Tokens ──────────────────────────────────

  private async _clearTokens() {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
  }

  // ── Private: Build Config ──────────────────────────────────

  private _buildConfig(options: RequestOptions = {}): AxiosRequestConfig {
    const { withToken = true, params, headers = {} } = options;
    return {
      params,
      headers: {
        ...headers,
        // Internal flag — request interceptor padh ke token attach karega
        __withToken: withToken ? "true" : "false",
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * GET request
   * @example apiClient.get('/astrologers', { params: { page: 1 } })
   * @example apiClient.get('/auth/public', { withToken: false })
   */
  async get<T = any>(
    url: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.instance.get(
      url,
      this._buildConfig(options),
    );
    return res.data;
  }

  /**
   * POST request
   * @example apiClient.post('/auth/send-otp', { phone }, { withToken: false })
   * @example apiClient.post('/bookings', { serviceId, slot })
   */
  async post<T = any>(
    url: string,
    body?: any,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.instance.post(
      url,
      body,
      this._buildConfig(options),
    );
    return res.data;
  }

  /**
   * PUT request — full replace
   * @example apiClient.put('/services/123', { name, price, duration })
   */
  async put<T = any>(
    url: string,
    body?: any,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.instance.put(
      url,
      body,
      this._buildConfig(options),
    );
    return res.data;
  }

  /**
   * PATCH request — partial update
   * @example apiClient.patch('/users/me', { name: 'Riki' })
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.instance.patch(
      url,
      body,
      this._buildConfig(options),
    );
    return res.data;
  }

  /**
   * DELETE request
   * @example apiClient.delete('/services/123')
   */
  async delete<T = any>(
    url: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const res: AxiosResponse<ApiResponse<T>> = await this.instance.delete(
      url,
      this._buildConfig(options),
    );
    return res.data;
  }
}

export const apiClient = new ApiClient();