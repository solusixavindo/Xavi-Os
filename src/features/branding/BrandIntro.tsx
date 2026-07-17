import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { C } from '../../theme';
import {
  getBrandIntroTiming,
  hasBrandIntroPlayed,
  markBrandIntroPlayed,
  scheduleBrandIntroTimeout,
} from './startup';

const introMark = require('../../../assets/brand/animation/ecosystem-x-intro.png');
const introCore = require('../../../assets/brand/animation/ecosystem-x-core.png');
const personalNode = require('../../../assets/brand/animation/node-personal.png');
const businessNode = require('../../../assets/brand/animation/node-business.png');
const aiNode = require('../../../assets/brand/animation/node-ai.png');
const commerceNode = require('../../../assets/brand/animation/node-commerce.png');

type NodeSpec = {
  key: string;
  source: number;
  position: 'personal' | 'business' | 'ai' | 'commerce';
  range: [number, number];
  ai?: boolean;
};

const nodes: NodeSpec[] = [
  { key: 'personal', source: personalNode, position: 'personal', range: [0.34, 0.48] },
  { key: 'business', source: businessNode, position: 'business', range: [0.44, 0.58] },
  { key: 'ai', source: aiNode, position: 'ai', range: [0.54, 0.68], ai: true },
  { key: 'commerce', source: commerceNode, position: 'commerce', range: [0.64, 0.78] },
];

export function BrandIntroGate({ children }: PropsWithChildren) {
  const [complete, setComplete] = useState(hasBrandIntroPlayed);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(complete);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markBrandIntroPlayed();
    setComplete(true);
  }, []);

  useEffect(() => {
    if (complete) return;
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        if (mounted) setReduceMotion(false);
      });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, [complete]);

  useEffect(() => {
    if (complete) return;
    const timing = getBrandIntroTiming(Boolean(reduceMotion));
    const timeout = scheduleBrandIntroTimeout(finish, reduceMotion);
    if (reduceMotion === null) return () => clearTimeout(timeout);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: timing.duration,
      easing: reduceMotion ? Easing.out(Easing.quad) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) finish();
    });
    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [complete, finish, progress, reduceMotion]);

  if (complete) return <>{children}</>;

  const mainOpacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const mainScale = reduceMotion
    ? 1
    : progress.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0.92, 1, 1], extrapolate: 'clamp' });
  const connectionOpacity = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0.16, 0.32, 0.74], outputRange: [0, 0.8, 0.18], extrapolate: 'clamp' });
  const connectionScale = progress.interpolate({ inputRange: [0.16, 0.5], outputRange: [0, 1], extrapolate: 'clamp' });
  const glowOpacity = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0.76, 0.9, 1], outputRange: [0, 0.42, 0], extrapolate: 'clamp' });
  const exitOpacity = progress.interpolate({
    inputRange: [0, 0.88, 1],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessibilityLabel="Ecosystem X menghubungkan Personal, Business, XAVI AI, dan Commerce"
      accessibilityRole="image"
      style={styles.screen}
      testID="brand-intro"
    >
      <Animated.View style={[styles.content, { opacity: exitOpacity }]}>
        <View style={styles.markFrame}>
        <Animated.Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onError={finish}
          resizeMode="contain"
          source={introCore}
          style={[styles.fullMark, { opacity: mainOpacity, transform: [{ scale: mainScale }] }]}
        />
        {!reduceMotion
          ? [-135, -45, 135, 45].map((rotation) => (
              <View key={rotation} pointerEvents="none" style={[styles.connectionTrack, { transform: [{ rotate: `${rotation}deg` }] }]}>
                <Animated.View
                  style={[styles.connectionLight, { opacity: connectionOpacity, transform: [{ scaleX: connectionScale }] }]}
                />
              </View>
            ))
          : null}
        {nodes.map((node) => {
          const opacity = progress.interpolate({
            inputRange: node.range,
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const scale = reduceMotion
            ? 1
            : node.ai
              ? progress.interpolate({
                  inputRange: [node.range[0], node.range[1], 0.76, 0.84],
                  outputRange: [0.82, 1, 1.07, 1],
                  extrapolate: 'clamp',
                })
              : progress.interpolate({
                  inputRange: node.range,
                  outputRange: [0.86, 1],
                  extrapolate: 'clamp',
                });
          return (
            <Animated.Image
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              key={node.key}
              resizeMode="contain"
              source={node.source}
              style={[styles.node, styles[node.position], { opacity, transform: [{ scale }] }]}
            />
          );
        })}
        <Animated.Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          resizeMode="contain"
          source={introMark}
          style={[styles.fullMark, styles.glow, { opacity: glowOpacity }]}
        />
        </View>
        <Text style={styles.wordmark}>XAVI-OS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: C.bg,
    flex: 1,
    justifyContent: 'center',
  },
  content: { alignItems: 'center' },
  markFrame: { height: 320, position: 'relative', width: 320 },
  fullMark: { height: 320, left: 0, position: 'absolute', top: 0, width: 320 },
  glow: { shadowColor: C.cyan, shadowOpacity: 0.7, shadowRadius: 24 },
  node: { height: 86, position: 'absolute', width: 86 },
  personal: { left: 50, top: 49 },
  business: { right: 50, top: 49 },
  ai: { bottom: 48, left: 50 },
  commerce: { bottom: 48, right: 50 },
  connectionTrack: { height: 6, left: 157, position: 'absolute', top: 157, width: 92 },
  connectionLight: {
    backgroundColor: C.cyan,
    borderRadius: 4,
    height: 4,
    shadowColor: C.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 9,
    width: 92,
  },
  wordmark: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 6, marginTop: 18 },
});
