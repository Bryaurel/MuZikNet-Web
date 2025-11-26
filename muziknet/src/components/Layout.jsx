import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { db } from "../firebase";
import { auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentUser = auth.currentUser;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const isActive = (path) =>
    location.pathname === path
      ? "text-[#6b4eff] font-semibold"
      : "text-gray-700";

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

      // Search by: username, fullName, stageName
      const q1 = query(usersRef, where("username", ">=", value), where("username", "<=", value + "\uf8ff"));
      const q2 = query(usersRef, where("fullName", ">=", value), where("fullName", "<=", value + "\uf8ff"));
      const q3 = query(usersRef, where("stageName", ">=", value), where("stageName", "<=", value + "\uf8ff"));

      const [snap1, snap2, snap3] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
        getDocs(q3),
      ]);

      const combined = [
        ...snap1.docs,
        ...snap2.docs,
        ...snap3.docs,
      ];

      const unique = Array.from(
        new Map(
          combined.map((doc) => [
            doc.id,
            { id: doc.id, ...doc.data() },
          ])
        ).values()
      );

      // 🔥 Remove logged-in user from search results
      const withoutSelf = unique.filter((u) => u.id !== currentUser?.uid);

      setResults(withoutSelf);

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
    <div className="flex flex-col min-h-screen bg-[#f5f5f5] text-[#333]">

      {/* NAVBAR */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">

        {/* LOGO */}
        <h1 className="text-2xl font-bold text-[#6b4eff]">MuZikNet</h1>

        {/* SEARCH BAR */}
        <div className="relative w-1/3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-[#6b4eff]"
          />

          {/* SEARCH RESULTS */}
          {searchInput.length > 0 && (
            <div className="absolute bg-white border border-gray-200 rounded-lg mt-1 w-full shadow-md max-h-60 overflow-y-auto z-50">

              {loading && (
                <div className="p-3 text-gray-500">Searching...</div>
              )}

              {!loading && results.length === 0 && (
                <div className="p-3 text-gray-500">No users found.</div>
              )}

              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => goToUser(user.id)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer"
                >
                  {/* Profile Photo */}
                  <img
                    src={user.profilePhoto || "/default-profile.jpg"}
                    alt="profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  {/* User text */}
                  <div>
                    <p className="font-semibold text-[#333]">{user.username}</p>
                    <p className="text-sm text-gray-600">
                      {user.fullName} — {user.stageName || "No stage name"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NAV LINKS */}
        <div className="space-x-6 text-lg">
          <Link to="/" className={`hover:text-[#6b4eff] ${isActive("/")}`}>
            Home
          </Link>
          <Link to="/profile" className={`hover:text-[#6b4eff] ${isActive("/profile")}`}>
            Profile
          </Link>
          <Link to="/messages" className={`hover:text-[#6b4eff] ${isActive("/messages")}`}>
            Messages
          </Link>
          <Link to="/opportunities" className={`hover:text-[#6b4eff] ${isActive("/opportunities")}`}>
            Opportunities
          </Link>
          <Link to="/booking" className={`hover:text-[#6b4eff] ${isActive("/booking")}`}>
            Booking
          </Link>
        </div>

      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>

    </div>
  );
}

export default Layout;
