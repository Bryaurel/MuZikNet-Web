// src/pages/UserProfile.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  addDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import PostViewer from "./PostViewer";
import { MapPin, DollarSign } from "lucide-react";
import DefaultAvatar from "../components/DefaultAvatar";

export default function UserProfile() {
  const { uid } = useParams(); // UID of the user to view
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followed, setFollowed] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [loadingFollowAction, setLoadingFollowAction] = useState(false);
  const [reviews, setReviews] = useState([]);

  // Auth Listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u || null);
    });
    return () => unsub();
  }, []);

  // Real-time User Data
  useEffect(() => {
    if (!uid) return;
    const uRef = doc(db, "users", uid);
    const unsub = onSnapshot(uRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsub();
  }, [uid]);

  // Followers & Following Listener
  useEffect(() => {
    if (!uid) return;
    const unsubF = onSnapshot(collection(db, "users", uid, "followers"), (snap) => {
      setFollowers(snap.docs.map((d) => d.id));
    });
    const unsubG = onSnapshot(collection(db, "users", uid, "following"), (snap) => {
      setFollowing(snap.docs.map((d) => d.id));
    });
    return () => { unsubF(); unsubG(); };
  }, [uid]);

  // Check Follow State
  useEffect(() => {
    if (!currentUser || !uid) return;
    const unsub = onSnapshot(doc(db, "users", uid, "followers", currentUser.uid), (snap) => {
      setFollowed(snap.exists());
    });
    return () => unsub();
  }, [currentUser, uid]);

  // User Posts Listener
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "posts"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "reviews"), where("targetUserId", "==", uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [uid]);

  const handleFollowToggle = async () => {
    if (!currentUser) return navigate("/login");
    setLoadingFollowAction(true);
    const followerRef = doc(db, "users", uid, "followers", currentUser.uid);
    const followingRef = doc(db, "users", currentUser.uid, "following", uid);
    
    if (followed) {
      await deleteDoc(followerRef);
      await deleteDoc(followingRef);
    } else {
      await setDoc(followerRef, { uid: currentUser.uid, followedAt: serverTimestamp() });
      await setDoc(followingRef, { uid, followedAt: serverTimestamp() });

      // NOTIFICATION TRIGGER: Send a social notification to the user being followed
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        type: "social",
        message: `${currentUser.displayName || "Someone"} started following you.`,
        link: `/user/${currentUser.uid}`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    }
    setLoadingFollowAction(false);
  };

  const handleMessage = async () => {
    if (!currentUser) return navigate("/login");
    const uids = [currentUser.uid, uid].sort();
    const convoId = `${uids[0]}_${uids[1]}`;
    await setDoc(doc(db, "conversations", convoId), { participants: uids, updatedAt: serverTimestamp() }, { merge: true });
    navigate("/messages", { state: { convoId } });
  };

  if (!userData) return <div className="p-10 text-center animate-pulse text-brand-600">🎵 Loading Profile...</div>;

  // Logic to handle instruments display
  const instrumentsArray = Array.isArray(userData.instruments)
    ? userData.instruments
    : typeof userData.instruments === "string" && userData.instruments.trim().length > 0
      ? userData.instruments.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const joinedDate = userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : "New Member";

  return (
    <div className="max-w-4xl mx-auto mt-6 p-6 bg-white rounded-2xl shadow-soft border border-gray-100">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Info Card */}
        <div className="w-full md:w-1/3 flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 mb-4">
            {userData.photoURL ? (
              <img src={userData.photoURL} alt={userData.stageName} className="w-full h-full object-cover" />
            ) : (
              <DefaultAvatar className="w-full h-full text-4xl" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{userData.stageName || userData.fullName}</h2>
          <p className="text-gray-400 text-sm font-medium">${userData.username}</p>

          {/* Primary Role Badge (Green) */}
          <div className="mt-3">
            {userData?.roles?.includes("Talent") && userData?.roles?.includes("Host") ? (
              <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">Talent & Host</span>
            ) : userData?.roles?.includes("Host") ? (
              <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">Host</span>
            ) : (
              <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">Talent</span>
            )}
          </div>

          <p className="text-gray-600 mt-4 text-sm leading-relaxed">{userData.bio}</p>

          {/* Location & Skills (Phase 1 Fix) */}
          <div className="flex flex-wrap gap-2 mt-5 items-center justify-center">
            {userData.city && (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                <MapPin className="w-3 h-3" /> {userData.city}
              </span>
            )}
            {userData.priceRange && userData.roles?.includes("Talent") && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <DollarSign className="w-3 h-3" /> {userData.priceRange} / gig
              </span>
            )}
            {instrumentsArray.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">{skill}</span>
            ))}
          </div>

          <div className="mt-6 w-full flex gap-2">
            {currentUser?.uid === uid ? (
              <button onClick={() => navigate("/edit-profile")} className="flex-1 bg-gray-100 py-2.5 rounded-xl font-bold text-gray-700">Edit Profile</button>
            ) : (
              <>
                <button onClick={handleFollowToggle} disabled={loadingFollowAction} className={`flex-1 py-2.5 rounded-xl font-bold transition ${followed ? "bg-gray-200 text-gray-600" : "bg-brand-600 text-white shadow-md shadow-brand-500/20"}`}>
                  {followed ? "Unfollow" : "Follow"}
                </button>
                <button onClick={handleMessage} className="flex-1 py-2.5 rounded-xl font-bold bg-white border border-gray-200 text-gray-700">Message</button>
              </>
            )}
          </div>
          
          {/* RATING OVERVIEW */}
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎵</div>
              <div className="text-left">
                <div className="text-lg font-extrabold text-amber-900">
                  {userData.avgRating ? Number(userData.avgRating).toFixed(1) : "N/A"} <span className="text-sm font-medium text-amber-700">Overall Rating</span>
                </div>
                <div className="text-xs text-amber-600 font-bold uppercase tracking-wider">{userData.reviewCount || 0} Reviews</div>
              </div>
            </div>
          </div>

          <div className="mt-8 w-full flex justify-around border-t border-gray-100 pt-6">
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{followers.length}</div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Followers</div></div>
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{following.length}</div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Following</div></div>
            <div className="text-center"><div className="text-lg font-bold text-gray-900">{posts.length}</div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Posts</div></div>
          </div>
        </div>

        {/* Right Side: Grid */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Portfolio</h3>
          {posts.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 text-gray-400">No posts yet 🎵</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  onClick={() => navigate(`/post/${post.id}`, { state: { fromProfile: true, posts } })} 
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-pointer shadow-soft"
                >
                  {(post.mediaType === "video" || post.mediaURLs?.[0]?.match(/\.(mp4|mov|webm)/i)) ? (
                    <video 
                      src={post.mediaURLs[0]} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      muted 
                      playsInline
                      loop
                      onMouseEnter={(e) => e.target.play().catch(() => {})} 
                      onMouseLeave={(e) => e.target.pause()}
                    />
                  ) : (
                    <img 
                      src={post.mediaURLs?.[0] || ""} 
                      alt="Post" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}