// Subscription types for the Ventus App

export interface MembershipBenefit {
  title: string;
  description: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceUSD: number;
  priceGBP: number;
  priceEUR: number;
  interval: 'monthly' | 'yearly';
  benefits: MembershipBenefit[];
  cardStyle: 'white' | 'gold' | 'black';
  popular?: boolean;
}

export interface CouponValidation {
  valid: boolean;
  discountPercent: number;
  message: string;
}

export interface SubscriptionRequest {
  planId: string;
  couponCode?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  message?: string;
  error?: string;
}

// Available subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'travel-yearly',
    name: 'Travel',
    priceUSD: 350,
    priceGBP: 299,
    priceEUR: 349,
    interval: 'yearly',
    cardStyle: 'white',
    benefits: [
      {
        title: 'Lowest rates guaranteed',
        description: 'Guaranteed lowest rates, plus exclusive offers and preferential rates'
      },
      {
        title: 'Complimentary benefits',
        description: 'Breakfast, hotel credits, spa treatments, experiences and more'
      },
      {
        title: 'Hotel upgrades',
        description: 'Guaranteed upgrades at either time of booking or check-in'
      },
      {
        title: 'Flexible rates',
        description: 'Same cancellation, payment and loyalty point collection as when booking with the hotel directly'
      },
      {
        title: 'Booking fee',
        description: '£20 booking fee with no hidden costs'
      },
      {
        title: 'Events',
        description: "Access to exclusive tickets to some of the world's most sought after events"
      },
    ]
  },
  {
    id: 'black-yearly',
    name: 'Black',
    priceUSD: 1300,
    priceGBP: 1100,
    priceEUR: 1250,
    interval: 'yearly',
    cardStyle: 'black',
    benefits: [
      {
        title: 'Lowest rates guaranteed',
        description: 'Guaranteed lowest rates, plus exclusive offers and preferential rates'
      },
      {
        title: 'Hotel upgrades',
        description: 'Priority guaranteed upgrades at either time of booking or check in'
      },
      {
        title: 'Complimentary benefits',
        description: 'Breakfast, hotel credits, spa treatments, experiences and more'
      },
      {
        title: 'Booking fee',
        description: 'No booking fees on any bookings'
      },
      {
        title: 'Events',
        description: "VIP invitations to some of the world's most sought after events"
      },
      {
        title: 'Membership rewards',
        description: 'Referral rewards and member competitions'
      },
      {
        title: 'Flexible rates',
        description: 'Same cancellation, payment and loyalty point collection as when booking with the hotel directly'
      },
      {
        title: 'Car hire',
        description: 'Up to 20% off on car hire'
      },
      {
        title: 'Instagram competitions',
        description: 'Win up to 3 complimentary stays a year'
      }
    ]
  },
  {
    id: 'dynasty-yearly',
    name: 'Dynasty',
    priceUSD: 1950,
    priceGBP: 1650,
    priceEUR: 1850,
    interval: 'yearly',
    cardStyle: 'gold',
    popular: true,
    benefits: [
      {
        title: 'Lowest rates guaranteed',
        description: 'Guaranteed lowest rates, plus exclusive offers and preferential rates'
      },
      {
        title: 'Rates with complimentary benefits',
        description: 'Breakfast, hotel credits, spa treatments, experiences and more'
      },
      {
        title: 'Flexible rates',
        description: 'Same cancellation, payment and loyalty point collection as when booking with the hotel directly'
      },
      {
        title: 'Lifestyle offers',
        description: 'Money off car hire, private jets and more'
      },
      {
        title: 'Events',
        description: "Access to exclusive tickets to some of the world's most sought after events"
      },
      {
        title: 'Instagram competitions',
        description: 'Win up to 3 complimentary stays a year'
      },
      {
        title: 'Booking fee',
        description: 'No booking fees on any bookings'
      },
      {
        title: 'Additional Travel Tier memberships',
        description: 'Share complimentary Travel Tier memberships with your friends and family'
      }
    ]
  }
];

// Valid coupon codes
export const VALID_COUPONS: Record<string, { discountPercent: number; description: string }> = {
  'VENTUS': { discountPercent: 100, description: 'Full access - 100% discount!' },
  'VENTUSVIP': { discountPercent: 100, description: 'Full access - 100% discount!' },
  'WELCOME50': { discountPercent: 50, description: '50% off your first subscription' },
  'SAVE20': { discountPercent: 20, description: '20% discount applied' }
};
