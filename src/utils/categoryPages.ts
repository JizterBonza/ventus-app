import { getAuthToken } from './authService';
import { HomepageEditorVerificationRequired } from './homepageContent';
import { getHotelDetailsBatch } from './api';
import { InterestCategory } from '../types/interests';

export interface CategoryHotel { id: number; name: string; location: string }
export interface CategoryContent {
  title: string;
  slug: string;
  description: string;
  image: string;
  published: boolean;
  showOnHomepage: boolean;
  hotels: CategoryHotel[];
}
export interface CategoryPage extends CategoryContent { id: string; version: number }
export interface AdminAccess { contentEditor: boolean; reservationManager: boolean }

const backendBase = process.env.REACT_APP_AUTH_API_URL
  ? process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/, '')
  : process.env.NODE_ENV === 'production' ? 'https://ventus-backend.onrender.com/api' : '/api';

async function request(path: string, admin = false, init: RequestInit = {}) {
  const token = admin ? getAuthToken() : null;
  if (admin && !token) throw new Error('Sign in to manage category pages');
  const response = await fetch(`${backendBase}${path}`, {
    ...init, cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const data = await response.json().catch(() => null);
  if (data?.code === 'EDITOR_VERIFICATION_REQUIRED') throw new HomepageEditorVerificationRequired();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

export const fetchAdminAccess = async (): Promise<AdminAccess> => request('/admin/access', true);
export const fetchCategories = async (admin = false): Promise<CategoryPage[]> =>
  (await request(`/categories${admin ? '/admin' : ''}`, admin)).categories;
export const fetchCategory = async (slug: string): Promise<CategoryPage> =>
  (await request(`/categories/${encodeURIComponent(slug)}`)).category;
export const saveCategory = async (category: CategoryContent, existing?: Pick<CategoryPage, 'id' | 'version'>): Promise<CategoryPage> =>
  (await request(`/categories/admin${existing ? `/${existing.id}` : ''}`, true, {
    method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, version: existing?.version }),
  })).category;

export const categoryPath = (category: Pick<CategoryContent, 'slug'>) => `/categories/${category.slug}`;
export const categorySlug = (title: string) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/, '');

export const addCategoryCards = (cards: InterestCategory[], categories: CategoryPage[]): InterestCategory[] => [
  ...categories.filter((category) => category.published && category.showOnHomepage && !cards.some((card) => card.href === categoryPath(category)))
    .map((category) => ({ id: `category-${category.id}`, title: category.title, description: category.description,
      image: category.image, href: categoryPath(category), categories: ['Collections'], location: 'Worldwide' })),
  ...cards,
];

export const loadCategoryHotels = async (category: Pick<CategoryContent, 'hotels'>) => {
  // The supplier proxy accepts a maximum of 30 IDs per batch.
  const batches = [];
  for (let index = 0; index < category.hotels.length; index += 30) {
    batches.push(getHotelDetailsBatch(category.hotels.slice(index, index + 30).map((hotel) => hotel.id)));
  }
  const hotels = (await Promise.all(batches)).flat();
  const byId = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  const ordered = category.hotels.flatMap(({ id }) => byId.has(id) ? [byId.get(id)!] : []);
  if (!ordered.length && category.hotels.length) throw new Error('The hotels could not be loaded. Please try again.');
  return ordered;
};
