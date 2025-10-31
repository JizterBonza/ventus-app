import React from "react";
import { Link, useLocation } from "react-router-dom";

export interface BreadcrumbItem {
    label: string;
    path?: string;
    active?: boolean;
}

interface BreadcrumbProps {}

const Breadcrumb: React.FC<BreadcrumbProps> = () => {
    const location = useLocation();

    // Generate breadcrumb items from current path
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const pathnames = location.pathname.split("/").filter((x) => x);

        // Always start with Home
        const items: BreadcrumbItem[] = [{ label: "Home", path: "/" }];

        // Special handling for hotel detail routes (/hotel/{id})
        if (pathnames.length === 2 && pathnames[0] === "hotel") {
            items.push({
                label: "Destination",
                path: "/destinations",
            });
            items.push({
                label: "Details",
                path: location.pathname,
                active: true,
            });
            return items;
        }

        // Add intermediate paths
        pathnames.forEach((segment, index) => {
            const path = `/${pathnames.slice(0, index + 1).join("/")}`;
            // Convert segment to readable label (capitalize and replace hyphens/underscores with spaces)
            const label = segment
                .split(/[-_]/)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            items.push({
                label,
                path,
                active: index === pathnames.length - 1,
            });
        });

        return items;
    };

    const items = generateBreadcrumbs();

    return (
        <nav aria-label="breadcrumb" className="breadcrumb-nav">
            <div className="container">
                <ol className="breadcrumb">
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        const isActive = item.active !== undefined ? item.active : isLast;
                        return (
                            <React.Fragment key={index}>
                                <li
                                    className={`breadcrumb-item ${isActive ? "active" : ""}`}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {isActive || !item.path ? (
                                        <span>{item.label}</span>
                                    ) : (
                                        <Link to={item.path}>{item.label}</Link>
                                    )}
                                </li>
                                {!isLast && <li className="breadcrumb-separator">&gt;</li>}
                            </React.Fragment>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
};

export default Breadcrumb;
