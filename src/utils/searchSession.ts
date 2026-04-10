/** Cookie keys and helpers shared by the header search bar and check-availability form. */

export const SEARCH_SESSION_COOKIES = {
    CHECK_IN: "ventus_check_in",
    CHECK_OUT: "ventus_check_out",
    GUESTS: "ventus_guests",
    ROOMS: "ventus_rooms",
    /** JSON array: `{ adults: number; children: number }[]` from the header search bar */
    ROOM_SLOTS: "ventus_room_slots",
} as const;

/** Per-room guest counts in the search bar (children = count; ages use placeholder when calling APIs). */
export interface SearchRoomSlot {
    adults: number;
    children: number;
}

/** Placeholder child age when only a count was chosen in search (availability/booking APIs require ages). */
export const SEARCH_CHILD_PLACEHOLDER_AGE = 8;

export function parseSearchRoomSlotsJson(raw: string | null | undefined): SearchRoomSlot[] | null {
    if (!raw?.trim()) return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        const slots: SearchRoomSlot[] = [];
        for (const item of parsed) {
            if (!item || typeof item !== "object") continue;
            const o = item as Record<string, unknown>;
            const adultsRaw = o.adults;
            const childrenRaw = o.children;
            const adults =
                typeof adultsRaw === "number"
                    ? Math.max(1, Math.min(20, Math.floor(adultsRaw)))
                    : 1;
            const children =
                typeof childrenRaw === "number"
                    ? Math.max(0, Math.min(10, Math.floor(childrenRaw)))
                    : 0;
            slots.push({ adults, children });
        }
        return slots.length > 0 ? slots : null;
    } catch {
        return null;
    }
}

/** Build `[{ adults, children? }]` for availability API from search bar slots. */
export function searchRoomSlotsToAvailabilityRooms(
    slots: SearchRoomSlot[]
): Array<{ adults: number; children?: Array<{ age: number }> }> {
    return slots.map((s) => ({
        adults: s.adults,
        ...(s.children > 0
            ? {
                  children: Array.from({ length: s.children }, () => ({
                      age: SEARCH_CHILD_PLACEHOLDER_AGE,
                  })),
              }
            : {}),
    }));
}

/** Build `initialRooms` for BookingForm from search slots. */
export function searchRoomSlotsToBookingInitialRooms(
    slots: SearchRoomSlot[]
): Array<{ adults: number; children: Array<{ age: number }> }> {
    return slots.map((s) => ({
        adults: s.adults,
        children:
            s.children > 0
                ? Array.from({ length: s.children }, () => ({ age: SEARCH_CHILD_PLACEHOLDER_AGE }))
                : [],
    }));
}

/**
 * Legacy header stored total adults + room count only; split evenly across rooms.
 */
export function legacyGuestsAndRoomsToSearchSlots(guests: number, roomCount: number): SearchRoomSlot[] {
    const r = Math.max(1, Math.min(10, roomCount));
    const g = Math.max(1, Math.min(40, guests));
    const base = Math.floor(g / r);
    let rem = g - base * r;
    return Array.from({ length: r }, (_, i) => {
        const a = base + (i < rem ? 1 : 0);
        return { adults: Math.max(1, a), children: 0 };
    });
}

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

/** Default check-in / check-out (today / next day), aligned with SearchBarNew initial state. */
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

