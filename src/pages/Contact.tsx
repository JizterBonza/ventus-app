import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";
import Accordion from "../components/shared/Accordion";
const Contact: React.FC = () => {
    const faqs = [
        {
            question: "HOW DO I BOOK?",
            answer: "Booking with Ventus is easy. Simply go to our contact us page, let us know your destination, travel dates, and follow the prompts to complete your enquiry. Our team will come back to you with options to book and any help that you may require.",
        },
        {
            question: "WHAT ARE THE PAYMENT OPTIONS?",
            answer: "We accept various payment methods, including credit cards, debit cards, and online bank transfers. You can choose the option that is most convenient for you during the booking process.",
        },
        {
            question: "CAN I CANCEL MY BOOKING?",
            answer: "Yes, if the cancellation policy upon making your booking allows. Often there will be the option for you to pick a refundable or non refundable rate, which may affect the rate the hotel charges. You can contact our customer support team by WhatsApp, email, or through our website's live chat feature and we will be more than happy to assist.",
        },
        {
            question: "HOW CAN I CONTACT YOU?",
            answer: "You can contact our customer support team by our contact us page, WhatsApp, email, or through our website's live chat feature. We are UK based and available throughout the day to assist you with any questions or concerns you may have.",
        },
    ];
    return (
        <Layout>
            {/* Page Header */}
            <PageHeader
                title="Contact Us"
                backgroundImage="/assets/img/page/contact.webp"
                breadcrumbs={[
                    { label: "Home", path: "/" },
                    { label: "Contact Us", active: true },
                ]}
            />

            {/* About Content */}
            <section className="section-text-center section-contact">
                <div className="container">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="subtitle">Contact</div>
                            <h2>Get in Touch</h2>
                            <p>
                                Please provide us with your travel details so we can assist you better. <br />
                                Our team will get back to you promptly to help you book your perfect trip!
                            </p>
                            <ul>
                                <li>
                                    <a href="mailto:daniella@ventustravel.co.uk">daniella@ventustravel.co.uk</a>
                                </li>
                                <li>6 South Molton Street, London, W1K 5QF</li>
                            </ul>
                        </div>
                        <div className="col-md-6">
                            <div className="global-form">
                                <form className="form slim">
                                    <div className="form-column">
                                        <label htmlFor="firstname" className="form-label">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="firstname"
                                            name="firstname"
                                            required
                                        />

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
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="lastname"
                                            name="lastname"
                                            required
                                        />

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
                    </div>
                </div>
            </section>

            <Accordion
                id="faqs"
                title="FAQs"
                text="Find answers to common questions about travel arrangements, booking process, and our services."
                faqs={faqs}
            />
        </Layout>
    );
};

export default Contact;
