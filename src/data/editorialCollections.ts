/** Verified Little Emperors hotel IDs for Ventus' editorial homepage collections. */
export const editorialCollections = {
  'summer-sun': {
    title: 'Summer Sun',
    hotelIds: [9592, 9723, 12370, 11294, 7428, 7439, 9945, 6131, 9947, 9684],
  },
  'european-city-breaks': {
    title: 'European City Breaks',
    hotelIds: [8266, 10488, 26, 9433, 13324, 11082, 12734, 31],
  },
  'hotels-with-villas': {
    title: 'Hotels with Villas',
    hotelIds: [9801, 9456, 9123, 11208, 10593, 8570, 10210, 9236],
  },
  'city-spa-breaks': {
    title: 'City Spa Breaks',
    hotelIds: [8266, 10488, 8586, 9382, 9433, 11082, 6777, 8358],
  },
} as const;

export type EditorialCollectionSlug = keyof typeof editorialCollections;

export const getEditorialCollection = (slug: string | null) =>
  slug && Object.prototype.hasOwnProperty.call(editorialCollections, slug)
    ? editorialCollections[slug as EditorialCollectionSlug]
    : null;
