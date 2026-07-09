import { apiClient } from "@/services/apiClient";
import type { Category, CategoryFilter } from "../types";

class CategoriesServiceApi {
  async getAll(): Promise<{
    filters: CategoryFilter[];
    categories: Category[];
  }> {
    const res = await apiClient.get<{
      filters: CategoryFilter[];
      categories: Category[];
    }>("/categories");
    return res.data;
  }
}

export const categoriesService = new CategoriesServiceApi();
