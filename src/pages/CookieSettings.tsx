import React, { useState } from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const CookieSettings: React.FC = () => {
    const [essentialCookies] = useState(true);
    const [analyticsCookies, setAnalyticsCookies] = useState(false);
    const [marketingCookies, setMarketingCookies] = useState(false);

    const handleSavePreferences = () => {
        // Placeholder for saving cookie preferences
        alert("Cookie preferences saved!");
    };

    return (
        <Layout>
            <PageHeader 
                title="Cookie Settings" 
                backgroundImage="/assets/img/page/contact.webp" 
            />

            <section className="section-text-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="subtitle">Preferences</div>
                            <h2>Manage Your Cookie Settings</h2>
                            <p className="lead mb-5">
                                We use cookies to enhance your browsing experience. Manage your preferences below.
                            </p>
                            
                            <div className="text-start">
                                <h4>What Are Cookies?</h4>
                                <p>
                                    Cookies are small text files stored on your device when you visit websites. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
                                </p>

                                <div className="cookie-options mt-5">
                                    <div className="cookie-option p-4 mb-3 border rounded">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 className="mb-1">Essential Cookies</h5>
                                                <p className="mb-0 text-muted">Required for the website to function properly. Cannot be disabled.</p>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={essentialCookies}
                                                    disabled
                                                    style={{ width: '3rem', height: '1.5rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="cookie-option p-4 mb-3 border rounded">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 className="mb-1">Analytics Cookies</h5>
                                                <p className="mb-0 text-muted">Help us understand how visitors interact with our website.</p>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={analyticsCookies}
                                                    onChange={(e) => setAnalyticsCookies(e.target.checked)}
                                                    style={{ width: '3rem', height: '1.5rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="cookie-option p-4 mb-3 border rounded">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 className="mb-1">Marketing Cookies</h5>
                                                <p className="mb-0 text-muted">Used to deliver personalized advertisements relevant to you.</p>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={marketingCookies}
                                                    onChange={(e) => setMarketingCookies(e.target.checked)}
                                                    style={{ width: '3rem', height: '1.5rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-grid mt-4">
                                    <button 
                                        type="button" 
                                        className="btn btn-primary btn-lg"
                                        onClick={handleSavePreferences}
                                    >
                                        Save Preferences
                                    </button>
                                </div>

                                <h4 className="mt-5">More Information</h4>
                                <p>
                                    For more details about how we use cookies and process your data, please read our{" "}
                                    <a href="/privacy-policy">Privacy Policy</a>.
                                </p>
                            </div>

                            <div className="mt-5 p-4 bg-light rounded">
                                <p className="mb-0 text-muted">
                                    <em>This is a temporary cookie settings page. Full functionality will be implemented soon.</em>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default CookieSettings;
