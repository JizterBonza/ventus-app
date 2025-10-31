import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";
import { magazinePosts } from "../utils/magazinePosts";
import { MagazinePostWithSlug } from "../types/magazine";

const Magazine: React.FC = () => {
    return (
        <Layout>
            {/* Page Header */}
            <PageHeader title="our travel magazine" text="Your ultimate guide to exploring the world!" />

            {/* Intro Section */}
            {/* Magazine Posts */}
            <section className="news2 section-padding bg-cream">
                <div className="container">
                    <div className="row mb-5 justify-content-md-center">
                        <div className="col-md-8 text-center">
                            <h2>Latest Stories</h2>
                            <p>
                                Join us as we share exciting travel stories, tips, and itineraries that will inspire
                                your next adventure. From breathtaking landscapes to vibrant cultures, we aim to ignite
                                your wanderlust and provide valuable insights for your journeys. Whether you're a
                                seasoned traveler or planning your first trip, our blog is here to help you navigate
                                your way to unforgettable experiences.
                            </p>
                        </div>
                    </div>
                    <div className="row">
                        {magazinePosts.map((post) => (
                            <div key={post.id} className="col-md-4 mb-4">
                                <Link to={`/magazine/${post.slug}`} className="card post-card">
                                    <div className="card-overlay">
                                        <h4>{post.title}</h4>
                                        <span className="date">{post.date}</span>
                                    </div>
                                    <div className="card-image">
                                        <img src={post.image} alt={post.title} />
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default Magazine;
