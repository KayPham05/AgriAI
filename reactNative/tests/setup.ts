import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

// Resolve RN's lazy exports before test timers start. Otherwise the first mount
// includes Jest/Babel compilation time and can exhaust the interaction timeout.
void [AccessibilityInfo, ActivityIndicator, Animated.Value, Animated.View, Animated.timing, BackHandler, Easing, Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View];

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
