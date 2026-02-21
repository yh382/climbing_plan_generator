import { api } from "@/lib/apiClient";
import type { BlockListing, LibrarySummary } from "../model/types";

export async function getLibrarySummary(): Promise<LibrarySummary> {
  return api.get<LibrarySummary>("/libraries/summary");
}

export async function getBlockListing(blockType: string): Promise<BlockListing> {
  return api.get<BlockListing>(`/libraries/block/${encodeURIComponent(blockType)}`);
}
