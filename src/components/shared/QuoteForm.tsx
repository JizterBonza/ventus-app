import React, { useState, useEffect } from "react";

declare const $: any;

const QuoteForm: React.FC = () => {
    const [date, setDate] = useState("");

    // Datepicker initialization
    useEffect(() => {
        if (typeof $ !== "undefined" && $.fn.datepicker) {
            const $dateInput = $(".quote-date-input");

            if ($dateInput.length > 0 && !$dateInput.hasClass("hasDatepicker")) {
                $dateInput.datepicker({
                    dateFormat: "mm/dd/yy",
                    minDate: 0,
                    onSelect: function (dateText: string) {
                        setDate(dateText);
                    },
                });
            }

            return () => {
                if ($dateInput.hasClass("hasDatepicker")) {
                    $dateInput.datepicker("destroy");
                }
            };
        }
    }, []);

    return (
        
            <section id="quote" className="section-quote section-padding section-text-center">
                <div className="container">
                    <div className="global-form">
                        <div className="text-center">
                            <h2>Get a trip quote</h2>
                        </div>
                        <form className="form slim">
                            <div className="d-grid form-row">
                            <div className="form-column">
                                <div className="form-column-inner">
                                    <label htmlFor="firstname" className="form-label">
                                        First Name
                                    </label>
                                    <input type="text" className="form-control" id="firstname" name="firstname" required />
                                </div>
                                <div className="form-column-inner">
                                    <label htmlFor="lastname" className="form-label">
                                        Last Name
                                    </label>
                                    <input type="text" className="form-control" id="lastname" name="lastname" required />
                                    </div>
                                </div>
                                <div className="form-column">
                                <div className="form-column-inner">
                                <label htmlFor="email" className="form-label">
                                    Email Address
                                </label>
                                <input type="email" className="form-control" id="email" name="email" required />
                                </div>
                                <div className="form-column-inner">
                                <label htmlFor="phone" className="form-label">
                                    Phone Number
                                </label>
                                <input type="text" className="form-control" id="phone" name="phone" required />
                                </div>
                                </div>
                                <div className="form-column">
                                <div className="input1_wrapper">
                                    <label htmlFor="date" className="form-label">
                                        Date
                                    </label>
                                    <div className="input1_inner">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="19" viewBox="0 0 21 19" fill="none">
                                            <path d="M16.3194 1.49297H15.8616V0.538078C15.8616 0.362225 15.6909 0.21978 15.4801 0.21978C15.2693 0.21978 15.0986 0.362218 15.0986 0.538078V1.49297H5.94249V0.538078C5.94249 0.362225 5.77176 0.21978 5.56098 0.21978C5.3502 0.21978 5.17948 0.362218 5.17948 0.538078V1.49297H4.34017C3.24716 1.49297 2.19907 1.85504 1.4263 2.49959C0.653746 3.14415 0.219788 4.01867 0.219788 4.93071V15.2436C0.219788 16.1555 0.653746 17.03 1.4263 17.6747C2.19885 18.3193 3.24701 18.6813 4.34017 18.6813H16.3192C17.4122 18.6813 18.4603 18.3193 19.2331 17.6747C20.0056 17.0301 20.4396 16.1556 20.4396 15.2436V4.93071C20.4396 4.01878 20.0056 3.14434 19.2331 2.49959C18.4605 1.85504 17.4123 1.49297 16.3192 1.49297H16.3194ZM4.34037 2.12957H5.17968V3.08446C5.17968 3.26032 5.3504 3.40276 5.56119 3.40276C5.77197 3.40276 5.94269 3.26032 5.94269 3.08446V2.12957H15.0988V3.08446C15.0988 3.26032 15.2695 3.40276 15.4803 3.40276C15.6911 3.40276 15.8618 3.26032 15.8618 3.08446V2.12957H16.3196C17.2133 2.12082 18.0726 2.41364 18.7049 2.94044C19.3362 3.46802 19.6872 4.18498 19.6767 4.93053V5.63078H0.983263V4.93053C0.972772 4.18491 1.32375 3.46795 1.95515 2.94044C2.58749 2.41366 3.44682 2.12083 4.34041 2.12957H4.34037ZM16.3194 18.0445H4.34037C3.4467 18.0532 2.58737 17.7604 1.95511 17.2336C1.32373 16.706 0.972744 15.9891 0.983222 15.2435V6.26768H19.6767V15.2435C19.6872 15.9891 19.3362 16.7061 18.7048 17.2336C18.0725 17.7604 17.2131 18.0532 16.3196 18.0445H16.3194Z" fill="black" stroke="black" strokeWidth="0.43956"/>
                                        </svg>
                                        <input
                                            type="text"
                                            className="form-control input quote-date-input"
                                            id="date"
                                            name="date"
                                            placeholder="Select date"
                                            value={date}
                                            readOnly
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input1_wrapper">
                                    <label htmlFor="guests" className="form-label">
                                        Guests
                                    </label>
                                    <div className="input1_inner">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="19" viewBox="0 0 16 19" fill="none">
                                            <path d="M7.91134 0C5.48352 0 3.50717 1.9543 3.50717 4.3486C3.50717 6.74213 5.4843 8.69197 7.91134 8.69197C10.3392 8.69197 12.3208 6.74213 12.3208 4.3486C12.3208 1.95507 10.3392 0 7.91134 0ZM7.91134 1.15384C9.70658 1.15384 11.1508 2.57811 11.1508 4.3486C11.1508 6.11905 9.70661 7.53813 7.91134 7.53813C6.11607 7.53813 4.67342 6.11818 4.67342 4.3486C4.67342 2.57814 6.11616 1.15384 7.91134 1.15384ZM7.91134 9.22504C3.53853 9.22504 0 12.7146 0 17.0272V17.8868C0.000731246 18.0397 0.0628864 18.1861 0.173299 18.2942C0.283717 18.4017 0.432164 18.4623 0.587914 18.4615C0.909662 18.4608 1.16998 18.2041 1.17144 17.8868V17.0272C1.17144 13.3341 4.16663 10.3789 7.91139 10.3789C11.6561 10.3789 14.6527 13.3343 14.6527 17.0272V17.8868C14.6535 18.0397 14.7156 18.1861 14.8253 18.2942C14.9357 18.4017 15.0849 18.4623 15.2399 18.4615C15.5617 18.4608 15.8227 18.2041 15.8242 17.8868V17.0272C15.8242 12.7147 12.285 9.22504 7.91206 9.22504H7.91134Z" fill="black"/>
                                        </svg>
                                        <select
                                            className="form-control input guest-select"
                                            id="guests"
                                            name="guests"
                                        >
                                            <option value="1">1 adult</option>
                                            <option value="2">2 adults</option>
                                            <option value="3">3 adults</option>
                                            <option value="4">4 adults</option>
                                            <option value="5">5 adults</option>
                                            <option value="6">6 adults</option>
                                        </select>
                                    </div>
                                </div>
                                </div>
                            </div>
                            <div className="d-grid form-row">
                                <div className="form-column form-col-full">
                                    
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
                            </div>
                            <div className="d-grid form-row">
                                <div className="form-column form-col-full">
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
       );
};

export default QuoteForm;
