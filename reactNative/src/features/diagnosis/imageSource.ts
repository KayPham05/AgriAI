import { Linking } from 'react-native';

import type { SelectedLeafImage } from '@/features/diagnosis/diagnosisDraft';

export type ImagePickOutcome =
  | { kind: 'selected'; image: SelectedLeafImage }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied'; source: 'camera' | 'library'; canAskAgain: boolean; limited?: boolean }
  | { kind: 'unavailable'; message: string };

export interface ImageSourceAdapter {
  pickFromCamera: () => Promise<ImagePickOutcome>;
  pickFromLibrary: () => Promise<ImagePickOutcome>;
  openSettings: () => Promise<void>;
}

type ExpoImagePickerModule = {
  requestCameraPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain?: boolean }>;
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain?: boolean; accessPrivileges?: string }>;
  launchCameraAsync: (options: object) => Promise<{ canceled: boolean; assets?: { uri: string; fileName?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }[] }>;
  launchImageLibraryAsync: (options: object) => Promise<{ canceled: boolean; assets?: { uri: string; fileName?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }[] }>;
};

function loadPicker(): ExpoImagePickerModule | null {
  try {
    // Dynamic require avoids hard build failure when native picker module is not yet installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ExpoImagePickerModule;
  } catch {
    return null;
  }
}

function toSelectedImage(asset: NonNullable<Awaited<ReturnType<ExpoImagePickerModule['launchCameraAsync']>>['assets']>[number]): SelectedLeafImage {
  return {
    uri: asset.uri,
    fileName: asset.fileName?.trim() || 'leaf.jpg',
    mimeType: asset.mimeType?.trim() || 'image/jpeg',
    fileSizeBytes: asset.fileSize,
    width: asset.width,
    height: asset.height,
  };
}

export const defaultImageSourceAdapter: ImageSourceAdapter = {
  async pickFromCamera() {
    const picker = loadPicker();
    if (!picker) return { kind: 'unavailable', message: 'Máy ảnh chưa sẵn sàng trên bản dựng này.' };
    const perm = await picker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { kind: 'permission-denied', source: 'camera', canAskAgain: perm.canAskAgain ?? false };
    }
    const res = await picker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (res.canceled || !res.assets?.length) return { kind: 'cancelled' };
    return { kind: 'selected', image: toSelectedImage(res.assets[0]) };
  },
  async pickFromLibrary() {
    const picker = loadPicker();
    if (!picker) return { kind: 'unavailable', message: 'Thư viện ảnh chưa sẵn sàng trên bản dựng này.' };
    const perm = await picker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return {
        kind: 'permission-denied',
        source: 'library',
        canAskAgain: perm.canAskAgain ?? false,
        limited: perm.accessPrivileges === 'limited',
      };
    }
    const res = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false, selectionLimit: 1 });
    if (res.canceled || !res.assets?.length) return { kind: 'cancelled' };
    return { kind: 'selected', image: toSelectedImage(res.assets[0]) };
  },
  async openSettings() {
    await Linking.openSettings();
  },
};
