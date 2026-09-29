export const instagramProfileUrl = "https://www.instagram.com/ventustravel_/";

// Public Behold feed for the authorized @ventustravel_ account.
export const instagramFeedUrl = "https://feeds.behold.so/6zqPXtcljhBtcf1zRElj";

export type InstagramPhoto = { id: string; href: string; src: string; alt: string };

type BeholdPost = {
    id?: string;
    permalink?: string;
    mediaType?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    sizes?: { medium?: { mediaUrl?: string }; small?: { mediaUrl?: string } };
    altText?: string;
    prunedCaption?: string;
};

export function parseInstagramPhotos(data: { username?: string; posts?: BeholdPost[] }): InstagramPhoto[] {
    if (data?.username !== "ventustravel_" || !Array.isArray(data.posts)) {
        throw new Error("The Instagram feed is not connected to Ventus Travel.");
    }
    return data.posts.flatMap((post): InstagramPhoto[] => {
        const src = post.sizes?.medium?.mediaUrl || post.sizes?.small?.mediaUrl ||
            (post.mediaType === "VIDEO" ? post.thumbnailUrl : post.mediaUrl);
        if (!post.id || !src?.startsWith("https://") ||
            !/^https:\/\/(www\.)?instagram\.com\/(p|reel)\//.test(post.permalink || "")) return [];
        return [{ id: post.id, href: post.permalink!, src,
            alt: post.altText || post.prunedCaption?.slice(0, 240) || "A recent post from Ventus Travel" }];
    }).slice(0, 6);
}

const cache = new Map<string, { photos: InstagramPhoto[]; expires: number }>();
const pending = new Map<string, Promise<InstagramPhoto[]>>();

export function loadInstagramPhotos(url: string): Promise<InstagramPhoto[]> {
    const saved = cache.get(url);
    if (saved && saved.expires > Date.now()) return Promise.resolve(saved.photos);
    const existing = pending.get(url);
    if (existing) return existing;

    const request = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error("Instagram feed unavailable");
            const photos = parseInstagramPhotos(await response.json());
            if (!photos.length) throw new Error("Instagram feed is empty");
            cache.set(url, { photos, expires: Date.now() + 60 * 60 * 1000 });
            return photos;
        } finally {
            clearTimeout(timeout);
            pending.delete(url);
        }
    })();
    pending.set(url, request);
    return request;
}
