'use client';
import { createContext, use } from 'react';
import type { AuthSession, AuthUser } from '@/services/authApi';
import type { AgriculturalProfile, AgriculturalProfileInput } from '@/services/agriculturalProfileApi';
import type { Plant, Disease, DiagnosisResult, UserProfile, NotificationItem } from '@/types';

interface AuthState {
  session: AuthSession | null;
  profile: UserProfile;
  openAuthentication: (mode: 'login' | 'register') => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
  updateAccount: (user: AuthUser) => void;
}
interface CatalogState {
  plants: Plant[];
  diseases: Disease[];
}
interface HistoryState {
  history: DiagnosisResult[];
  addPrediction: (result: DiagnosisResult) => void;
  deleteHistoryItem: (id: string) => Promise<void>;
  viewHistoryItem: (result: DiagnosisResult) => Promise<void>;
}
interface AgriculturalProfileState {
  profiles: AgriculturalProfile[];
  isLoading: boolean;
  error: string | null;
  createProfile: (input: AgriculturalProfileInput) => Promise<AgriculturalProfile>;
  updateProfile: (id: string, input: AgriculturalProfileInput) => Promise<AgriculturalProfile>;
  deleteProfile: (id: string) => Promise<void>;
}
interface FeedbackState {
  notifications: NotificationItem[];
  openNotifications: () => void;
}
export const AuthContext = createContext<AuthState | null>(null);
export const CatalogContext = createContext<CatalogState | null>(null);
export const HistoryContext = createContext<HistoryState | null>(null);
export const AgriculturalProfileContext = createContext<AgriculturalProfileState | null>(null);
export const FeedbackContext = createContext<FeedbackState | null>(null);
function requireProvider<T>(value: T | null): T {
  if (value === null) throw new Error('App context must be used inside AppProvider.');
  return value;
}
export function useAuth() {
  return requireProvider(use(AuthContext));
}
export function useCatalog() {
  return requireProvider(use(CatalogContext));
}
export function useHistory() {
  return requireProvider(use(HistoryContext));
}
export function useAgriculturalProfiles() {
  return requireProvider(use(AgriculturalProfileContext));
}
export function useFeedback() {
  return requireProvider(use(FeedbackContext));
}
