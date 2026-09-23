import { addCategoryCards, CategoryPage, loadCategoryHotels } from './categoryPages';
import { getHotelDetailsBatch } from './api';

jest.mock('./api', () => ({ getHotelDetailsBatch: jest.fn() }));
const category: CategoryPage = { id: 'page-1', version: 1, title: 'Escapes', slug: 'escapes', description: '', image: '/image.webp',
  published: true, showOnHomepage: true, hotels: [{ id: 20, name: 'Hotel B', location: '' }, { id: 10, name: 'Hotel A', location: '' }] };

test('only featured published categories become homepage cards, without duplicating a manually linked card', () => {
  expect(addCategoryCards([], [category])[0].href).toBe('/categories/escapes');
  expect(addCategoryCards([], [{ ...category, published: false }])).toEqual([]);
  expect(addCategoryCards([], [{ ...category, showOnHomepage: false }])).toEqual([]);
  const card = { id: 'manual', title: 'Custom title', description: '', image: '', location: '', categories: [], href: '/categories/escapes' };
  expect(addCategoryCards([card], [category])).toEqual([card]);
});

test('supplier results retain the editor order, split into supported batches, and omit unavailable hotels', async () => {
  const hotels = Array.from({ length: 50 }, (_, i) => ({ id: 50 - i, name: 'Hotel', location: '' }));
  (getHotelDetailsBatch as jest.Mock).mockImplementation(async (ids: number[]) => ids.filter((id) => id !== 25).reverse().map((id) => ({ id })));
  const result = await loadCategoryHotels({ hotels });
  expect((getHotelDetailsBatch as jest.Mock).mock.calls.map(([ids]) => ids.length)).toEqual([30, 20]);
  expect(result.map((hotel) => hotel.id)).toEqual(hotels.map((hotel) => hotel.id).filter((id) => id !== 25));
});

test('total supplier failure is reported instead of showing an empty collection', async () => {
  (getHotelDetailsBatch as jest.Mock).mockResolvedValue([]);
  await expect(loadCategoryHotels(category)).rejects.toThrow('could not be loaded');
});
