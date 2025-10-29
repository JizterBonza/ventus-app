import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Rooms from './pages/Rooms';
import Search from './pages/Search';
import HotelDetail from './pages/HotelDetail';
import Booking from './pages/Booking';
import BookingTest from './pages/BookingTest';
import './App.css';

console.log('App component is loading');

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/search" element={<Search />} />
          <Route path="/hotel/:id" element={<HotelDetail />} />
          <Route path="/booking/:hotelId" element={<Booking />} />
          <Route path="/booking-test" element={<BookingTest />} />
          <Route path="*" element={<div className="container mt-5 text-center"><h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p></div>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
