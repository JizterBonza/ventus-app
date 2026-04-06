/** Cookie keys and helpers shared by the header search bar and check-availability form. */

export const SEARCH_SESSION_COOKIES = {
    CHECK_IN: "ventus_check_in",
    CHECK_OUT: "ventus_check_out",
    GUESTS: "ventus_guests",
    ROOMS: "ventus_rooms",
} as const;

export const setCookie = (name: string, value: string, days = 30) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/`;
};

export const getCookie = (name: string): string | null => {
    const nameEQ = `${name}=`;
    for (let c of document.cookie.split(";")) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
};

/**
 * Parse YYYY-MM-DD as a calendar date in the user's local timezone.
 * Avoids `new Date("YYYY-MM-DD")` / UTC issues from `toISOString()` round-trips.
 */
export const parseSearchDate = (str: string): Date | null => {
    if (!str) return null;
    const trimmed = str.trim();
    const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoDay) {
        const y = parseInt(isoDay[1], 10);
        const m = parseInt(isoDay[2], 10) - 1;
        const d = parseInt(isoDay[3], 10);
        if (y < 1000 || m < 0 || m > 11 || d < 1 || d > 31) return null;
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : dt;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
};

/** YYYY-MM-DD for the local calendar day (do not use toISOString() for this). */
export const dateToStorageString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

/** Today's date as YYYY-MM-DD in local time (for min= on inputs, etc.). */
export function getTodayLocalDateString(): string {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return dateToStorageString(t);
}

/** Default check-in / check-out (today / tomorrow) matching SearchBarNew initial state. */
export function getDefaultSearchDateStrings(): { start_date: string; end_date: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
        start_date: dateToStorageString(today),
        end_date: dateToStorageString(tomorrow),
    };
}

