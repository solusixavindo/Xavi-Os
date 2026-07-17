import { z } from 'zod';

export const membershipLevels = ['basic', 'pro', 'premium', 'platinum'] as const;
export type MembershipLevel = (typeof membershipLevels)[number];

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  referralCode: string;
  referredBy: string | null;
  membership: MembershipLevel;
  xaviPoints: number;
  role: 'member' | 'admin';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  onboardingCompleted: boolean;
  upgradeIntent: MembershipLevel | null;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  membership: MembershipLevel;
  xavi_points: number;
  role: Profile['role'];
  kyc_status: Profile['kycStatus'];
  onboarding_completed: boolean;
  upgrade_intent: MembershipLevel | null;
};

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    membership: row.membership,
    xaviPoints: row.xavi_points,
    role: row.role,
    kycStatus: row.kyc_status,
    onboardingCompleted: row.onboarding_completed,
    upgradeIntent: row.upgrade_intent,
  };
}

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.onboardingCompleted && profile.fullName.trim() && profile.phone);
}

const editableProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  onboardingCompleted: z.boolean(),
  upgradeIntent: z.enum(membershipLevels).nullable(),
});

export function buildProfileUpdateParams(input: unknown) {
  const value = editableProfileSchema.parse(input);
  return {
    p_full_name: value.fullName,
    p_phone: value.phone,
    p_avatar_url: value.avatarUrl ?? null,
    p_onboarding_completed: value.onboardingCompleted,
    p_upgrade_intent: value.upgradeIntent,
  };
}
