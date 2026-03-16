import { apiGet, apiPost } from "./api-client";
import { API_ROUTES } from "@/constants/routes";
import type { Session } from "@/types";

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export async function signUp(payload: SignUpPayload): Promise<{ ok: boolean }> {
  return apiPost(API_ROUTES.AUTH_SIGN_UP, payload);
}

export async function signIn(payload: SignInPayload): Promise<Session> {
  return apiPost(API_ROUTES.AUTH_SIGN_IN, payload);
}

export async function signOut(): Promise<void> {
  return apiPost(API_ROUTES.AUTH_SIGN_OUT);
}

export async function getSession(): Promise<Session | null> {
  try {
    return await apiGet<Session>(API_ROUTES.AUTH_SESSION);
  } catch {
    return null;
  }
}
