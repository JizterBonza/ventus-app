import React from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
    label: string;
    path?: string;
    active?: boolean;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const isActive = item.active !== undefined ? item.active : isLast;
                    return (
                        <>
                            <li
                                key={index}
                                className={`breadcrumb-item ${isActive ? "active" : ""}`}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {isActive || !item.path ? (
                                    <span>{item.label}</span>
                                ) : (
                                    <Link to={item.path}>{item.label}</Link>
                                )}
                            </li>
                            <li className="breadcrumb-separator">&gt;</li>
                        </>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
