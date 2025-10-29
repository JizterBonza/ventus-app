import React from "react";
import Breadcrumb, { BreadcrumbItem } from "./Breadcrumb";

interface PageHeaderProps {
    title: string;
    text?: string;
    breadcrumbs?: BreadcrumbItem[];
    backgroundImage?: string;
    className?: string;
    video?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    text,
    breadcrumbs,
    backgroundImage,
    className = "",
    video = false,
}) => {
    const style = backgroundImage
        ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
          }
        : {};

    return (
        <section className={`page-header ${className} ${video ? "has-video" : ""}`} style={style}>
            {video && (
                <div className="video-fullscreen-wrap">
                    <iframe
                        src="https://app.vidzflow.com/v/6RxOyGm7lF?dq=576&ap=true&muted=true&loop=true&ctp=false&bc=%234E5FFD&controls="
                        allow="fullscreen"
                        scrolling="no"
                        data-video-id="https://app.vidzflow.com/v/6RxOyGm7lF?dq=576&ap=true&muted=true&loop=true&ctp=false&bc=%234E5FFD&controls="
                        title="Ventus Travel Hero Video"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ aspectRatio: "1.77777778", overflow: "hidden" }}
                        className="home-hero-video-iframe"
                    />
                </div>
            )}
            <div className="container">
                <div className="row">
                    <div className="col-md-12">
                        <div className="page-header-content">
                            {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
                            <h1>{title}</h1>
                            {text && <p>{text}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PageHeader;
