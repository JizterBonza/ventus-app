import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const Magazine: React.FC = () => {
    return (
        <Layout>
            {/* Page Header */}
            <PageHeader
                title="The Magazine"
                breadcrumbs={[
                    { label: "Home", path: "/" },
                    { label: "Magazine", active: true },
                ]}
            />

            {/* About Content */}
            <section className="about-content section-padding">
                <div className="container">
                    <div className="row d-flex align-items-center">
                        <div className="col-md-7">
                            <div className="about-text">
                                <h2>
                                    Welcome to my world, where elegance meets exploration and unforgettable adventure
                                    awaits!
                                </h2>
                                <p>
                                    I am Daniella, a passionate traveller with a deep appreciation for the finer things
                                    in life. Over the years, I've had the privilege of exploring some of the most
                                    breathtaking corners of the world, each adventure revealing unique experiences and
                                    hidden gems that I can't wait to share with you. From exclusive resorts to private
                                    jet charters, my goal is to elevate your travel experience beyond the ordinary, to
                                    make memories that will last a life time. Join me as I unveil the world’s most
                                    magical destinations, share insider insights, and provide tailored recommendations
                                    that will elevate your travel experience to new heights.{" "}
                                </p>
                                <p>
                                    <strong>
                                        Whether you just seek access to our unique benefits or desire extra assistance
                                        to make your journey truly unforgettable, our team is dedicated to turning all
                                        your travel dreams into reality.
                                    </strong>
                                </p>
                            </div>
                        </div>
                        <div className="col-md-5">
                            <div className="about-images">
                                <img src="/assets/img/clients/7.webp" alt="Hotel Interior" className="img-fluid" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default Magazine;
