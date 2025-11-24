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
      if (snap.exists()) setProfile(snap.data());
    });

    // Stats fetching
    const fetchStats = async () => {
      try {
        const gigsSnap = await getDocs(
          query(collection(db, "opportunities"), where("userId", "==", user.uid))
        );

        const postsSnap = await getDocs(
          query(collection(db, "posts"), where("userId", "==", user.uid))
        );

        const followersSnap = await getDocs(
          collection(db, "users", user.uid, "followers")
        );

        const followingSnap = await getDocs(
          collection(db, "users", user.uid, "following")
        );

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
      }
    );

    fetchStats();

    return () => {
      unsubProfile();
      unsubPosts();
    };
  }, []);

  return (
    <div className="relative space-y-6 p-4 max-w-3xl mx-auto">
      {/* Settings */}
      <button
        onClick={() => navigate("/settings")}
        className="absolute top-4 right-4 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
      >
        ⚙️ Settings
      </button>

      {/* Profile header */}
      <div className="flex items-center space-x-4">
        <div className="w-24 h-24 bg-gray-300 rounded-full overflow-hidden">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              🎵
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold">{profile.fullName || "Unnamed"}</h2>
          {profile.stageName && (
            <p className="text-gray-600 italic">"{profile.stageName}"</p>
          )}
          {profile.username && (
            <p className="text-gray-400 text-sm">@{profile.username}</p>
          )}
          <p className="text-gray-600">{profile.bio}</p>
          <p className="text-gray-500 text-sm">
            {profile.nationality} {profile.city && `• ${profile.city}`}
          </p>
          <p className="text-gray-500 text-sm">{profile.instruments}</p>

          {/* Stats */}
          <div className="flex gap-4 mt-2 text-sm font-semibold text-gray-700">
            <span>
              <strong>{stats.gigs}</strong> Gigs
            </span>
            <span>
              <strong>{stats.posts}</strong> Posts
            </span>
            <span>
              <strong>{stats.followers}</strong> Followers
            </span>
            <span>
              <strong>{stats.following}</strong> Following
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <button
        onClick={() => navigate("/edit-profile")}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Edit Profile
      </button>

      {/* Header + New Post */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-xl font-semibold">My Posts</h3>
        <button
          onClick={() => navigate("/new-post")}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          New Post
        </button>
      </div>

      {/* POSTS GRID */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              className="relative group aspect-square rounded-xl overflow-hidden bg-gray-200 border-[3px] border-blue-400 border-dashed shadow-md cursor-pointer"
              onClick={() => navigate(`/post/${post.id}`)}
            >
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
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  🎵
                </div>
              )}

              {post.mediaURLs?.length > 1 && (
                <div className="absolute top-1 right-1 bg-black bg-opacity-60 px-2 py-1 rounded-lg flex items-center">
                  <span className="text-white text-xs mr-1">🎶</span>
                  <span className="text-white text-xs">
                    +{post.mediaURLs.length - 1}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 animate-pulse">
            <div className="text-5xl mb-2">🎵</div>
            <p>You haven't posted anything yet.</p>
            <p className="text-sm">Share your first performance or creation!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
