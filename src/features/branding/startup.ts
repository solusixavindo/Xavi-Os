import type { RootRoute } from '../../navigation/routeState';

export type StartupPresentation = 'brandIntro' | RootRoute;

export const BRAND_INTRO_TIMING = {
  standard: { duration: 1600, timeout: 2300 },
  reduced: { duration: 280, timeout: 700 },
} as const;

const lifecycleState = globalThis as typeof globalThis & { __xaviOsBrandIntroPlayed?: boolean };

export function resolveStartupPresentation(introComplete: boolean, authRoute: RootRoute): StartupPresentation {
  return introComplete ? authRoute : 'brandIntro';
}

export function getBrandIntroTiming(reduceMotion: boolean) {
  return reduceMotion ? BRAND_INTRO_TIMING.reduced : BRAND_INTRO_TIMING.standard;
}

export function scheduleBrandIntroTimeout(callback: () => void, reduceMotion: boolean | null) {
  const timing = getBrandIntroTiming(Boolean(reduceMotion));
  return setTimeout(callback, timing.timeout);
}

export function hasBrandIntroPlayed(): boolean {
  return Boolean(lifecycleState.__xaviOsBrandIntroPlayed);
}

export function markBrandIntroPlayed(): void {
  lifecycleState.__xaviOsBrandIntroPlayed = true;
}

export function resetBrandIntroForTests(): void {
  delete lifecycleState.__xaviOsBrandIntroPlayed;
}
