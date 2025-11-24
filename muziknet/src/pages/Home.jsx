// Home.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";

/* -------------------------
   Styling notes (tailwind)
   - Backgrounds: light gray / near-white
   - Accent: purple (use purple-600/purple-500)
   - Text: dark gray for main, lighter gray for secondary
   ------------------------- */

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentText, setCommentText] = useState({});
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const mountedRef = useRef(false);

  /** SAVE SCROLL */
  const saveScroll = () => {
    try {
      sessionStorage.setItem("homeScroll", String(window.scrollY));
    } catch {}
  };

  /** RESTORE SCROLL */
  useEffect(() => {
    const saved = sessionStorage.getItem("homeScroll");
    if (saved) {
      setTimeout(() => window.scrollTo(0, Number(saved)), 50);
    }
  }, []);

  /** HELPERS: robust timestamp -> Date */
  const toDate = (ts) => {
    if (!ts) return null;
    if (typeof ts === "number") return new Date(ts);
    if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return null;
  };

  const timeAgo = (ts) => {
    const d = toDate(ts);
    if (!d) return "";
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  };

  /** LOAD POSTS (real-time) */
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const arr = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const id = d.id;

            // fetch profile info if not embedded on post
            let userName = null;
            let stageName = null;
            let profilePhoto = data.profilePhoto || data.photoURL || null;

            try {
              const uRef = doc(db, "users", data.userId);
              const uSnap = await getDoc(uRef);
              if (uSnap.exists()) {
                const u = uSnap.data();
                userName = u.username || u.userName || u.user || null;
                stageName = u.stageName || null;
                profilePhoto = profilePhoto || u.photoURL || u.profilePhoto || null;
              }
            } catch {}

            return {
              id,
              ...data,
              likes: Array.isArray(data.likes) ? data.likes : [],
              comments: Array.isArray(data.comments) ? data.comments : [],
              userName,
              userStageName: stageName || data.userStageName || "Unknown Artist",
              profilePhoto,
            };
          })
        );

        // Optionally exclude current user's posts from feed
        setPosts(arr.filter((p) => p.userId !== currentUser.uid));
        mountedRef.current = true;
      },
      (err) => console.error("Home snapshot error:", err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  /** LIKE TOGGLE (uses arrays on post doc) */
  const handleLike = async (postId) => {
    if (!currentUser) return navigate("/login");

    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) return;

      const likes = snap.data().likes || [];
      const hasLiked = likes.includes(currentUser.uid);

      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
      }
    } catch (err) {
      console.error("Like toggle error:", err);
    }
  };

  /** ADD COMMENT (appends object to comments array) */
  const handleComment = async (postId) => {
    if (!currentUser) return navigate("/login");
    const text = (commentText[postId] || "").trim();
    if (!text) return;

    try {
      // try to get nicer display name
      let userName = currentUser.displayName || null;
      try {
        const uRef = doc(db, "users", currentUser.uid);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const u = uSnap.data();
          userName = userName || u.username || u.userName || u.stageName || null;
        }
      } catch {}

      const postRef = doc(db, "posts", postId);
      const newComment = {
        userId: currentUser.uid,
        userName: userName || null,
        text,
        createdAt: Date.now(), // simple numeric timestamp (consistent with Home usage)
      };

      await updateDoc(postRef, { comments: arrayUnion(newComment) });

      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-gray-900 text-3xl font-semibold mb-6">Welcome To MuZikNet</h1>

      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            role="article"
          >
            {/* card inner container with consistent width */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                {/* left: profile */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {post.profilePhoto ? (
                      <img
                        src={post.profilePhoto}
                        alt={`Profile photo of ${post.userStageName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🎵
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-gray-900 font-semibold leading-tight">
                      {post.userStageName || "Unknown Artist"}
                    </div>
                    <div className="text-sm text-gray-500">{"$" + (post.userName || "no-username")}</div>
                  </div>
                </div>

                {/* right: relative time */}
                <div className="text-sm text-gray-400">{timeAgo(post.createdAt)}</div>
              </div>

              {/* caption */}
              {post.caption ? (
                <p className="text-gray-700 mt-3 mb-3">
                  {expandedPosts[post.id] ? post.caption : post.caption?.slice(0, 280)}
                  {post.caption && post.caption.length > 280 && (
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="ml-2 text-sm text-purple-600 font-medium"
                    >
                      {expandedPosts[post.id] ? "See less" : "…See more"}
                    </button>
                  )}
                </p>
              ) : null}

              {/* media container (rounded) */}
              <div
                className="rounded-lg overflow-hidden bg-gray-100"
                onClick={() => {
                  saveScroll();
                  navigate(`/post/${post.id}`, { state: { fromProfile: false } });
                }}
                role="button"
                tabIndex={0}
              >
                {post.mediaURLs?.[0] ? (
                  /\.(mp4|mov|webm)$/i.test(post.mediaURLs[0]) ? (
                    <video
                      src={post.mediaURLs[0]}
                      className="w-full max-h-[480px] object-cover"
                      muted
                      playsInline
                      controls={false}
                      aria-label={`Video by ${post.userName || post.userStageName}`}
                    />
                  ) : (
                    <img
                      src={post.mediaURLs[0]}
                      alt={`Post by ${post.userStageName || post.userName}`}
                      className="w-full max-h-[480px] object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-gray-400">No media</div>
                )}
              </div>

              {/* thin divider */}
              <div className="border-t border-gray-100 mt-3 mb-3" />

              {/* actions (icons only) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 p-2 rounded-md transition ${
                      (post.likes || []).includes(currentUser?.uid)
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-label="Like"
                    title="Like"
                  >
                    {/* heart icon (SVG) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill={(post.likes || []).includes(currentUser?.uid) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.35-9-8.5A5 5 0 0111 5l1 1 1-1a5 5 0 018 7.5C19 16.65 12 21 12 21z" />
                    </svg>
                    <span className="text-sm">{(post.likes || []).length}</span>
                  </button>

                  <button
                    onClick={() => {
                      saveScroll();
                      navigate(`/post/${post.id}`, { state: { fromProfile: false } });
                    }}
                    className="flex items-center gap-2 p-2 rounded-md text-gray-700 hover:bg-gray-50"
                    aria-label="Comments"
                    title="Comments"
                  >
                    {/* comment icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 3.866-3.582 7-8 7-1.28 0-2.49-.2-3.57-.57L3 20l1.57-3.43A8.962 8.962 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
                    </svg>
                    <span className="text-sm">{(post.comments || []).length}</span>
                  </button>
                </div>

                {/* right side can hold share/bookmark in future */}
                <div className="text-sm text-gray-400" />
              </div>

              {/* inline comment input */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText[post.id] || ""}
                  onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button
                  onClick={() => handleComment(post.id)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm hover:bg-purple-700"
                >
                  Post
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
