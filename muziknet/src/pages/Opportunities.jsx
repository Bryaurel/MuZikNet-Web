// src/pages/Opportunities.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import OpportunityCard from "../components/OpportunityCard";
import { useNavigate } from "react-router-dom";

/**
 * Opportunities page:
 * - sidebar with navigation (My Applications, My Opportunities, Add Opportunity)
 * - search + filter (category/type + location text)
 * - pagination (15 per page)
 * - shows only approved opportunities by default (unless admin toggles)
 *
 * NOTE: admin detection is done in user doc (isAdmin boolean). This file does not mutate admin flag.
 */

const PAGE_SIZE = 15;

export default function Opportunities() {
  const navigate = useNavigate();

  const [currentFilter, setCurrentFilter] = useState("all"); // e.g. scholarship, gig, festival, job, others
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // pagination state
  const [pageStartDoc, setPageStartDoc] = useState(null);
  const [pageStack, setPageStack] = useState([]); // startAfter docs history for back navigation

  // admin / views (we will detect admin in NewOpportunity/others when needed; here show only approved)
  const [onlyApproved, setOnlyApproved] = useState(true);

  // Build a real time query that listens to approved opportunities and filters
  useEffect(() => {
    setLoading(true);

    // Base: collection
    let q = null;

    // If searching by text, Firestore requires different approach; for simplicity we search by title using range queries if search provided,
    // otherwise read approved list ordered by createdAt desc.
    const coll = collection(db, "opportunities");

    if (search.trim().length > 0) {
      // Use title-based prefix search range (requires indexing on title)
      const val = search.trim();
      q = query(
        coll,
        where("status", "==", "approved"),
        orderBy("title"),
        // note: change to orderBy(createdAt) if you prefer
      );
      // We'll filter results client-side for title contains (since Firestore text search not available).
      // So we use onSnapshot on approved list and client-filter after fetch.
    } else {
      // Only show approved opportunities (status===approved)
      q = query(coll, where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    }

    const unsub = onSnapshot(q, (snap) => {
      // If searching text we will filter client-side to title/description/organizer/lookingFor
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      let filtered = docs;

      if (search.trim().length > 0) {
        const s = search.trim().toLowerCase();
        filtered = docs.filter((o) => {
          return (
            (o.title && o.title.toLowerCase().includes(s)) ||
            (o.description && o.description.toLowerCase().includes(s)) ||
            (o.organizer && o.organizer.toLowerCase().includes(s)) ||
            (o.location && o.location.toLowerCase().includes(s))
          );
        });

        // apply location filter if any
        if (locationFilter.trim()) {
          const loc = locationFilter.trim().toLowerCase();
          filtered = filtered.filter((o) => o.location && o.location.toLowerCase().includes(loc));
        }

        if (currentFilter !== "all") {
          filtered = filtered.filter((o) => (o.category || "").toLowerCase() === currentFilter.toLowerCase());
        }

        // sort by createdAt desc if field present
        filtered.sort((a, b) => {
          const A = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt ? a.createdAt : 0);
          const B = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt ? b.createdAt : 0);
          return B - A;
        });

        // limit to PAGE_SIZE
        filtered = filtered.slice(0, PAGE_SIZE);
      } else {
        // default stream already limited by PAGE_SIZE
        // apply additional filters client side if selected
        if (locationFilter.trim()) {
          const loc = locationFilter.trim().toLowerCase();
          filtered = filtered.filter((o) => o.location && o.location.toLowerCase().includes(loc));
        }
        if (currentFilter !== "all") {
          filtered = filtered.filter((o) => (o.category || "").toLowerCase() === currentFilter.toLowerCase());
        }
      }

      setOpportunities(filtered);
      setLoading(false);
    }, (err) => {
      console.error("Opportunities listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [search, currentFilter, locationFilter]);

  // handler: go to create
  const goCreate = () => navigate("/opportunities/new");

  // pagination next/prev (basic). If search active we don't paginate (client-limited)
  const handleNextPage = async () => {
    if (search.trim().length > 0) return; // skip when searching
    if (!opportunities.length) return;

    setLoading(true);
    try {
      const coll = collection(db, "opportunities");
      // find the last doc in current displayed results in Realtime snapshot is tricky: we'll do another query using createdAt of last item
      const last = opportunities[opportunities.length - 1];
      const lastCreated = last.createdAt;
      const q = query(coll, where("status", "==", "approved"), orderBy("createdAt", "desc"), startAfter(lastCreated), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPageStack((prev) => [...prev, opportunities[0]?.createdAt || null]); // push current page marker
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOpportunities(docs);
      }
    } catch (err) { console.error(err) }
    setLoading(false);
  };

  const handlePrevPage = async () => {
    // For simple UX we can clear to first page (re-run listener resets to first page)
    // Or if we stored pageStartDoc stack we could re-query. For simplicity, reset search to trigger initial realtime query.
    setSearch(""); setLocationFilter(""); setCurrentFilter("all");
  };

  const categories = useMemo(() => ["all", "scholarship", "gig", "festival", "job", "others"], []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
      {/* Side bar */}
      <aside className="w-full md:w-64 bg-white rounded-lg p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Opportunities</h2>
          <p className="text-sm text-gray-600">Find gigs, scholarships, jobs and more</p>
        </div>

        <div className="space-y-3">
          <div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, desc, location..." className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Filter by location..." className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select value={currentFilter} onChange={(e) => setCurrentFilter(e.target.value)} className="w-full border rounded px-2 py-2">
              {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div className="pt-3">
            <button onClick={() => { /* reset*/ setSearch(""); setLocationFilter(""); setCurrentFilter("all"); }} className="w-full text-sm py-2 border rounded">Reset filters</button>
          </div>

          <div className="pt-4 border-t pt-4">
            <button onClick={() => navigate("/opportunities/my")} className="w-full text-sm py-2 rounded border">My Opportunities</button>
            <button onClick={() => navigate("/opportunities/applications")} className="w-full text-sm py-2 rounded mt-2 border">My Applications</button>
            <button onClick={goCreate} className="w-full mt-3 px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Add Opportunity</button>
          </div>

        </div>
      </aside>

      {/* Main list */}
      <main className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Musical Opportunities</h1>
            <p className="text-gray-600">Discover gigs, collaborations, scholarships and more</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Showing {opportunities.length} results</div>
            <div>
              <button onClick={handlePrevPage} disabled={false} className="px-3 py-1 border rounded mr-2">Prev</button>
              <button onClick={handleNextPage} className="px-3 py-1 border rounded">Next</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 bg-white rounded shadow text-center text-gray-600">Loading...</div>
        ) : opportunities.length === 0 ? (
          <div className="p-12 bg-white rounded shadow text-center text-gray-500">
            <div className="text-5xl mb-2">🎵</div>
            <div className="text-lg">No opportunities, come back later! 🎵</div>
            <p className="text-sm text-gray-400 mt-2">Try adjusting filters or check back later.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
