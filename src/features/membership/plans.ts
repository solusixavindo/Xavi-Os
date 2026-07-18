import type { MembershipLevel } from '../profile/model';

export type MembershipPlan = {
  id: MembershipLevel;
  name: string;
  color: string;
  headline: string;
  personalWorkspace: true;
  businessWorkspaceLimit: number;
  commercialTerms: 'pending';
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    color: '#20D9FF',
    headline: 'Explore & Connect',
    personalWorkspace: true,
    businessWorkspaceLimit: 0,
    commercialTerms: 'pending',
  },
  {
    id: 'pro',
    name: 'Pro',
    color: '#28D7A1',
    headline: 'Start Your Business',
    personalWorkspace: true,
    businessWorkspaceLimit: 1,
    commercialTerms: 'pending',
  },
  {
    id: 'premium',
    name: 'Premium',
    color: '#7657FF',
    headline: 'Grow & Automate',
    personalWorkspace: true,
    businessWorkspaceLimit: 3,
    commercialTerms: 'pending',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    color: '#F2C96D',
    headline: 'Scale & Lead',
    personalWorkspace: true,
    businessWorkspaceLimit: 10,
    commercialTerms: 'pending',
  },
];
