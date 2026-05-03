"use client";

import { getClientAuth } from "./firebase";

export async function apiFetch<T = unknown>(input: string, init: RequestInit = {}): Promise<T> {
  const auth = getClientAuth();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(input, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = (data as { error?: string } | null)?.error || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}
