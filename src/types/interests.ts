export interface InterestCategory {
    id: string;
    title: string;
    description: string;
    image: string;
    href?: string;
    categories: string[];
    location: string;
    query?: string;
    inspirationId?: number;
    externalUrl?: string;
    ctaLabel?: string;
}
