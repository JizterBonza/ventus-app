import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoryEditor from './CategoryEditor';
import { fetchCategories, saveCategory } from '../utils/categoryPages';
import { searchPredictions } from '../utils/api';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ id: 'new' }), useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock('../components/layout/Layout', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../utils/categoryPages', () => ({ ...jest.requireActual('../utils/categoryPages'), fetchCategories: jest.fn(), saveCategory: jest.fn() }));
jest.mock('../utils/api', () => ({ searchPredictions: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'editor-1' } }) }));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  (fetchCategories as jest.Mock).mockResolvedValue([]);
  (saveCategory as jest.Mock).mockImplementation(async (category) => ({ ...category, id: 'saved-page', version: 1 }));
  (searchPredictions as jest.Mock).mockResolvedValue([
    { id: 10, text: 'Seaside Hotel', type: 'hotel', location: 'Greece' },
    { id: 20, text: 'Garden Hotel', type: 'hotel', location: 'Italy' },
    { id: 30, text: 'A destination', type: 'location' },
  ]);
});

test('create, look up hotels, reorder, remove and publish the selected collection', async () => {
  render(<CategoryEditor />);
  fireEvent.change(await screen.findByLabelText('Page title'), { target: { value: 'Coastal escapes' } });
  expect(screen.getByLabelText('Page URL')).toHaveValue('coastal-escapes');
  fireEvent.change(screen.getByLabelText('Cover image URL'), { target: { value: '/coast.webp' } });
  const search = screen.getByLabelText('Find a hotel to add');
  fireEvent.change(search, { target: { value: 'Hotel' } });
  await screen.findByText('Seaside Hotel');
  expect(screen.queryByText('A destination')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Add hotel' })[0]);
  fireEvent.change(search, { target: { value: 'Hotel' } });
  await screen.findByText('Garden Hotel');
  expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add hotel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move Garden Hotel up' }));
  expect(screen.getByText('1. Garden Hotel')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Seaside Hotel' }));
  fireEvent.click(screen.getByLabelText('Publish this category page'));
  fireEvent.click(screen.getAllByRole('button', { name: 'Save and publish' })[0]);
  await waitFor(() => expect(saveCategory).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Coastal escapes', slug: 'coastal-escapes', published: true, showOnHomepage: true,
    hotels: [{ id: 20, name: 'Garden Hotel', location: 'Italy' }],
  }), undefined));
  await screen.findByText('Category published. Visitors can now view it.');
});

test('denied users do not receive editing controls', async () => {
  (fetchCategories as jest.Mock).mockRejectedValue(new Error('Homepage editor access required'));
  render(<CategoryEditor />);
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('Page title')).not.toBeInTheDocument();
});

test('save errors keep the unsaved collection available to edit', async () => {
  (saveCategory as jest.Mock).mockRejectedValue(new Error('That page URL is already in use. Choose another.'));
  render(<CategoryEditor />);
  fireEvent.change(await screen.findByLabelText('Page title'), { target: { value: 'Coastal escapes' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Page title')).toHaveValue('Coastal escapes');
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
});

test('unsaved changes can be restored after navigating away and successful save clears the recovery copy', async () => {
  const { unmount } = render(<CategoryEditor />);
  fireEvent.change(await screen.findByLabelText('Page title'), { target: { value: 'Unsaved collection' } });
  unmount();
  render(<CategoryEditor />);
  fireEvent.click(await screen.findByRole('button', { name: 'Restore unsaved changes' }));
  expect(screen.getByLabelText('Page title')).toHaveValue('Unsaved collection');
  fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);
  await screen.findByText('Draft saved. This page is hidden from visitors.');
  expect(sessionStorage.getItem('ventus:category-draft:editor-1:new')).toBeNull();
});

test('header navigation is cancelled when the editor declines to leave unsaved changes', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<><a href="/admin/homepage">Header homepage</a><CategoryEditor /></>);
  fireEvent.change(await screen.findByLabelText('Page title'), { target: { value: 'Keep these edits' } });
  expect(fireEvent.click(screen.getByText('Header homepage'))).toBe(false);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Page title')).toHaveValue('Keep these edits');
  confirm.mockRestore();
});
