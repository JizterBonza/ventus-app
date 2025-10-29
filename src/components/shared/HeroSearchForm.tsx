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
                <div className="booking-inner clearfix">
                    <form onSubmit={handleSearchSubmit} className="form1 clearfix">
                        <div className="col1 c1" style={{ width: "65%" }}>
                            <div className="input1_wrapper">
                                <label>Location</label>
                                <div className="input1_inner">
                                    <input
                                        type="text"
                                        className="form-control input"
                                        placeholder="Enter destination"
                                        value={searchData.location}
                                        onChange={(e) => handleInputChange("location", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col4 c5" style={{ width: "35%" }}>
                            <button type="submit" className="btn-form1-submit">
                                Search Hotels
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HeroSearchForm;
