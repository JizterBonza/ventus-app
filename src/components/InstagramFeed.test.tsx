import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InstagramFeed from './InstagramFeed';
import { loadInstagramPhotos } from '../utils/instagramFeed';

jest.mock('../utils/instagramFeed', () => ({
    instagramFeedUrl: '',
    instagramProfileUrl: 'https://www.instagram.com/ventustravel_/',
    loadInstagramPhotos: jest.fn()
}));
const load = loadInstagramPhotos as jest.MockedFunction<typeof loadInstagramPhotos>;

test('keeps the native embed when no Behold account is connected', () => {
    render(<InstagramFeed />);
    expect(screen.getAllByRole('link', { name: 'View @ventustravel_ on Instagram' }).some(link => link.getAttribute('target') === '_blank')).toBe(true);
    expect(load).not.toHaveBeenCalled();
});

test('renders the fetched photos and falls back if a photo fails to load', async () => {
    load.mockResolvedValue([{ id: '1', href: 'https://www.instagram.com/p/example/',
        src: 'https://images.example/photo.webp', alt: 'Pool at sunset' }]);
    render(<InstagramFeed feedUrl="https://feeds.behold.so/example" />);
    const photo = await screen.findByRole('img', { name: 'Pool at sunset' });
    expect(photo.closest('a')).toHaveAttribute('href', 'https://www.instagram.com/p/example/');
    fireEvent.error(photo);
    expect(screen.getAllByRole('link', { name: 'View @ventustravel_ on Instagram' }).some(link => link.getAttribute('target') === '_blank')).toBe(true);
});

test('falls back to Instagram when the feed request fails', async () => {
    load.mockRejectedValue(new Error('Unavailable'));
    render(<InstagramFeed feedUrl="https://feeds.behold.so/example" />);
    expect((await screen.findAllByRole('link', { name: 'View @ventustravel_ on Instagram' })).some(link => link.getAttribute('target') === '_blank')).toBe(true);
});
