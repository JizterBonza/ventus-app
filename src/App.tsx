import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Rooms from "./pages/Rooms";
import Destinations from "./pages/Destinations";
import HotelDetail from "./pages/HotelDetail";
import SearchResults from "./pages/SearchResults";
import Booking from "./pages/Booking";
import BookingTest from "./pages/BookingTest";
import Magazine from "./pages/Magazine";
import MagazinePost from "./pages/MagazinePost";
import BuyOuts from "./pages/Buyouts";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import "./App.css";

console.log("App component is loading");

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
                <AuthProvider>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/about-us" element={<About />} />
                        <Route path="/the-magazine" element={<Magazine />} />
                        <Route path="/magazine/:slug" element={<MagazinePost />} />
                        <Route path="/buy-outs" element={<BuyOuts />} />
                        <Route path="/contact-us" element={<Contact />} />
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/destinations" element={<Destinations />} />
                        <Route path="/search-results" element={<SearchResults />} />
                        <Route path="/hotel/:id" element={<HotelDetail />} />
                        
                        {/* Authentication Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        
                        {/* Protected Routes - Require Authentication */}
                        <Route 
                            path="/booking/:hotelId" 
                            element={
                                <ProtectedRoute>
                                    <Booking />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/booking-test" 
                            element={
                                <ProtectedRoute>
                                    <BookingTest />
                                </ProtectedRoute>
                            } 
                        />
                        
                        {/* 404 Not Found */}
                        <Route
                            path="*"
                            element={
                                <div className="container mt-5 text-center">
                                    <h1>Page Not Found</h1>
                                    <p>The page you're looking for doesn't exist.</p>
                                </div>
                            }
                        />
                    </Routes>
                </AuthProvider>
            </Router>
        </div>
    );
}

export default App;
