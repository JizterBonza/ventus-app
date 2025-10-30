import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface HeroSearchFormProps {
    className?: string;
}

const HeroSearchForm: React.FC<HeroSearchFormProps> = ({ className = "" }) => {
    const navigate = useNavigate();
    const [searchData, setSearchData] = useState({
        location: "",
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to search page with search parameters
        const searchParams = new URLSearchParams({
            location: searchData.location,
        });
        navigate(`/search?${searchParams.toString()}`);
    };

    const handleInputChange = (field: string, value: string) => {
        setSearchData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className={`booking-wrapper ${className}`}>
            <div className="container">
                <div className="booking-inner">
                    <form onSubmit={handleSearchSubmit} className="form">
                        <input
                            type="text"
                            placeholder="Enter destination"
                            required
                            value={searchData.location}
                            onChange={(e) => handleInputChange("location", e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">
                            Search Hotels
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HeroSearchForm;
