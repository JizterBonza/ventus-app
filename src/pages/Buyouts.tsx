import React, { useState } from "react";
import Layout from "../components/layout/Layout";
import "./RecoveryPages.css";

const BuyOuts: React.FC = () => {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(true);
    };

    return (
        <Layout>
            <div
                className="ventus-recovery-page ventus-buyouts-page"
                data-wf-site="677faee4ec02118e52414101"
                data-wf-page="677faee4ec02118e52414116"
            >
                <header className="ventus-buyouts-hero" aria-labelledby="buyouts-heading">
                    <img
                        className="ventus-buyouts-hero-image"
                        src="/assets/img/recovered/buyouts-hero.webp"
                        alt="A private lakeside property surrounded by lush gardens"
                        width="1920"
                        height="1280"
                        loading="eager"
                        decoding="async"
                    />
                    <div className="ventus-buyouts-shade" />
                    <div className="ventus-recovery-container ventus-buyouts-hero-copy ventus-reveal">
                        <h1 id="buyouts-heading">
                            Buy out your favourite properties and make them your private oasis.
                        </h1>
                        <p>Discover the breathtaking destinations Ventus Luxury Travel has to offer.</p>
                    </div>
                    <a className="ventus-scroll-cue" href="#proposal-form">
                        <span>Scroll to discover more</span>
                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m2 5 6 6 6-6" /></svg>
                    </a>
                </header>

                <section className="ventus-proposal-section" id="proposal-form" aria-labelledby="proposal-heading">
                    <div className="ventus-form-container">
                        <div className="ventus-form-heading">
                            <span aria-hidden="true" />
                            <h2 id="proposal-heading">Submit a proposal for request</h2>
                            <span aria-hidden="true" />
                        </div>

                        {submitted ? (
                            <div className="ventus-form-success" role="status" tabIndex={-1}>
                                <span aria-hidden="true">✓</span>
                                <h3>Thank you</h3>
                                <p>Your proposal request has been received. Daniella will be in touch soon.</p>
                                <button type="button" onClick={() => setSubmitted(false)}>Send another request</button>
                            </div>
                        ) : (
                            <form className="ventus-proposal-form" onSubmit={handleSubmit}>
                                <div className="ventus-form-grid">
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-first-name">First name</label>
                                        <input id="buyout-first-name" name="firstName" type="text" autoComplete="given-name" required />
                                    </div>
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-last-name">Last name</label>
                                        <input id="buyout-last-name" name="lastName" type="text" autoComplete="family-name" required />
                                    </div>
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-email">Email</label>
                                        <input id="buyout-email" name="email" type="email" autoComplete="email" required />
                                    </div>
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-phone">Phone number</label>
                                        <input id="buyout-phone" name="phone" type="tel" autoComplete="tel" required />
                                    </div>
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-date">Date</label>
                                        <input id="buyout-date" name="date" type="date" />
                                    </div>
                                    <div className="ventus-field">
                                        <label htmlFor="buyout-topic">Choose a topic</label>
                                        <select id="buyout-topic" name="topic" defaultValue="" required>
                                            <option value="" disabled>Select field</option>
                                            <option value="wedding">Wedding</option>
                                            <option value="birthday">Birthday</option>
                                            <option value="privacy">Privacy</option>
                                            <option value="business">Business</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="ventus-field ventus-field-message">
                                    <label htmlFor="buyout-message">Message</label>
                                    <textarea
                                        id="buyout-message"
                                        name="message"
                                        placeholder="Type your message..."
                                        maxLength={5000}
                                        rows={6}
                                        required
                                    />
                                </div>
                                <label className="ventus-consent" htmlFor="buyout-terms">
                                    <input id="buyout-terms" name="terms" type="checkbox" required />
                                    <span>I accept the <a href="/terms-of-service">Terms</a></span>
                                </label>
                                <button className="ventus-form-submit" type="submit">Submit</button>
                            </form>
                        )}
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default BuyOuts;
