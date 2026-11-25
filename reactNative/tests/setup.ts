import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

// Resolve RN's lazy exports before test timers start. Otherwise the first mount
// includes Jest/Babel compilation time and can exhaust the interaction timeout.
void [Image, Pressable, ScrollView, Text, View];

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
