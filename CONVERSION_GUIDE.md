# Demo1-Light to React Conversion Guide

## Overview
This guide provides step-by-step instructions to complete the conversion of the demo1-light HTML template to a React application.

## Current Status
✅ **Completed:**
- Basic React app structure
- Header component with navigation
- Footer component
- Layout wrapper component
- Home page with slider and booking form
- About page
- Rooms page with filtering
- Routing setup
- CSS imports

## Next Steps

### 1. Copy Assets
```bash
# Copy CSS files
Copy-Item -Path "..\demo1-light\css\*" -Destination "public\assets\css\" -Recurse -Force

# Copy JavaScript files  
Copy-Item -Path "..\demo1-light\js\*" -Destination "public\assets\js\" -Recurse -Force

# Copy images
Copy-Item -Path "..\demo1-light\img\*" -Destination "public\assets\img\" -Recurse -Force

# Copy fonts
Copy-Item -Path "..\demo1-light\fonts\*" -Destination "public\assets\fonts\" -Recurse -Force
```

### 2. Create Additional Pages
Create these React components in `src/pages/`:

- `Contact.tsx` - Contact page
- `Restaurant.tsx` - Restaurant page
- `SpaWellness.tsx` - Spa & Wellness page
- `Services.tsx` - Services page
- `Gallery.tsx` - Gallery page
- `Team.tsx` - Team page
- `Pricing.tsx` - Pricing page
- `Careers.tsx` - Careers page
- `FAQ.tsx` - FAQ page
- `News.tsx` - News page
- `Post.tsx` - Blog post page
- `RoomDetails.tsx` - Room details page
- `NotFound.tsx` - 404 page

### 3. Update App.tsx Routes
Add routes for new pages:

```tsx
import Contact from './pages/Contact';
import Restaurant from './pages/Restaurant';
// ... other imports

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/restaurant" element={<Restaurant />} />
        <Route path="/spa-wellness" element={<SpaWellness />} />
        <Route path="/services" element={<Services />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/team" element={<Team />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/news" element={<News />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/room-details/:id" element={<RoomDetails />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
```

### 4. Create Reusable Components
Create these components in `src/components/`:

#### Layout Components
- `src/components/layout/Navigation.tsx` - Separate navigation logic
- `src/components/layout/Breadcrumb.tsx` - Breadcrumb component

#### Shared Components
- `src/components/shared/Button.tsx` - Reusable button component
- `src/components/shared/Card.tsx` - Card component
- `src/components/shared/Modal.tsx` - Modal component
- `src/components/shared/Form.tsx` - Form components

#### Home Components
- `src/components/home/Hero.tsx` - Hero slider
- `src/components/home/BookingForm.tsx` - Booking form
- `src/components/home/About.tsx` - About section
- `src/components/home/Rooms.tsx` - Rooms section

#### Room Components
- `src/components/rooms/RoomCard.tsx` - Room card component
- `src/components/rooms/RoomFilter.tsx` - Room filter component
- `src/components/rooms/RoomGallery.tsx` - Room gallery

### 5. Convert JavaScript Functionality
Replace jQuery functionality with React hooks:

#### Slider/Carousel
```tsx
// Replace owl-carousel with React state
const [currentSlide, setCurrentSlide] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, 5000);
  return () => clearInterval(interval);
}, [slides.length]);
```

#### Form Handling
```tsx
// Replace jQuery form handling with React state
const [formData, setFormData] = useState({
  checkIn: '',
  checkOut: '',
  adults: '1',
  children: '0',
  rooms: '1'
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Handle form submission
};
```

#### Smooth Scrolling
```tsx
// Replace jQuery smooth scroll with React
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
```

### 6. Add TypeScript Interfaces
Create `src/types/index.ts`:

```tsx
export interface Room {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  amenities: string[];
}

export interface BookingForm {
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  rooms: string;
}

export interface TeamMember {
  id: number;
  name: string;
  position: string;
  image: string;
  email: string;
  social: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
  };
}
```

### 7. Add Custom Hooks
Create `src/hooks/`:

- `useScrollPosition.ts` - Track scroll position
- `useLocalStorage.ts` - Local storage hook
- `useBooking.ts` - Booking form logic
- `useRooms.ts` - Rooms data and filtering

### 8. Add Utility Functions
Create `src/utils/`:

- `dateUtils.ts` - Date formatting and validation
- `validation.ts` - Form validation
- `constants.ts` - App constants
- `helpers.ts` - Helper functions

### 9. Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test
```

### 10. Build and Deploy
```bash
# Build for production
npm run build

# Test build locally
npx serve -s build
```

## Key Conversion Points

### HTML to JSX
- `class` → `className`
- `for` → `htmlFor`
- `onclick` → `onClick`
- `onchange` → `onChange`

### Event Handling
- Replace jQuery event handlers with React event handlers
- Use `useEffect` for side effects
- Use `useState` for state management

### Routing
- Replace `<a href="page.html">` with `<Link to="/page">`
- Use React Router for navigation
- Handle dynamic routes with parameters

### Styling
- Update CSS class references to use `/assets/` path
- Convert inline styles to React style objects
- Use CSS modules or styled-components if needed

### JavaScript Libraries
- Replace jQuery plugins with React alternatives
- Use React-specific libraries (react-slick for carousels, etc.)
- Implement custom hooks for complex functionality

## File Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   └── Navigation.tsx
│   ├── shared/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── home/
│   │   ├── Hero.tsx
│   │   ├── BookingForm.tsx
│   │   └── About.tsx
│   └── rooms/
│       ├── RoomCard.tsx
│       └── RoomFilter.tsx
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Rooms.tsx
│   └── Contact.tsx
├── hooks/
│   ├── useScrollPosition.ts
│   └── useBooking.ts
├── utils/
│   ├── dateUtils.ts
│   └── validation.ts
├── types/
│   └── index.ts
└── App.tsx
```

## Running the Application
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Notes
- Keep the same visual design and functionality as the original template
- Ensure responsive design works correctly
- Test all interactive elements
- Optimize for performance
- Add proper error handling
- Implement accessibility features
