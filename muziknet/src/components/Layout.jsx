// src/components/Layout.jsx
import DefaultAvatar from "./DefaultAvatar";
import NotificationDropdown from "./NotificationDropdown";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Home, User, MessageSquare, Briefcase, CalendarCheck, Search as SearchIcon, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch current user's mini profile for the top right avatar
  useEffect(() => {
    if (currentUser) {
      getDoc(doc(db, "users", currentUser.uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data());
      });
    }
  }, [currentUser]);

  const isActive = (path) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 ${
        isActive(to)
          ? "bg-brand-50 text-brand-600"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );

  // SEARCH FUNCTION
  const searchUsers = async (value) => {
    setSearchInput(value);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q1 = query(usersRef, where("username", ">=", value), where("username", "<=", value + "\uf8ff"));
      const q2 = query(usersRef, where("stageName", ">=", value), where("stageName", "<=", value + "\uf8ff"));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const combined = [...snap1.docs, ...snap2.docs];
      const unique = Array.from(new Map(combined.map(doc => [doc.id, { id: doc.id, ...doc.data() }])).values());
      
      setResults(unique.filter((u) => u.id !== currentUser?.uid));
    } catch (err) {
      console.error("Search error:", err);
    }
    setLoading(false);
  };

  const goToUser = (userId) => {
    setSearchInput("");
    setResults([]);
    navigate(`/user/${userId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fc]">
      
      {/* NAVBAR (Glassmorphism) */}
      <nav className="glass sticky top-0 z-50 px-4 md:px-8 py-3 flex justify-between items-center">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white text-xl shadow-neon shadow-brand-500/40">
            🎵
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 hidden md:block">
            MuZik<span className="text-brand-500">Net</span>
          </h1>
        </Link>

        {/* SEARCH BAR */}
        <div className="relative w-full max-w-md mx-4">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-4 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search artists, producers..."
              className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-full py-2.5 pl-11 pr-4 text-sm transition-all"
            />
          </div>

          {/* SEARCH RESULTS DROPDOWN */}
          {searchInput.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-glass max-h-80 overflow-y-auto z-50">
              {loading && <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>}
              {!loading && results.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">No users found.</div>
              )}
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => goToUser(user.id)}
                  className="flex items-center gap-3 p-3 hover:bg-brand-50 cursor-pointer transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.stageName} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <DefaultAvatar className="w-10 h-10 text-lg" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{user.stageName || user.fullName}</p>
                    <p className="text-xs text-gray-500">${user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Notifications, Mini Profile & Logout */}
        <div className="flex items-center gap-4">
          
          <NotificationDropdown currentUser={currentUser} />

          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{userProfile?.stageName || "Artist"}</p>
              <p className="text-xs text-gray-500">View Profile</p>
            </div>
            <Link to="/profile">
              {userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="Me" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-brand-100 hover:border-brand-500 transition-colors flex-shrink-0"
                />
              ) : (
                <DefaultAvatar className="w-10 h-10 text-lg border-2 border-brand-100 hover:border-brand-500 transition-colors" />
              )}
            </Link>
          </div>
          
          <button 
            onClick={async () => { 
              try {
                await signOut(auth); 
                // Hard refresh to the login page kills all "zombie" listeners instantly
                window.location.href = "/login"; 
              } catch (err) {
                console.error(err);
              }
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER WITH BOTTOM/SIDE NAV */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:block w-64 p-6 sticky top-[72px] h-[calc(100vh-72px)]">
          <div className="space-y-2">
            <NavItem to="/" icon={Home} label="Home Feed" />
            <NavItem to="/opportunities" icon={Briefcase} label="Opportunities" />
            <NavItem to="/booking" icon={SearchIcon} label="Find Talent" />
            <NavItem to="/my-bookings" icon={CalendarCheck} label="My Bookings" />
            <NavItem to="/messages" icon={MessageSquare} label="Messages" />
            <NavItem to="/profile" icon={User} label="My Profile" />
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden glass fixed bottom-0 w-full flex justify-around items-center p-3 z-50">
        <Link to="/" className={`p-2 ${isActive("/") ? "text-brand-600" : "text-gray-500"}`}><Home className="w-6 h-6" /></Link>
        <Link to="/opportunities" className={`p-2 ${isActive("/opportunities") ? "text-brand-600" : "text-gray-500"}`}><Briefcase className="w-6 h-6" /></Link>
        <Link to="/messages" className={`p-2 ${isActive("/messages") ? "text-brand-600" : "text-gray-500"}`}><MessageSquare className="w-6 h-6" /></Link>
        <Link to="/my-bookings" className={`p-2 ${isActive("/my-bookings") ? "text-brand-600" : "text-gray-500"}`}><CalendarCheck className="w-6 h-6" /></Link>
        <Link to="/profile" className={`p-2 ${isActive("/profile") ? "text-brand-600" : "text-gray-500"}`}><User className="w-6 h-6" /></Link>
      </nav>

    </div>
  );
}

export default Layout;