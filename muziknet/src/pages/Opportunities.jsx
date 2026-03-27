// src/pages/Opportunities.jsx
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebase";
import { 
  collection, query, where, orderBy, limit, startAfter, onSnapshot, doc, updateDoc 
} from "firebase/firestore";
import OpportunityCard from "../components/OpportunityCard";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Briefcase, Plus, Filter, RotateCcw, Music, Users, Edit3, XCircle } from "lucide-react";

const PAGE_SIZE = 15;

// --- INTERNAL COMPONENT: Host Gig Card ---
// We use a sub-component here so each gig can independently fetch its own applicant count in real-time
function HostGigCard({ opp, navigate }) {
  const [applicantCount, setApplicantCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "opportunities", opp.id, "applications"), (snap) => {
      setApplicantCount(snap.size);
    });
    return () => unsub();
  }, [opp.id]);

  const toggleClose = async (e) => {
    e.stopPropagation();
    const newStatus = opp.status === "closed" ? "approved" : "closed";
    if (confirm(`Are you sure you want to mark this opportunity as ${newStatus}?`)) {
      await updateDoc(doc(db, "opportunities", opp.id), { status: newStatus });
    }
  };

  return (
    <div className={`glass-card p-6 flex flex-col justify-between transition-all ${opp.status === 'closed' ? 'opacity-70 grayscale-[0.5]' : 'hover:border-brand-300'}`}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
            opp.status === 'approved' ? 'bg-green-100 text-green-700' : 
            opp.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
            'bg-gray-200 text-gray-600'
          }`}>
            {opp.status}
          </span>
          <div className="flex items-center gap-1.5 text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{applicantCount}</span>
          </div>
        </div>
        <h3 className="font-extrabold text-gray-900 text-lg leading-tight mb-1">{opp.title}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-4"><MapPin className="w-3.5 h-3.5" /> {opp.location}</p>
      </div>

      <div className="border-t border-gray-100 pt-4 flex gap-2 mt-2">
        <button 
          onClick={() => navigate(`/opportunities/${opp.id}`)} 
          className="flex-1 bg-brand-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-brand-700 transition"
        >
          Manage Applicants
        </button>
        <button 
          onClick={toggleClose} 
          className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-red-600 transition"
          title={opp.status === 'closed' ? "Reopen Gig" : "Close Gig"}
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function Opportunities() {
  const navigate = useNavigate();

  // Role & View States
  const [userRoles, setUserRoles] = useState([]);
  const [viewMode, setViewMode] = useState("loading"); // 'talent', 'host', or 'loading'
  const [currentUser, setCurrentUser] = useState(null);

  // Talent Board States
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all"); 
  const [talentOpps, setTalentOpps] = useState([]);
  const [loadingTalent, setLoadingTalent] = useState(true);

  // Host Board States
  const [hostOpps, setHostOpps] = useState([]);
  const [loadingHost, setLoadingHost] = useState(true);

  // 1. Auth & Role Initialization
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            const roles = snap.data().roles || [];
            setUserRoles(roles);
            
            // Smart default view assignment
            if (roles.includes("Host") && !roles.includes("Talent")) {
              setViewMode("host");
            } else {
              setViewMode("talent");
            }
          }
        });
      }
    });
    return () => unsubAuth();
  }, []);

  const isTalent = userRoles.includes("Talent");
  const isHost = userRoles.includes("Host");
  const isBoth = isTalent && isHost;

  // 2. Fetch Talent Opportunities (Public Board)
  useEffect(() => {
    if (viewMode !== "talent") return;
    setLoadingTalent(true);
    const coll = collection(db, "opportunities");
    
    // Only fetch APPROVED gigs for the public board
    let q = query(coll, where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));

    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Client-side filtering
      if (search.trim().length > 0) {
        const s = search.trim().toLowerCase();
        docs = docs.filter((o) => 
          (o.title && o.title.toLowerCase().includes(s)) ||
          (o.description && o.description.toLowerCase().includes(s)) ||
          (o.organizer && o.organizer.toLowerCase().includes(s))
        );
      }
      if (locationFilter.trim()) {
        const loc = locationFilter.trim().toLowerCase();
        docs = docs.filter((o) => o.location && o.location.toLowerCase().includes(loc));
      }
      if (currentFilter !== "all") {
        docs = docs.filter((o) => (o.category || "").toLowerCase() === currentFilter.toLowerCase());
      }

      setTalentOpps(docs);
      setLoadingTalent(false);
    });

    return () => unsub();
  }, [viewMode, search, currentFilter, locationFilter]);

  // 3. Fetch Host Opportunities (Private Dashboard)
  useEffect(() => {
    if (viewMode !== "host" || !currentUser) return;
    setLoadingHost(true);
    
    // Fetch ALL gigs created by this host (pending, approved, closed)
    const q = query(
      collection(db, "opportunities"), 
      where("createdBy", "==", currentUser.uid), 
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setHostOpps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingHost(false);
    });

    return () => unsub();
  }, [viewMode, currentUser]);

  const categories = useMemo(() => ["all", "scholarship", "gig", "festival", "job", "others"], []);

  if (viewMode === "loading") {
    return <div className="h-screen flex items-center justify-center animate-pulse text-brand-600 font-bold">🎵 Loading Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* TOGGLE SWITCH FOR "BOTH" ROLES */}
      {isBoth && (
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-full inline-flex relative shadow-inner">
            <button
              onClick={() => setViewMode("talent")}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${viewMode === "talent" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Music className="w-4 h-4" /> Talent Board
            </button>
            <button
              onClick={() => setViewMode("host")}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${viewMode === "host" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Briefcase className="w-4 h-4" /> Organizer Dashboard
            </button>
            <div 
              className="absolute top-1 bottom-1 w-1/2 bg-brand-600 rounded-full transition-transform duration-300 ease-in-out shadow-sm"
              style={{ transform: viewMode === "talent" ? "translateX(0%)" : "translateX(100%)", left: "4px", width: "calc(50% - 4px)" }}
            ></div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* TALENT VIEW (Job Board, Filters, Applications)     */}
      {/* ================================================== */}
      {viewMode === "talent" && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
          
          {/* TALENT SIDEBAR */}
          <aside className="w-full md:w-80 flex-shrink-0 space-y-6">
            <div className="glass-card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-brand-500" /> Discover Gigs
                </h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Keywords..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand-500 outline-none" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="City or Country..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                  <select value={currentFilter} onChange={(e) => setCurrentFilter(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <button onClick={() => { setSearch(""); setLocationFilter(""); setCurrentFilter("all"); }} className="w-full py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm font-medium">
                  <RotateCcw className="w-4 h-4 inline mr-2" /> Reset Filters
                </button>
              </div>

              {/* TALENT ACTIONS (No Post Gig button here!) */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <button onClick={() => navigate("/opportunities/applications")} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg">
                  View My Applications
                </button>
              </div>
            </div>
          </aside>

          {/* TALENT MAIN LIST */}
          <main className="flex-1">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-brand-500" /> Opportunity Board
                </h1>
                <p className="text-sm text-gray-500 mt-1">Discover your next big performance.</p>
              </div>
              <div className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
                {talentOpps.length} Results
              </div>
            </div>

            {loadingTalent ? (
              <div className="glass-card p-12 text-center text-gray-500">Loading...</div>
            ) : talentOpps.length === 0 ? (
              <div className="glass-card p-16 text-center border-dashed border-2">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-xl font-bold text-gray-900">No opportunities found</h3>
                <p className="text-sm text-gray-500 mt-2">Adjust your filters to see more results.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {talentOpps.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* ================================================== */}
      {/* HOST VIEW (Management Dashboard)                     */}
      {/* ================================================== */}
      {viewMode === "host" && (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-brand-500" /> Organizer Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your postings and review incoming talent applications.</p>
            </div>
            
            <button 
              onClick={() => navigate("/opportunities/new")} 
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-bold transition shadow-lg shadow-brand-500/20"
            >
              <Plus className="w-5 h-5" /> Post New Gig
            </button>
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-gray-900">My Opportunities ({hostOpps.length})</h2>
          </div>

          {loadingHost ? (
            <div className="glass-card p-12 text-center text-gray-500">Loading your dashboard...</div>
          ) : hostOpps.length === 0 ? (
            <div className="glass-card p-16 text-center border-dashed border-2 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">🎪</div>
              <h3 className="text-xl font-bold text-gray-900">You haven't posted any gigs yet</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mb-6">Create your first opportunity to start receiving applications from top musical talent.</p>
              <button onClick={() => navigate("/opportunities/new")} className="text-brand-600 font-bold bg-brand-50 px-6 py-2 rounded-full hover:bg-brand-100">
                Create First Gig
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hostOpps.map((opp) => (
                <HostGigCard key={opp.id} opp={opp} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}