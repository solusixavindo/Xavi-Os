import type { MembershipLevel } from '../profile/model';

export type MembershipPlan = {
  id: MembershipLevel;
  name: string;
  price: number;
  color: string;
  headline: string;
  benefits: string[];
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    color: '#20D9FF',
    headline: 'Explore & Connect',
    benefits: ['Personal Space', 'Marketplace & home service', 'XAVI Points'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149000,
    color: '#28D7A1',
    headline: 'Start Your Business',
    benefits: ['1 Business Space', 'CRM Lite & invoice', '100 AI Credits'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 399000,
    color: '#7657FF',
    headline: 'Grow & Automate',
    benefits: ['3 Business Space', 'CRM, POS & inventory', '500 AI Credits'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 999000,
    color: '#F2C96D',
    headline: 'Scale & Lead',
    benefits: ['10 Business Space', 'Advanced CRM/ERP', 'AI Agent Platform'],
  },
];
