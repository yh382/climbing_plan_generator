// src/features/community/blog/api.ts
import { api } from "../../../lib/apiClient";
import type { BlogDetail, BlogListItem } from "./types";

export const blogApi = {
  /** GET /blog — published posts (public). */
  getBlogs: async (): Promise<BlogListItem[]> => {
    const data = await api.get<any>("/blog");
    return Array.isArray(data) ? data : (data?.items ?? []);
  },

  /** GET /blog/{id} — detail (auth optional; adds liked/saved state). */
  getBlog: (id: string) => api.get<BlogDetail>(`/blog/${id}`),

  like: (id: string) => api.post<{ ok: boolean }>(`/blog/${id}/like`),
  save: (id: string) => api.post<{ ok: boolean }>(`/blog/${id}/save`),
};
