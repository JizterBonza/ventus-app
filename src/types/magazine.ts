export interface MagazinePost {
    id: string;
    title: string;
    // excerpt: string;
    content: string;
    image: string;
    // category: string;
    // author: string;
    date: string;
    slug?: string; // Optional - will be auto-generated from title if not provided
}

export interface MagazinePostWithSlug extends MagazinePost {
    slug: string;
}
