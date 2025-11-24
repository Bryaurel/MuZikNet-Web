import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

/**
 * Profile.jsx
 * - UI redesigned to a card + 3-column square gallery
 * - Uses purple (#7C3AED via tailwind 'bg-purple-600') for primary actions
 * - Shows $username under stage name with lighter gray
 * - Keeps existing firestore listeners & logic
 */

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: "",
    stageName: "",
    bio: "",
    nationality: "",
    city: "",
    instruments: "",
    photoURL: "",
    username: "",
  });

  const [stats, setStats] = useState({
    gigs: 0,
    posts: 0,
    followers: 0,
    following: 0,
  });

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const profileRef = doc(db, "users", user.uid);

    // Real-time profile listener
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setProfile((prev) => ({ ...prev, ...snap.data() }));
    });

    // Stats fetching (one-off)
    const fetchStats = async () => {
      try {
        const gigsSnap = await getDocs(
          query(collection(db, "opportunities"), where("userId", "==", user.uid))
        );

        const postsSnap = await getDocs(
          query(collection(db, "posts"), where("userId", "==", user.uid))
        );

        // NOTE: followers/following are subcollections in your schema
        const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
        const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));

        setStats({
          gigs: gigsSnap.size,
          posts: postsSnap.size,
          followers: followersSnap.size,
          following: followingSnap.size,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    // Real-time posts listener (newest to oldest)
    const unsubPosts = onSnapshot(
      query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const fetched = [];
        snap.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
        setPosts(fetched);
      },
      (err) => {
        console.error("Profile posts snapshot error:", err);
      }
    );

    fetchStats();

    return () => {
      unsubProfile();
      unsubPosts();
    };
  }, []);

  // Utility to render instruments as badges
  const renderInstruments = (instr) => {
    if (!instr) return null;
    // if it's a string list separated by comma, split; otherwise display as single badge
    const list = typeof instr === "string" ? instr.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(instr) ? instr : [];
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {list.map((i, idx) => (
          <span
            key={idx}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border"
          >
            {i}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Profile Card */}
      <div className="bg-white shadow-md rounded-2xl p-6 relative">

        {/* Top-right settings (page-level) */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => navigate("/settings")}
            className="text-sm px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.fullName || profile.stageName || "Profile photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  🎵
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {profile.stageName || profile.fullName || "Unnamed"}
                </h1>

                {/* $username */}
                {profile.username ? (
                  <p className="text-sm text-gray-500 mt-1">${profile.username}</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">$unknown</p>
                )}
              </div>

              {/* Edit Profile button (top-right of card) */}
              <div className="absolute top-20 right-6">
                <button
                  onClick={() => navigate("/edit-profile")}
                  className="text-sm px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-700 mt-3">{profile.bio || ""}</p>

            {/* Instruments (badges) */}
            {renderInstruments(profile.instruments)}

            {/* Location / Nationality */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
              {profile.nationality && <div>{profile.nationality}</div>}
              {profile.city && <div>• {profile.city}</div>}
            </div>

            {/* Followers / Following / Gigs */}
            <div className="flex gap-6 mt-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.followers}</div>
                <div className="text-sm text-gray-500">Followers</div>
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.following}</div>
                <div className="text-sm text-gray-500">Following</div>
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.gigs}</div>
                <div className="text-sm text-gray-500">Gigs</div>
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.posts}</div>
                <div className="text-sm text-gray-500">Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts header: left -> Posts, right -> Create Post */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="text-xl font-semibold text-gray-900">Posts</h2>
        <button
          onClick={() => navigate("/new-post")}
          className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
        >
          + Create Post
        </button>
      </div>

      {/* Posts Gallery (3 per row, square, uniform size) */}
      <div className="grid grid-cols-3 gap-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`, { state: { fromProfile: true, posts } })}
              className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer border"
            >
              {/* media */}
              {post.mediaURLs?.[0] ? (
                /\.(mp4|mov|webm)$/i.test(post.mediaURLs[0]) ? (
                  <video
                    src={post.mediaURLs[0]}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaURLs[0]}
                    alt={`Post by ${profile.stageName || profile.fullName}`}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  🎵
                </div>
              )}

              {/* multi-media indicator */}
              {post.mediaURLs?.length > 1 && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg">
                  <span className="text-white text-xs mr-1">🎶</span>
                  <span className="text-white text-xs">+{post.mediaURLs.length - 1}</span>
                </div>
              )}

              {/* thin divider + actions bar (overlay at bottom) */}
              <div className="absolute left-0 right-0 bottom-0">
                <div className="h-px bg-gray-200" />
                <div className="flex items-center justify-between px-3 py-2 bg-white/90">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="select-none">♡</span>
                    <span>{(post.likes && Array.isArray(post.likes) ? post.likes.length : 0)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="select-none">💬</span>
                    <span>{(post.comments && Array.isArray(post.comments) ? post.comments.length : 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-gray-500 py-12">
            <div className="text-5xl mb-2">🎵</div>
            <p>You haven't posted anything yet.</p>
            <p className="text-sm mt-1">Share your first performance or creation!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
