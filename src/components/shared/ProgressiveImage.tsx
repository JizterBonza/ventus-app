import React, { useEffect, useState } from "react";

interface ProgressiveImageProps {
    src?: string | null;
    alt: string;
    priority?: boolean;
    className?: string;
    style?: React.CSSProperties;
    imageStyle?: React.CSSProperties;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    alt,
    priority = false,
    className = "",
    style,
    imageStyle,
}) => {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setFailed(false);
    }, [src]);

    const hasImage = Boolean(src) && !failed;

    return (
        <span
            className={`progressive-image${loaded ? " is-loaded" : ""}${className ? ` ${className}` : ""}`}
            style={style}
            role={!hasImage ? "img" : undefined}
            aria-label={!hasImage ? alt : undefined}
        >
            <span className="progressive-image__placeholder" aria-hidden="true" />
            {hasImage && (
                <img
                    src={src || undefined}
                    alt={alt}
                    loading={priority ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={priority ? "high" : "auto"}
                    style={imageStyle}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            )}
        </span>
    );
};

export default ProgressiveImage;
