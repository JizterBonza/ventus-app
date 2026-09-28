import React, { useEffect, useRef } from "react";

const profileUrl = "https://www.instagram.com/ventustravel_/";
const embedScriptUrl = "https://www.instagram.com/embed.js";

const InstagramFeed: React.FC = () => {
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

export default InstagramFeed;
