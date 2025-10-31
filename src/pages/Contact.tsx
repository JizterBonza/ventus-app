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
            <PageHeader title="Contact Us" backgroundImage="/assets/img/page/contact.webp" />

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
                            <ul className="contact-list list-unstyled">
                                <li>
                                    <svg
                                        width=" 100%"
                                        height=" 100%"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M20 4H4C2.897 4 2 4.897 2 6V18C2 19.103 2.897 20 4 20H20C21.103 20 22 19.103 22 18V6C22 4.897 21.103 4 20 4ZM20 6V6.511L12 12.734L4 6.512V6H20ZM4 18V9.044L11.386 14.789C11.5611 14.9265 11.7773 15.0013 12 15.0013C12.2227 15.0013 12.4389 14.9265 12.614 14.789L20 9.044L20.002 18H4Z"
                                            fill="currentColor"
                                        ></path>
                                    </svg>
                                    <a href="mailto:daniella@ventustravel.co.uk">daniella@ventustravel.co.uk</a>
                                </li>
                                <li>
                                    <svg
                                        width=" 100%"
                                        height=" 100%"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 14C14.206 14 16 12.206 16 10C16 7.794 14.206 6 12 6C9.794 6 8 7.794 8 10C8 12.206 9.794 14 12 14ZM12 8C13.103 8 14 8.897 14 10C14 11.103 13.103 12 12 12C10.897 12 10 11.103 10 10C10 8.897 10.897 8 12 8Z"
                                            fill="currentColor"
                                        ></path>
                                        <path
                                            d="M11.42 21.814C11.5892 21.9349 11.792 21.9998 12 21.9998C12.208 21.9998 12.4107 21.9349 12.58 21.814C12.884 21.599 20.029 16.44 20 10C20 5.589 16.411 2 12 2C7.589 2 4 5.589 4 9.995C3.971 16.44 11.116 21.599 11.42 21.814ZM12 4C15.309 4 18 6.691 18 10.005C18.021 14.443 13.612 18.428 12 19.735C10.389 18.427 5.979 14.441 6 10C6 6.691 8.691 4 12 4Z"
                                            fill="currentColor"
                                        ></path>
                                    </svg>
                                    6 South Molton Street, London, W1K 5QF
                                </li>
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
