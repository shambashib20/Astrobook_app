import { useState } from "react";
import { categoriesService } from "../services";
import type { Category, CategoryFilter } from "../types";

export function useCategories() {
  const [filters, setFilters] = useState<CategoryFilter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesService.getAll();
      setFilters(data.filters);
      setCategories(data.categories);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Categories load nahi hui");
    } finally {
      setLoading(false);
    }
  };

  return { filters, categories, loading, error, fetchCategories };
}
