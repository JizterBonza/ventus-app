import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const TermsOfService: React.FC = () => {
    return (
        <Layout>
            <PageHeader 
                title="Terms of Service" 
                backgroundImage="/assets/img/page/contact.webp" 
            />

            <section className="section-text-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="subtitle">Legal</div>
                            <h2>Terms of Service</h2>
                            <p className="lead mb-5">
                                Please read these terms of service carefully before using our website and booking services.
                            </p>
                            
                            <div className="text-start">
                                <h4>Acceptance of Terms</h4>
                                <p>
                                    By accessing and using the Ventus Travel website and services, you accept and agree to be bound by these terms and conditions.
                                </p>

                                <h4>Booking and Reservations</h4>
                                <p>
                                    All bookings are subject to availability and confirmation. We act as an intermediary between you and accommodation providers.
                                </p>

                                <h4>Cancellation Policy</h4>
                                <p>
                                    Cancellation policies vary by property and booking type. Please review the specific cancellation terms provided at the time of booking.
                                </p>

                                <h4>User Responsibilities</h4>
                                <p>
                                    You are responsible for providing accurate information when making bookings and for complying with all applicable laws and regulations.
                                </p>

                                <h4>Limitation of Liability</h4>
                                <p>
                                    Ventus Travel shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.
                                </p>

                                <h4>Changes to Terms</h4>
                                <p>
                                    We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of the updated terms.
                                </p>

                                <h4>Contact Us</h4>
                                <p>
                                    If you have any questions about these Terms of Service, please contact us at{" "}
                                    <a href="mailto:daniella@ventustravel.co.uk">daniella@ventustravel.co.uk</a>
                                </p>
                            </div>

                            <div className="mt-5 p-4 bg-light rounded">
                                <p className="mb-0 text-muted">
                                    <em>This is a temporary terms of service page. Full terms will be added soon.</em>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default TermsOfService;
