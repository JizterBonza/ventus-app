import { getRoomTypeImages } from './roomImages';

test('collects all supplier room images in order and removes duplicates', () => {
  expect(getRoomTypeImages({
    images: [
      { url: 'https://images.example/one.jpg', thumbnail_url: 'https://images.example/one-small.jpg' },
      { image_url: 'https://images.example/two.jpg' },
      'https://images.example/three.jpg',
    ],
    image: 'https://images.example/one.jpg',
  })).toEqual([
    'https://images.example/one.jpg',
    'https://images.example/two.jpg',
    'https://images.example/three.jpg',
  ]);
});

test('ignores empty and malformed room image values', () => {
  expect(getRoomTypeImages({ images: [null, {}, '  '], photo_url: '' })).toEqual([]);
});
