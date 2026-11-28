import { deleteItemAsync, getItemAsync, setItemAsync, WHEN_UNLOCKED_THIS_DEVICE_ONLY } from 'expo-secure-store';

export const sessionTokenKey = 'agrivision.session.access-token';

export const sessionToken = {
  readToken: () => getItemAsync(sessionTokenKey),
  clearToken: () => deleteItemAsync(sessionTokenKey),
  saveToken: (token: string) => setItemAsync(sessionTokenKey, token, { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
};
