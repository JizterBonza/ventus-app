import React, { useEffect, useRef, useState } from "react";
import { instagramFeedUrl, instagramProfileUrl, InstagramPhoto, loadInstagramPhotos } from "../utils/instagramFeed";

const profileUrl = instagramProfileUrl;
const embedScriptUrl = "https://www.instagram.com/embed.js";

const NativeInstagramFeed: React.FC = () => {
    const embed = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = embed.current;
        if (!container) return;

        // Instagram owns and resizes the contents of this container.
        const quote = document.createElement("blockquote");
        quote.className = "instagram-media";
        quote.dataset.instgrmPermalink = profileUrl;
        quote.dataset.instgrmVersion = "14";
        const link = document.createElement("a");
        link.href = profileUrl;
        link.textContent = "View @ventustravel_ on Instagram";
        quote.appendChild(link);
        container.replaceChildren(quote);

        const processEmbed = () => {
            (window as Window & {
                instgrm?: { Embeds: { process: () => void } };
            }).instgrm?.Embeds.process();
            const frame = container.querySelector("iframe");
            if (frame) frame.title = "Latest posts from Ventus Travel on Instagram";
        };

        let script = document.querySelector<HTMLScriptElement>(`script[src="${embedScriptUrl}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = embedScriptUrl;
            script.async = true;
            document.body.appendChild(script);
        }
        script.addEventListener("load", processEmbed);
        processEmbed();

        return () => {
            script?.removeEventListener("load", processEmbed);
            container.replaceChildren();
        };
    }, []);

    return (
        <div className="ventus-instagram-feed">
            <div ref={embed} />
            <a className="ventus-instagram-profile" href={profileUrl} target="_blank" rel="noreferrer">
                View @ventustravel_ on Instagram
            </a>
        </div>
    );
};

const InstagramFeed: React.FC<{ feedUrl?: string }> = ({ feedUrl = instagramFeedUrl }) => {
    const [photos, setPhotos] = useState<InstagramPhoto[]>([]);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        setPhotos([]);
        setFailed(false);
        if (feedUrl) {
            loadInstagramPhotos(feedUrl).then(
                (items) => { if (active) setPhotos(items); },
                () => { if (active) setFailed(true); }
            );
        }
        return () => { active = false; };
    }, [feedUrl]);

    if (!feedUrl || failed) return <NativeInstagramFeed />;

    return (
        <div className="ventus-instagram-feed" aria-busy={!photos.length}>
            {photos.length ? (
                <div className="ventus-instagram-grid">
                    {photos.map(photo => (
                        <a key={photo.id} href={photo.href} target="_blank" rel="noreferrer">
                            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async"
                                onError={() => setFailed(true)} />
                        </a>
                    ))}
                </div>
            ) : <p role="status">Loading the latest Instagram photos…</p>}
        </div>
    );
};

export default InstagramFeed;
