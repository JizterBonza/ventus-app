import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const PrivacyPolicy: React.FC = () => {
    return (
        <Layout>
            <PageHeader 
                title="Privacy Policy" 
                backgroundImage="/assets/img/page/contact.webp" 
            />

            <section className="section-text-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="subtitle">Legal</div>
                            <h2>Privacy Policy</h2>
                            <p className="lead mb-5">
                                Your privacy is important to us. This page will contain our full privacy policy outlining how we collect, use, and protect your personal information.
                            </p>
                            
                            <div className="text-start">
                                <h4>Information We Collect</h4>
                                <p>
                                    We collect information you provide directly to us, such as when you create an account, make a booking, or contact us for support.
                                </p>

                                <h4>How We Use Your Information</h4>
                                <p>
                                    We use the information we collect to provide, maintain, and improve our services, process your bookings, and communicate with you.
                                </p>

                                <h4>Information Sharing</h4>
                                <p>
                                    We do not sell your personal information. We may share your information with hotels and service providers as necessary to complete your bookings.
                                </p>

                                <h4>Data Security</h4>
                                <p>
                                    We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or destruction.
                                </p>

                                <h4>Contact Us</h4>
                                <p>
                                    If you have any questions about this Privacy Policy, please contact us at{" "}
                                    <a href="mailto:daniella@ventustravel.co.uk">daniella@ventustravel.co.uk</a>
                                </p>
                            </div>

                            <div className="mt-5 p-4 bg-light rounded">
                                <p className="mb-0 text-muted">
                                    <em>This is a temporary privacy policy page. Full policy content will be added soon.</em>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default PrivacyPolicy;
