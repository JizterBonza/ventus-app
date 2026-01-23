import React from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";

const TermsOfService: React.FC = () => {
    return (
        <Layout>
            <PageHeader 
                title="Terms & Conditions" 
                backgroundImage="/assets/img/page/contact.webp" 
            />

            <section className="section-text-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="subtitle">Legal</div>
                            <h2>Terms & Conditions</h2>
                            <p className="lead">Ventus Travel Ltd</p>
                            <p className="text-muted mb-5">Last Updated: January 2026</p>
                            
                            <div className="text-start">
                                <p>
                                    As a registered client of Ventus Travel Ltd ("Client"), you agree to abide by these Terms and Conditions, and when ordering or purchasing anything from a supplier of products or services (a "Supplier") you agree that these Terms and Conditions shall apply to your order. These Terms and Conditions shall prevail over any other terms and conditions in any form whatsoever.
                                </p>
                                <p>
                                    The following terms and conditions, along with the Privacy Policy and Cookie Policy (collectively, the "Terms") govern the use of and access to all information and services which Ventus Travel may offer or make available from time to time via our website (www.ventustravel.co.uk), through direct messaging and other forms of communications (i.e. WhatsApp, emails, SMS, telephone calls, etc.) together, the "Services".
                                </p>
                                <p>
                                    The Services are provided to you by Ventus Travel Ltd, a private limited company incorporated under the laws of England & Wales ("Ventus Travel", "we", "our" or "us").
                                </p>
                                <p className="mb-5">
                                    We make our content available to you and offer our Services subject to your acceptance of and compliance with these Terms. If you wish not to agree to or comply with these Terms, please refrain from using our Services.
                                </p>

                                <h4>1. Definitions</h4>
                                <p><strong>"Benefits"</strong> means the benefits made available to Clients by Suppliers.</p>
                                <p><strong>"Booking Fee"</strong> means the fee associated with bookings made on behalf of Clients as such may vary from time to time.</p>
                                <p><strong>"Client"</strong> means the person whose name is registered for services with Ventus Travel.</p>
                                <p><strong>"Payment Card"</strong> means the debit or credit card information supplied by Client and used to process payment for Booking Fees, payment for other products and services, securing of hotel bookings and other payments of any kind processed in connection with the Services.</p>
                                <p><strong>"Request"</strong> means request placed by a Client with Ventus Travel.</p>
                                <p className="mb-4"><strong>"Supplier"</strong> means any third party who offers any goods or services to a Client via Ventus Travel, acting on behalf of or as agent for the same Client.</p>

                                <h4>2. Client Registration</h4>
                                <p>2.1 Access to Ventus Travel services is subject to verification and acceptance by Ventus Travel at its sole discretion.</p>
                                <p>2.2 You agree to ensure you provide correct details when you register with Ventus Travel and your failure to do so may invalidate your access to services. Your responsibility to provide accurate information is a continuing obligation and you must notify Ventus Travel in the event that any information provided by you changes.</p>
                                <p>2.3 We reserve the right to discontinue or modify these terms and conditions at any time.</p>
                                <p>2.4 The Services are licensed to you personally. As such, the Services cannot be assigned, licensed, sub-licensed or otherwise transferred to anyone other than you at any time without the prior written consent of Ventus Travel.</p>
                                <p>2.5 All reservations made should be for your own personal use only. If you wish to appoint somebody to make reservations on your behalf, please provide their information to the Ventus Travel team by email.</p>
                                <p className="mb-4">2.6 Services are only available to persons over the age of 18. Any unauthorised or attempted use by persons under the age of 18 will be null and void.</p>

                                <h4>3. Booking and Payment</h4>
                                <p>3.1 Ventus Travel acts solely as an agent, booking any Services on your behalf. When you make a booking via Ventus Travel you are entering into a contract with the hotel or the Supplier only. As an agent we accept no responsibility for the acts or omissions of the hotel or its Supplier and do not assume any responsibility or liability should a Supplier breach any of its contractual obligations.</p>
                                <p>3.2 When you book a hotel or a Service via Ventus Travel, the terms and conditions of the hotel or Supplier of the Service will apply to your booking and we advise that you should read and understand these terms carefully.</p>
                                <p>3.3 To secure a room, product, or service reservation, you will need to provide your credit card details. For your protection, all online payments are processed through secure servers. Ventus Travel will collect your credit card information and securely transmit it to the hotel to guarantee your reservation.</p>
                                <p>3.4 The hotel may use your credit card to charge a deposit, as specified at the time of booking, or to secure payment in case of a no-show, cancellation, or reservation change.</p>
                                <p>3.5 All currency conversions are based on exchange rate data and are accurate only on the date of booking as a guideline. Payments are made in the hotel's local currency and may be affected by exchange-rate fluctuations and any charges imposed by your bank or credit card issuer.</p>
                                <p className="mb-4">3.6 Payment is made to the hotel directly on check out unless otherwise specified.</p>

                                <h4>4. Confirmations</h4>
                                <p>4.1 Your booking is confirmed, and a contract between you and the hotel is established when we send you a confirmation on the hotel's behalf. Please review your confirmation carefully and inform us immediately of any inaccuracies or incomplete details.</p>
                                <p>4.2 Ensure that the names provided match exactly with those on the relevant passport. Since we act solely as a booking agent, we are not responsible for any errors in documentation except those made by us.</p>
                                <p className="mb-4">4.3 You will receive a confirmation email within 24 hours of booking; it is your responsibility to contact Ventus Travel if you do not receive it. A reservation is only considered valid when a reservation number has been issued.</p>

                                <h4>5. Amendment & Cancellation Policy</h4>
                                <p>5.1 To amend or cancel a confirmed booking, you must contact us directly. Changes and cancellations are subject to the hotel's terms and conditions. Once a booking is confirmed, you are bound by the hotel's cancellation policy.</p>
                                <p>5.2 Hotel cancellation policies often include a specific time frame before check-in during which cancellations will incur a charge. For example, a '24-hour' cancellation policy requires cancellation at least 24 hours before the hotel's check-in time on the day before arrival to avoid a penalty.</p>
                                <p>5.3 Refunds, where applicable, will be processed using the original payment method. Payments made by credit card will be refunded to the same card.</p>
                                <p className="mb-4">5.4 If the hotel needs to make significant changes to your booking or cancel it, we will notify you as soon as possible. We will assist in arranging alternative options provided by the hotel, but we accept no further liability beyond this.</p>

                                <h4>6. Accuracy of Prices & Descriptions</h4>
                                <p>6.1 Ventus Travel is not liable for errors or omissions in bookings or pricing, whether they are made by the hotel or result from a system failure. We reserve the right to correct advertised prices at any time and amend errors in both advertised and confirmed prices.</p>
                                <p className="mb-4">6.2 Prices and availability are subject to change, and you should confirm the price of your arrangements at the time of booking. We strive to ensure that all hotel information provided by Ventus Travel is accurate, but please be aware that hotel facilities may change.</p>

                                <h4>7. Our Responsibility for Your Booking</h4>
                                <p>7.1 Your contract is with the hotel, and its terms and conditions apply. As your booking agent, our responsibility is limited to processing your booking according to your instructions.</p>
                                <p>7.2 We are not responsible for the actual services provided by the hotel or any information passed on in good faith. If we are found liable for any reason, our maximum liability is limited to twice the commission we earn on your booking.</p>
                                <p className="mb-4">7.3 We do not limit or exclude liability for death or personal injury caused by our negligence or that of our employees during their employment.</p>

                                <h4>8. Complaints</h4>
                                <p>8.1 Since your contract is with the hotel, any concerns or issues should be addressed directly to them. If a problem arises during your stay, you must report it to the hotel immediately to allow them the opportunity to resolve it.</p>
                                <p className="mb-4">8.2 If you still wish to lodge a complaint after your stay, you can contact us, and we will communicate with the hotel on your behalf to seek a resolution. Please note that this is a goodwill gesture as part of our customer service, and we do not accept responsibility for handling complaints or any liability for refunds or compensation.</p>

                                <h4>9. Visa, Passport and Health Requirements</h4>
                                <p>9.1 It is your own responsibility to ensure compliance with immigration, visa and health requirements.</p>
                                <p className="mb-4">9.2 Please consult the travel advice issued by the Foreign, Commonwealth & Development Office (FCDO) prior to booking your travel plans.</p>

                                <h4>10. Unauthorised Use of Services</h4>
                                <p>10.1 You agree and undertake that you will not use the Services in any way that: (a) violates any local, national, international laws or regulations; (b) infringes the rights of any person or entity, including their intellectual property rights; (c) promotes or incites racism, bigotry, hatred or physical harm of any kind; or (d) solicits, provides or promotes illegal or unlawful activities.</p>
                                <p className="mb-4">10.2 While we will do what we can to protect the security and protection of your data, we cannot guarantee that unauthorised third parties will not be able to intrude on our systems. You shall promptly notify Ventus Travel of any actual or suspected unauthorised third-party access to your account.</p>

                                <h4>11. Liability</h4>
                                <p>11.1 Ventus Travel aims to provide the Services with reasonable care and skill and, insofar as commercially practicable, in accordance with your instructions as communicated to us at the time of booking.</p>
                                <p>11.2 Ventus Travel acts solely as your agent, in your name and on your behalf when sourcing any goods or services from Suppliers. Accordingly, you remain solely liable to any third party for any instructions you give to us.</p>
                                <p>11.3 Ventus Travel shall not be liable for any loss, cost, expense or damage of any nature whatever (whether direct or indirect) resulting from the provision of the Services or your reliance upon the information and recommendations provided by Ventus Travel.</p>
                                <p>11.4 Ventus Travel shall not be liable to any Client or third party for any loss of profits, revenues, savings, goodwill and/or similar losses, or losses due to data or information breach whether direct or indirect.</p>
                                <p className="mb-4">11.5 You agree to indemnify us fully and hold us harmless from and against all liabilities, costs, expenses, damages and losses suffered or incurred by us arising out of or in connection with your use of the Services or your breach of these Terms.</p>

                                <h4>12. Copyright</h4>
                                <p>12.1 Ventus Travel owns or is lawfully entitled to all of the copyright in this website. All other intellectual property rights are reserved. The Services are for your personal use only – you may not use it for commercial purposes.</p>
                                <p className="mb-4">12.2 Nothing in the Terms gives you a right to use the Ventus Travel name or logo, trademarks, domain names, or other distinctive brand characteristics.</p>

                                <h4>13. Changes to the Terms</h4>
                                <p>13.1 Ventus Travel may vary these Terms from time to time and will notify you of any changes in a timely manner via the website, email, or other communication methods.</p>
                                <p className="mb-4">13.2 Your continued use of our Services constitutes acceptance of the altered Terms.</p>

                                <h4>14. Applicable Law and Jurisdiction</h4>
                                <p>14.1 These Terms and your relationship with Ventus Travel are governed by the laws of England and Wales and are subject to the exclusive jurisdiction of the courts of England and Wales.</p>
                                <p className="mb-4">14.2 Any dispute arising out of or related to these Terms or the use of the Services shall exclusively be submitted to the competent courts of London, UK.</p>

                                <h4>15. Contact Us</h4>
                                <p className="mb-5">
                                    If you have any questions about these Terms and Conditions, please contact us via our website at{" "}
                                    <a href="https://www.ventustravel.co.uk" target="_blank" rel="noopener noreferrer">www.ventustravel.co.uk</a>{" "}
                                    or through our contact page.
                                </p>

                                <div className="text-center pt-4 border-top">
                                    <p className="text-muted mb-0">© 2026 Ventus Travel Ltd. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default TermsOfService;
