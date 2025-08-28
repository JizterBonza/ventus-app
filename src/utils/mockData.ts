import { Hotel } from '../types/search';

export const mockHotels: Hotel[] = [
  {
    id: 1,
    name: "The Cappa Luxury Hotel",
    location: "Manila, Philippines",
    rating: 5,
    price: 299,
    image: "/assets/img/rooms/1.jpg",
    amenities: ["Free WiFi", "Spa", "Restaurant", "Pool", "Gym"],
    description: "Experience luxury at its finest with our premium accommodations and world-class service in the heart of Manila.",
    available: true,
    distance: "0.2 km from center",
    reviewCount: 1247,
    address: "Manila, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@cappahotel.com",
    website: "https://cappahotel.com",
    latitude: 14.5995,
    longitude: 120.9842,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/1.jpg",
        thumbnail_url: "/assets/img/rooms/1.jpg",
        description: "Hotel lobby"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/1",
        method: "GET"
      }
    }
  },
  {
    id: 2,
    name: "Grand Plaza Hotel",
    location: "Cebu, Philippines",
    rating: 4,
    price: 199,
    image: "/assets/img/rooms/2.jpg",
    amenities: ["Free WiFi", "Restaurant", "Pool"],
    description: "Modern comfort meets elegant design in the heart of Cebu City.",
    available: true,
    distance: "0.5 km from center",
    reviewCount: 892,
    address: "Cebu, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@grandplaza.com",
    website: "https://grandplaza.com",
    latitude: 10.3157,
    longitude: 123.8854,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/2.jpg",
        thumbnail_url: "/assets/img/rooms/2.jpg",
        description: "Hotel exterior"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/2",
        method: "GET"
      }
    }
  },
  {
    id: 3,
    name: "Ocean View Resort",
    location: "Boracay, Philippines",
    rating: 5,
    price: 399,
    image: "/assets/img/rooms/3.jpg",
    amenities: ["Free WiFi", "Spa", "Restaurant", "Pool", "Beach Access"],
    description: "Breathtaking ocean views and pristine beaches await you in beautiful Boracay.",
    available: true,
    distance: "0.1 km from beach",
    reviewCount: 1567,
    address: "Boracay, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@oceanview.com",
    website: "https://oceanview.com",
    latitude: 11.9674,
    longitude: 121.9248,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/3.jpg",
        thumbnail_url: "/assets/img/rooms/3.jpg",
        description: "Ocean view"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/3",
        method: "GET"
      }
    }
  },
  {
    id: 4,
    name: "Mountain Lodge",
    location: "Baguio, Philippines",
    rating: 4,
    price: 159,
    image: "/assets/img/rooms/4.jpg",
    amenities: ["Free WiFi", "Restaurant", "Skiing"],
    description: "Cozy mountain retreat with stunning alpine views in the summer capital.",
    available: true,
    distance: "2.1 km from center",
    reviewCount: 634,
    address: "Baguio, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@mountainlodge.com",
    website: "https://mountainlodge.com",
    latitude: 16.4023,
    longitude: 120.5960,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/4.jpg",
        thumbnail_url: "/assets/img/rooms/4.jpg",
        description: "Mountain view"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/4",
        method: "GET"
      }
    }
  },
  {
    id: 5,
    name: "Urban Boutique Hotel",
    location: "Makati, Philippines",
    rating: 4,
    price: 249,
    image: "/assets/img/rooms/5.jpg",
    amenities: ["Free WiFi", "Restaurant", "Bar"],
    description: "Stylish boutique hotel in the heart of Makati's business district.",
    available: true,
    distance: "0.3 km from center",
    reviewCount: 1023,
    address: "Makati, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@urbanboutique.com",
    website: "https://urbanboutique.com",
    latitude: 14.5547,
    longitude: 121.0244,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/5.jpg",
        thumbnail_url: "/assets/img/rooms/5.jpg",
        description: "Boutique interior"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/5",
        method: "GET"
      }
    }
  },
  {
    id: 6,
    name: "Historic Inn",
    location: "Vigan, Philippines",
    rating: 3,
    price: 129,
    image: "/assets/img/rooms/6.jpg",
    amenities: ["Free WiFi", "Restaurant"],
    description: "Charming historic inn with modern amenities in the UNESCO heritage city.",
    available: true,
    distance: "0.8 km from center",
    reviewCount: 445,
    address: "Vigan, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@historicinn.com",
    website: "https://historicinn.com",
    latitude: 17.5745,
    longitude: 120.3869,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/6.jpg",
        thumbnail_url: "/assets/img/rooms/6.jpg",
        description: "Historic facade"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/6",
        method: "GET"
      }
    }
  },
  {
    id: 7,
    name: "Luxury Tower Hotel",
    location: "Taguig, Philippines",
    rating: 5,
    price: 450,
    image: "/assets/img/rooms/7.jpg",
    amenities: ["Free WiFi", "Spa", "Restaurant", "Pool", "Gym", "Rooftop Bar"],
    description: "Ultimate luxury experience with stunning city views from our rooftop in Bonifacio Global City.",
    available: true,
    distance: "0.4 km from center",
    reviewCount: 2034,
    address: "Taguig, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@luxurytower.com",
    website: "https://luxurytower.com",
    latitude: 14.5547,
    longitude: 121.0244,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/7.jpg",
        thumbnail_url: "/assets/img/rooms/7.jpg",
        description: "Luxury tower"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/7",
        method: "GET"
      }
    }
  },
  {
    id: 8,
    name: "Business Center Hotel",
    location: "Ortigas, Philippines",
    rating: 4,
    price: 189,
    image: "/assets/img/rooms/8.jpg",
    amenities: ["Free WiFi", "Business Center", "Restaurant"],
    description: "Perfect for business travelers with excellent conference facilities in Ortigas Center.",
    available: true,
    distance: "0.6 km from center",
    reviewCount: 756,
    address: "Ortigas, Philippines",
    phone: "+63 2 1234 5678",
    email: "info@businesscenter.com",
    website: "https://businesscenter.com",
    latitude: 14.5895,
    longitude: 121.0752,
    
    // Required fields for new Hotel interface
    images: [
      {
        url: "/assets/img/rooms/8.jpg",
        thumbnail_url: "/assets/img/rooms/8.jpg",
        description: "Business center"
      }
    ],
    videos: [],
    links: {
      self: {
        href: "https://api-staging.littleemperors.com/v2/hotels/8",
        method: "GET"
      }
    }
  }
];

/**
 * Filter mock hotels based on search criteria
 */
export const filterMockHotels = (query: string, filters?: {
  priceRange?: string;
  rating?: string;
  sortBy?: string;
}): Hotel[] => {
  let filtered = mockHotels.filter(hotel => 
    hotel.name.toLowerCase().includes(query.toLowerCase()) ||
    hotel.location.toLowerCase().includes(query.toLowerCase()) ||
    hotel.description.toLowerCase().includes(query.toLowerCase())
  );

  // Apply price filter
  if (filters?.priceRange && filters.priceRange !== 'all') {
    filtered = filtered.filter(hotel => {
      const price = hotel.price || 0;
      switch (filters.priceRange) {
        case 'low':
          return price < 200;
        case 'medium':
          return price >= 200 && price < 300;
        case 'high':
          return price >= 300;
        default:
          return true;
      }
    });
  }

  // Apply rating filter
  if (filters?.rating && filters.rating !== 'all') {
    const minRating = parseInt(filters.rating);
    filtered = filtered.filter(hotel => (hotel.rating || 0) >= minRating);
  }

  // Apply sorting
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'distance':
        filtered = [...filtered].sort((a, b) => {
          const aDist = parseFloat(a.distance?.split(' ')[0] || '0');
          const bDist = parseFloat(b.distance?.split(' ')[0] || '0');
          return aDist - bDist;
        });
        break;
      default:
        break;
    }
  }

  return filtered;
};

/**
 * Get hotels from the provided API data
 */
export const getProvidedApiHotels = (): Hotel[] => {
  const apiData = [
    {
      "id": 5772,
      "text": "Philippines",
      "type": "location",
      "location": "Philippines"
    },
    {
      "id": 9536,
      "text": "Discovery Suites Manila, Philippines",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 322,
      "text": "Amanpulo",
      "type": "hotel",
      "location": "Pamalican Island, Philippines"
    },
    {
      "id": 8397,
      "text": "Conrad Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 321,
      "text": "Raffles Makati",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 320,
      "text": "Fairmont Makati",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 9535,
      "text": "Discovery Primea Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 323,
      "text": "The Peninsula Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 12025,
      "text": "Admiral Hotel Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 9182,
      "text": "Anya Resort & Residences Tagaytay",
      "type": "hotel",
      "location": "Tagaytay, Philippines"
    },
    {
      "id": 7017,
      "text": "Edsa Shangri-La, Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 7019,
      "text": "Shangri-La The Fort, Manila",
      "type": "hotel",
      "location": "Manila, Philippines"
    },
    {
      "id": 6988,
      "text": "Shangri-La Boracay Resort & Spa",
      "type": "hotel",
      "location": "Boracay, Philippines"
    },
    {
      "id": 6989,
      "text": "Shangri-La Mactan Island Resort, Cebu",
      "type": "hotel",
      "location": "Cebu City, Philippines"
    }
  ];

  return apiData
    .filter(item => item.type === 'hotel') // Only include hotel items
    .map((item, index) => ({
      id: item.id,
      name: item.text,
      location: item.location,
      rating: Math.floor(Math.random() * 3) + 3, // Random rating between 3-5
      price: Math.floor(Math.random() * 200) + 100, // Random price between 100-300
      image: `/assets/img/rooms/${(index % 8) + 1}.jpg`, // Cycle through available images
      amenities: ['WiFi', 'Pool', 'Restaurant', 'Spa', 'Gym'], // Default amenities
      description: `Experience luxury and comfort at ${item.text}. Located in ${item.location}, this hotel offers world-class amenities and exceptional service.`,
      available: true,
      distance: `${Math.floor(Math.random() * 10) + 1} km from city center`,
      reviewCount: Math.floor(Math.random() * 500) + 50,
      address: `${item.location}`,
      phone: '+63 2 1234 5678',
      email: 'info@example.com',
      website: 'https://example.com',
      latitude: 14.5995, // Manila coordinates
      longitude: 120.9842,
      
      // Required fields for new Hotel interface
      images: [
        {
          url: `/assets/img/rooms/${(index % 8) + 1}.jpg`,
          thumbnail_url: `/assets/img/rooms/${(index % 8) + 1}.jpg`,
          description: 'Hotel image'
        }
      ],
      videos: [],
      links: {
        self: {
          href: `https://api-staging.littleemperors.com/v2/hotels/${item.id}`,
          method: 'GET'
        }
      }
    }));
};
