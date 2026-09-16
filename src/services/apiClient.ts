import { API_BASE_URL } from "@/config/api";
import { tokenStorage } from "@/services/tokenStorage";
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

/**
 * Backend ne saaf mana kiya (401/400) ya refresh token hai hi nahi — session
 * sach mein khatam. Network error / timeout / server down isme NAHI aate.
 */
export function isAuthRejection(err: any): boolean {
  return (
    err?.isAuthRejection === true ||
    err?.response?.status === 401 ||
    err?.response?.status === 400
  );
}

// ─────────────────────────────────────────────────────────────
// ApiClient Class
// ─────────────────────────────────────────────────────────────

class ApiClient {
  private instance: AxiosInstance;
  // Ek waqt pe sirf EK refresh chalega. Backend har refresh pe purana token
  // delete karta hai (rotation), isliye do parallel refresh ek dusre ko
  // invalid kar dete. Baaki sab isi promise ka wait karte hain.
  private refreshPromise: Promise<string> | null = null;
  private onSessionExpired: (() => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 45000, // Render free-tier cold start 30-50s tak le sakta hai (keep-alive ping se rare hona chahiye, lekin safety net rakha)
      headers: { "Content-Type": "application/json" },
    });

    this._setupInterceptors();
  }

  // ── Private: Interceptors ──────────────────────────────────

  private _setupInterceptors() {
    // Request — accessToken auto-attach (withToken mode)
    this.instance.interceptors.request.use(async (config) => {
      if (config.headers["__withToken"] === "true") {
        const token = await tokenStorage.getAccessToken();
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

          try {
            const newToken = await this.refreshSession();
            original.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(original);
          } catch {
            // Auth rejection pe session already expire ho chuka hai
            // (refreshSession ne tokens clear + handler call kar diya)
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // ── Session Refresh (public, single-flight) ─────────────────

  /**
   * Naya accessToken lo. Parallel calls ek hi network request share karti hain.
   * Backend ne token reject kiya to tokens clear + onSessionExpired call hota hai.
   * Network error pe tokens ko haath nahi lagaya jaata.
   */
  refreshSession(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this._doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  /** Auth store yahan apna handler register karta hai (circular import se bachne ke liye) */
  setSessionExpiredHandler(handler: () => void) {
    this.onSessionExpired = handler;
  }

  private async _doRefresh(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await this._expireSession();
      throw Object.assign(new Error("No refresh token"), {
        isAuthRejection: true,
      });
    }

    try {
      // Seedha axios — instance nahi (warna interceptor loop)
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 45000 },
      );
      const { accessToken, refreshToken: newRefreshToken } = res.data.data;
      await tokenStorage.setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch (err) {
      if (isAuthRejection(err)) await this._expireSession();
      throw err;
    }
  }

  private async _expireSession() {
    await tokenStorage.clear();
    this.onSessionExpired?.();
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