import { deleteItemAsync, getItemAsync } from 'expo-secure-store';

export const sessionTokenKey = 'agrivision.session.access-token';

export const sessionToken = {
  readToken: () => getItemAsync(sessionTokenKey),
  clearToken: () => deleteItemAsync(sessionTokenKey),
};
