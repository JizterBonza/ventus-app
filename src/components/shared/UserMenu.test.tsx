import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import UserMenu from './UserMenu';
import { getDisplayCurrency, setDisplayCurrency } from '../../utils/currency';

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { firstName: 'Alex', lastName: 'Taylor', email: 'alex@example.test' }, logout: jest.fn() }),
}));

afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
});

test('desktop and mobile menus share an explicit choice, remembered after remounting', () => {
    const { unmount } = render(<><UserMenu /><UserMenu /></>);
    screen.getAllByRole('button', { name: 'Account menu' }).forEach(button => fireEvent.click(button));
    const selectors = screen.getAllByRole('combobox', { name: 'Currency' });
    expect(selectors[0]).toHaveValue('GBP');
    expect(selectors[0].id).not.toBe(selectors[1].id);
    expect(within(selectors[0]).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['GBP', 'EUR', 'USD', 'HKD']);
    fireEvent.change(selectors[0], { target: { value: 'EUR' } });
    expect(selectors[1]).toHaveValue('EUR');
    expect(getDisplayCurrency()).toBe('EUR');
    unmount();
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');
});

test('other tabs update the menu and an invalid stored preference returns to GBP', () => {
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    act(() => {
        localStorage.setItem('ventus:display-currency:v1', 'USD');
        window.dispatchEvent(new StorageEvent('storage', { key: 'ventus:display-currency:v1' }));
    });
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('USD');
    act(() => {
        localStorage.setItem('ventus:display-currency:v1', 'invalid');
        window.dispatchEvent(new StorageEvent('storage', { key: 'ventus:display-currency:v1' }));
    });
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('GBP');
});

test('a choice still works if browser storage refuses writes', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Currency' }), { target: { value: 'HKD' } });
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('HKD');
    act(() => setDisplayCurrency('not-a-currency'));
    expect(getDisplayCurrency()).toBe('HKD');
});
