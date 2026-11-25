import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { theme } from '@/theme/tokens';

const motion = theme.login.motion;

function createEntrance(distance: number, opacity: number) {
  const progress = new Animated.Value(1);
  return {
    progress,
    style: {
      opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [opacity, 1] }),
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    },
  };
}

function enter(progress: Animated.Value, duration: number) {
  progress.setValue(0);
  const animation = Animated.timing(progress, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
  animation.start();
  return animation;
}

export function useAuthMotion(mode: 'login' | 'register') {
  const [panel] = useState(() => createEntrance(motion.panelDistance, motion.panelOpacity));
  const [fields] = useState(() => createEntrance(motion.fieldDistance, motion.fieldOpacity));
  const previousMode = useRef(mode);
  const reduceMotion = useRef(true);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      reduceMotion.current = enabled;
      if (enabled) {
        panel.progress.setValue(1);
        fields.progress.setValue(1);
      }
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!active || preferenceChanged) return;
      reduceMotion.current = enabled;
      if (!enabled) enter(panel.progress, motion.panelDuration);
    }).catch(() => {
      // Keep the form still if the system preference is unavailable.
    });
    return () => {
      active = false;
      subscription.remove();
      panel.progress.setValue(1);
      fields.progress.setValue(1);
    };
  }, [fields, panel]);

  useLayoutEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    if (reduceMotion.current) return;
    const animation = enter(fields.progress, motion.fieldDuration);
    return () => {
      animation.stop();
      fields.progress.setValue(1);
    };
  }, [fields, mode]);

  return { panelStyle: panel.style, fieldsStyle: fields.style };
}
