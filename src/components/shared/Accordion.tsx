import React from "react";

interface AccordionProps {
    title: string;
    text?: string;
    id: string;
    faqs: {
        question: string;
        answer: string;
    }[];
}

const Accordion: React.FC<AccordionProps> = ({ title, text, faqs, id }) => {
    return (
        <section className="section-accordion section-padding">
            <div className="container">
                <div className="row text-center">
                    <h2>{title}</h2>
                    <p>{text}</p>
                </div>
                <div className="row">
                    <div className="accordion-box">
                        <div className="accordion accordion-flush" id={id}>
                            {faqs.map((faq, index) => (
                                <div key={index} className="accordion-item">
                                    <h4 className="accordion-header">
                                        <button
                                            className="accordion-button collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#${id}-${index}`}
                                            aria-expanded="false"
                                            aria-controls={`${id}-${index}`}
                                        >
                                            {faq.question}
                                        </button>
                                    </h4>
                                    <div
                                        id={`${id}-${index}`}
                                        className="accordion-collapse collapse"
                                        data-bs-parent={`#${id}`}
                                    >
                                        <div className="accordion-body">{faq.answer}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Accordion;
