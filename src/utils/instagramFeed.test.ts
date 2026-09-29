import { loadInstagramPhotos, parseInstagramPhotos } from './instagramFeed';

const post = {
    id: '1', permalink: 'https://www.instagram.com/p/example/', mediaType: 'IMAGE',
    mediaUrl: 'https://images.example/original.jpg', altText: 'Pool overlooking the sea',
    sizes: { medium: { mediaUrl: 'https://images.example/medium.webp' } }
};

test('uses optimized thumbnails for photos, videos and carousels and caps the grid at six posts', () => {
    const posts = Array.from({ length: 8 }, (_, i) => ({ ...post, id: String(i),
        mediaType: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'][i % 3] }));
    const photos = parseInstagramPhotos({ username: 'ventustravel_', posts });
    expect(photos).toHaveLength(6);
    expect(photos[1].src).toBe(post.sizes.medium.mediaUrl);
    expect(photos[2].alt).toBe(post.altText);
});

test('uses a video thumbnail, never the video file, when optimized sizes are unavailable', () => {
    const video = { ...post, sizes: undefined, mediaType: 'VIDEO',
        mediaUrl: 'https://images.example/video.mp4', thumbnailUrl: 'https://images.example/thumb.jpg' };
    expect(parseInstagramPhotos({ username: 'ventustravel_', posts: [video] })[0].src).toBe(video.thumbnailUrl);
    expect(parseInstagramPhotos({ username: 'ventustravel_', posts: [{ ...video, thumbnailUrl: undefined }] })).toEqual([]);
});

test('rejects a different account and ignores invalid post links', () => {
    expect(() => parseInstagramPhotos({ username: 'another_account', posts: [post] })).toThrow();
    expect(parseInstagramPhotos({ username: 'ventustravel_', posts: [
        { ...post, permalink: 'javascript:alert(1)' },
        { ...post, permalink: 'https://www.instagram.com.evil.example/p/1/' }
    ] })).toEqual([]);
});

test('shares concurrent requests and caches a successful feed across page navigation', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true,
        json: async () => ({ username: 'ventustravel_', posts: [post] }) });
    global.fetch = fetchMock;
    const url = 'https://feeds.behold.so/test-success';
    const first = loadInstagramPhotos(url);
    expect(loadInstagramPhotos(url)).toBe(first);
    await first;
    await loadInstagramPhotos(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('does not cache failed requests, allowing a recovered feed to load', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'ventustravel_', posts: [post] }) });
    global.fetch = fetchMock;
    const url = 'https://feeds.behold.so/test-recovery';
    await expect(loadInstagramPhotos(url)).rejects.toThrow();
    await expect(loadInstagramPhotos(url)).resolves.toHaveLength(1);
});
