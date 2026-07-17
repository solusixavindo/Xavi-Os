import type { RootRoute } from '../../../navigation/routeState';
import {
  BRAND_INTRO_TIMING,
  getBrandIntroTiming,
  hasBrandIntroPlayed,
  markBrandIntroPlayed,
  resetBrandIntroForTests,
  resolveStartupPresentation,
  scheduleBrandIntroTimeout,
} from '../startup';

const guardedRoutes: RootRoute[] = ['loading', 'auth', 'verification', 'onboarding', 'main', 'passwordRecovery'];

describe('brand startup coordination', () => {
  beforeEach(resetBrandIntroForTests);

  test.each(guardedRoutes)('never changes the auth route decision for %s', (route) => {
    expect(resolveStartupPresentation(false, route)).toBe('brandIntro');
    expect(resolveStartupPresentation(true, route)).toBe(route);
  });

  test('uses the latest auth decision when the intro completes', () => {
    expect(resolveStartupPresentation(false, 'loading')).toBe('brandIntro');
    expect(resolveStartupPresentation(false, 'verification')).toBe('brandIntro');
    expect(resolveStartupPresentation(true, 'verification')).toBe('verification');
  });

  test('has a bounded timeout longer than each animation', () => {
    expect(BRAND_INTRO_TIMING.standard.duration).toBeGreaterThanOrEqual(1400);
    expect(BRAND_INTRO_TIMING.standard.duration).toBeLessThanOrEqual(1800);
    expect(BRAND_INTRO_TIMING.standard.timeout).toBeGreaterThan(BRAND_INTRO_TIMING.standard.duration);
    expect(BRAND_INTRO_TIMING.reduced.duration).toBeLessThan(BRAND_INTRO_TIMING.standard.duration);
    expect(BRAND_INTRO_TIMING.reduced.timeout).toBeGreaterThan(BRAND_INTRO_TIMING.reduced.duration);
  });

  test('selects the short fade timing for Reduce Motion', () => {
    expect(getBrandIntroTiming(true)).toBe(BRAND_INTRO_TIMING.reduced);
    expect(getBrandIntroTiming(false)).toBe(BRAND_INTRO_TIMING.standard);
  });

  test('executes the timeout fallback when animation completion is absent', () => {
    jest.useFakeTimers();
    const fallback = jest.fn();
    scheduleBrandIntroTimeout(fallback, false);
    jest.advanceTimersByTime(BRAND_INTRO_TIMING.standard.timeout - 1);
    expect(fallback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fallback).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('records completion once for the current cold lifecycle', () => {
    expect(hasBrandIntroPlayed()).toBe(false);
    markBrandIntroPlayed();
    markBrandIntroPlayed();
    expect(hasBrandIntroPlayed()).toBe(true);
  });

  test('all animation assets are valid module imports', () => {
    expect(require('../../../../assets/brand/animation/ecosystem-x-intro.png')).toBeTruthy();
    expect(require('../../../../assets/brand/animation/ecosystem-x-core.png')).toBeTruthy();
    expect(require('../../../../assets/brand/animation/node-personal.png')).toBeTruthy();
    expect(require('../../../../assets/brand/animation/node-business.png')).toBeTruthy();
    expect(require('../../../../assets/brand/animation/node-ai.png')).toBeTruthy();
    expect(require('../../../../assets/brand/animation/node-commerce.png')).toBeTruthy();
  });
});
