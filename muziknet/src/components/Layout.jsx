// src/components/Layout.jsx
import DefaultAvatar from "./DefaultAvatar";
import NotificationDropdown from "./NotificationDropdown";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { Home, User, MessageSquare, Briefcase, Search as SearchIcon, LogOut, CalendarCheck } from "lucide-react";
import { signOut } from "firebase/auth";

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // NEW GLOBAL MESSAGE STATES
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [hasUnreadBooking, setHasUnreadBooking] = useState(false);

  useEffect(() => {
    if (currentUser) {
      getDoc(doc(db, "users", currentUser.uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data());
      });
    }
  }, [currentUser]);

  // LISTEN FOR GLOBAL UNREAD MESSAGES & BOOKINGS
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUser.uid));
    
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      let booking = false;
      snap.forEach(doc => {
        const data = doc.data();
        if (data[`unread_${currentUser.uid}`]) {
          count++;
          if (data[`hasBooking_${currentUser.uid}`]) {
            booking = true;
          }
        }
      });
      setUnreadMessagesCount(count);
      setHasUnreadBooking(booking);
    });
    return () => unsub();
  }, [currentUser]);

  const isActive = (path) => location.pathname === path;

  // UPDATED NAV ITEM TO SUPPORT BADGES
  const NavItem = ({ to, icon: Icon, label, badgeCount, hasDot }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-200 ${
        isActive(to)
          ? "bg-brand-50 text-brand-600"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        {hasDot && (
          <span className="absolute -bottom-1 -right-1 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"></span>
        )}
      </div>
      <span className="hidden lg:block">{label}</span>
    </Link>
  );

  const searchUsers = async (value) => {
    setSearchInput(value);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const lowerVal = value.toLowerCase();
      
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = allUsers.filter(u => 
        (u.username && u.username.toLowerCase().includes(lowerVal)) || 
        (u.stageName && u.stageName.toLowerCase().includes(lowerVal)) ||
        (u.fullName && u.fullName.toLowerCase().includes(lowerVal))
      );
      
      setResults(filtered.filter((u) => u.id !== currentUser?.uid));
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
      
      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-50 px-4 md:px-8 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white text-xl shadow-neon shadow-brand-500/40">🎵</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 hidden md:block">MuZik<span className="text-brand-500">Net</span></h1>
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
              className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 rounded-full py-2.5 pl-11 pr-4 text-sm transition-all outline-none"
            />
          </div>

          {searchInput.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-glass max-h-80 overflow-y-auto z-50">
              {loading && <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>}
              {!loading && results.length === 0 && <div className="p-4 text-sm text-gray-500 text-center">No users found.</div>}
              {results.map((user) => (
                <div key={user.id} onClick={() => goToUser(user.id)} className="flex items-center gap-3 p-3 hover:bg-brand-50 cursor-pointer transition-colors">
                  {user.photoURL ? <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" /> : <DefaultAvatar className="w-10 h-10 text-lg" />}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{user.stageName || user.fullName}</p>
                    <p className="text-xs text-gray-500">${user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          <NotificationDropdown currentUser={currentUser} />
          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{userProfile?.stageName || "Artist"}</p>
              <p className="text-xs text-gray-500">View Profile</p>
            </div>
            <Link to="/profile">
              {userProfile?.photoURL ? <img src={userProfile.photoURL} className="w-10 h-10 rounded-full object-cover border-2 border-brand-100 hover:border-brand-500 transition-colors flex-shrink-0" /> : <DefaultAvatar className="w-10 h-10 text-lg border-2 border-brand-100 hover:border-brand-500 transition-colors" />}
            </Link>
          </div>
          <button onClick={async () => { await signOut(auth); window.location.href = "/login"; }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <aside className="hidden md:block w-64 p-6 sticky top-[72px] h-[calc(100vh-72px)]">
          <div className="space-y-1">
            <NavItem to="/" icon={Home} label="Home Feed" />
            <NavItem to="/opportunities" icon={Briefcase} label="Opportunities" />
            <NavItem to="/booking" icon={SearchIcon} label="Find Talent" />
            <NavItem to="/my-bookings" icon={CalendarCheck} label="My Bookings" />
            
            {/* MESSAGES NAV ITEM WITH NOTIFICATION BADGE */}
            <NavItem 
              to="/messages" 
              icon={MessageSquare} 
              label="Messages" 
              badgeCount={unreadMessagesCount} 
              hasDot={hasUnreadBooking} 
            />
            
            <NavItem to="/profile" icon={User} label="My Profile" />
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8"><Outlet /></main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden glass fixed bottom-0 w-full flex justify-around items-center p-3 z-50">
        <Link to="/" className={`p-2 ${isActive("/") ? "text-brand-600" : "text-gray-500"}`}><Home className="w-6 h-6" /></Link>
        <Link to="/opportunities" className={`p-2 ${isActive("/opportunities") ? "text-brand-600" : "text-gray-500"}`}><Briefcase className="w-6 h-6" /></Link>
        <Link to="/my-bookings" className={`p-2 ${isActive("/my-bookings") ? "text-brand-600" : "text-gray-500"}`}><CalendarCheck className="w-6 h-6" /></Link>
        
        {/* MOBILE MESSAGES WITH BADGE */}
        <Link to="/messages" className={`relative p-2 ${isActive("/messages") ? "text-brand-600" : "text-gray-500"}`}>
          <MessageSquare className="w-6 h-6" />
          {unreadMessagesCount > 0 && <span className="absolute top-1 right-1 bg-brand-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>}
          {hasUnreadBooking && <span className="absolute bottom-1 right-1 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white"></span>}
        </Link>
        
        <Link to="/profile" className={`p-2 ${isActive("/profile") ? "text-brand-600" : "text-gray-500"}`}><User className="w-6 h-6" /></Link>
      </nav>

    </div>
  );
}

export default Layout;