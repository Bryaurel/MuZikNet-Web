// src/pages/Booking.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import BookingFilters from "../components/BookingFilters";
import BookingCard from "../components/BookingCard";
import { Search, Zap, Users } from "lucide-react";

export default function Booking() {
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    instruments: [], 
    locations: [],  
    dateFrom: null,
    dateTo: null,
  });
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    // BUG FIX: Query for anyone who is a Talent (since acceptingBookings didn't exist)
    const q = query(collection(db, "users"), where("roles", "array-contains", "Talent"));
    
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      // Filter out the current user so they don't book themselves
      const others = fetched.filter(u => u.uid !== auth.currentUser?.uid);
      setResults(filterUsers(others, filters, availableNowOnly));
      setLoading(false);
    }, (err) => {
      console.error("Booking users snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [filters, availableNowOnly]);

  const filterUsers = (users, f, reqAvailableNow) => {
    return users.filter(u => {
      if (reqAvailableNow && !u.availableNow) return false;

      if (f.locations.length > 0) {
        const loc = (u.city || u.location || "").toLowerCase();
        const matchesLoc = f.locations.some(sel => loc.includes(sel.toLowerCase()));
        if (!matchesLoc) return false;
      }

      if (f.instruments.length > 0) {
        const userInstruments = Array.isArray(u.instruments)
          ? u.instruments.map(x => String(x).toLowerCase())
          : typeof u.instruments === "string"
            ? u.instruments.split(",").map(x => x.trim().toLowerCase())
            : [];
        const hasOne = f.instruments.some(sel => userInstruments.indexOf(sel.toLowerCase()) !== -1);
        if (!hasOne) return false;
      }
      return true;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      
      <aside className="w-full md:w-80 flex-shrink-0 space-y-6 md:sticky md:top-24 h-fit">
        <div className="glass-card p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Find Talent</h2>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-full shadow-inner"><Search className="w-4 h-4"/></div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50/30 rounded-xl border border-amber-100/50 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full shadow-sm">
                <Zap className={`w-5 h-5 ${availableNowOnly ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900">Available Now</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mt-0.5">Ready for immediate gigs</p>
              </div>
            </div>
            <button 
              onClick={() => setAvailableNowOnly(!availableNowOnly)}
              className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${availableNowOnly ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${availableNowOnly ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          <BookingFilters filters={filters} setFilters={setFilters} />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-brand-500" /> Musician Directory
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">Discover, filter, and book top talent for your next event.</p>
          </div>
          <div className="text-xs font-extrabold text-brand-600 bg-brand-50 px-4 py-2 rounded-full border border-brand-100 uppercase tracking-widest shadow-sm">
            {loading ? "Searching..." : `${results.length} Performers`}
          </div>
        </div>

        {!loading && results.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center justify-center text-center border-dashed border-2 bg-gray-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm border border-gray-100">🎸</div>
            <h3 className="text-xl font-bold text-gray-900">No performers found</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">We couldn't find anyone matching those exact filters.</p>
            <button 
              onClick={() => { setFilters({ instruments: [], locations: [], dateFrom: null, dateTo: null}); setAvailableNowOnly(false); }} 
              className="mt-6 text-brand-600 font-bold bg-brand-50 px-6 py-2.5 rounded-full hover:bg-brand-100 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
            {results.map(user => (
              <BookingCard key={user.uid} user={user} currentUser={currentUser} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}