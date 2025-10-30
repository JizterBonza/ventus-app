import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const BuyOuts: React.FC = () => {
    return (
        <Layout>
            {/* Page Header */}
            <PageHeader
                title="Buy out your favourite properties and make them your private oasis."
                text="Discover the breathtaking destinations Ventus Luxury Travel has to offer."
                backgroundImage="/assets/img/page/buyout.webp"
                breadcrumbs={[
                    { label: "Home", path: "/" },
                    { label: "Buy Outs", active: true },
                ]}
            />

            {/* About Content */}
            <section className="section-padding section-text-center">
                <div className="container">
                    <div className="global-form">
                        <div className="text-center">
                            <h2>Submit a proposal for request</h2>
                        </div>
                        <form className="form slim">
                            <div className="form-column">
                                <label htmlFor="firstname" className="form-label">
                                    First Name
                                </label>
                                <input type="text" className="form-control" id="firstname" name="firstname" required />

                                <label htmlFor="email" className="form-label">
                                    Email Address
                                </label>
                                <input type="email" className="form-control" id="email" name="email" required />

                                <label htmlFor="date" className="form-label">
                                    Date
                                </label>
                                <input type="date" className="form-control" id="date" name="date" required />
                            </div>

                            <div className="form-column">
                                <label htmlFor="lastname" className="form-label">
                                    Last Name
                                </label>
                                <input type="text" className="form-control" id="lastname" name="lastname" required />

                                <label htmlFor="phone" className="form-label">
                                    Phone Number
                                </label>
                                <input type="text" className="form-control" id="phone" name="phone" required />

                                <label htmlFor="roomType" className="form-label">
                                    Choose a topic
                                </label>
                                <select className="form-select" id="roomType" name="roomType">
                                    <option value="">Select a topic</option>
                                    <option value="wedding">Wedding</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="privacy">Privacy</option>
                                    <option value="business">Business</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="d-grid form-row">
                                <div className="form-column">
                                    <label htmlFor="message" className="form-label">
                                        Message
                                    </label>
                                    <textarea
                                        className="form-control"
                                        id="message"
                                        name="message"
                                        placeholder="Type your message"
                                        rows={5}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="d-grid">
                                <button type="submit" className="btn btn-primary btn-lg">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default BuyOuts;
