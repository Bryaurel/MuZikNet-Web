// src/pages/Booking.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import BookingFilters from "../components/BookingFilters";
import BookingCard from "../components/BookingCard";
import { Link } from "lucide-react";

/**
 * Booking page - search for performers (clients/organisers use this)
 * Shows filters on top/side and a list of performers matching filters.
 *
 * Behavior:
 * - Will only show users who have `acceptingBookings: true` in their profile
 * - Filters: instruments (multi-select up to 5), location, availability (date range)
 * - Clicking a performer opens their profile (use UserProfile) or "View profile" button
 *
 * NOTE: instruments are saved in Firestore under `instruments` (string or array).
 */

export default function Booking() {
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    instruments: [], // e.g. ["piano", "singer"]
    locations: [],   // string array
    dateFrom: null,
    dateTo: null,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // watch auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setCurrentUser(u || null);
    });
    return () => unsub();
  }, []);


  // build a simple real-time listener for users matching "acceptingBookings"
  // For filters we do client-side filtering after fetching (Firestore doesn't support OR across arrays easily)
  useEffect(() => {
    setLoading(true);
    // listen to all users that accept bookings (small scale assumption)
    const q = query(collection(db, "users"), where("acceptingBookings", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      // client-side filter function below
      setResults(filterUsers(fetched, filters));
      setLoading(false);
    }, (err) => {
      console.error("Booking users snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [filters]);

  // Helper: apply user filters
  const filterUsers = (users, f) => {
    return users.filter(u => {
      // location filter (if any selected)
      if (f.locations.length > 0) {
        const loc = (u.city || u.location || "").toLowerCase();
        const matchesLoc = f.locations.some(sel => loc.includes(sel.toLowerCase()));
        if (!matchesLoc) return false;
      }

      // instruments filter: users matches if they have at least ONE of selected instruments
      if (f.instruments.length > 0) {
        const userInstruments = Array.isArray(u.instruments)
          ? u.instruments.map(x => String(x).toLowerCase())
          : typeof u.instruments === "string"
            ? u.instruments.split(",").map(x => x.trim().toLowerCase())
            : [];
        const hasOne = f.instruments.some(sel => userInstruments.indexOf(sel.toLowerCase()) !== -1);
        if (!hasOne) return false;
      }

      // availability (optional): we'll skip complex checking here —
      // the Calendar/availability acceptance will be checked later in booking creation.
      // For now we don't exclude users on availability filter (could be refined).
      return true;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Find & Book Musicians</h1>
      <p className="text-gray-600 mb-6">Search musicians by instrument/skill, location, and availability.</p>

      {/* Links to MyBookings and Calendar
      <div className="flex justify-end gap-4">
        <Link
          to="/my-bookings"
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-900"
        >
          My Bookings
        </Link>

        <Link
          to="/calendar"
          className="px-4 py-2 rounded bg-blue-600 tex-white hover:bg-blue-700"
        >
          My Calendar
        </Link>
      </div>
      */}

      <div className="flex gap-6">
        {/* Left: Filters */}
        <div className="w-80">
          <BookingFilters
            filters={filters}
            setFilters={setFilters}
          />
        </div>

        {/* Right: Results */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="text-sm text-gray-500">{loading ? "Searching..." : `${results.length} performers`}</div>
          </div>

          { !loading && results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-2">🎵</div>
              <div>No performers found. Try different filters.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(user => (
                <BookingCard key={user.uid} user={user} currentUser={currentUser} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
