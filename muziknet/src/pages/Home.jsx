// src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { Volume2, VolumeX } from "lucide-react"; // NEW IMPORTS

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentText, setCommentText] = useState({});
  
  // NEW: Global mute state for the feed
  const [isMuted, setIsMuted] = useState(true); 
  
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  
  const mountedRef = useRef(false);
  const videoRefs = useRef(new Map());

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

  /** HELPERS */
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

        setPosts(arr.filter((p) => p.userId !== currentUser.uid));
        mountedRef.current = true;
      },
      (err) => console.error("Home snapshot error:", err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  /** AUTO-PLAY VIDEOS ON SCROLL */
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.6,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch((error) => {
             console.warn("Auto-play prevented by browser:", error);
          });
        } else {
          video.pause();
        }
      });
    }, observerOptions);

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [posts]);

  /** LIKE TOGGLE */
  const handleLike = async (postId) => {
    if (!currentUser) return navigate("/login");

    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) return;

      const postData = snap.data();
      const likes = postData.likes || [];
      const hasLiked = likes.includes(currentUser.uid);

      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });

        if (postData.userId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: postData.userId,
            type: "social",
            message: `${currentUser.displayName || "Someone"} liked your post.`,
            link: `/post/${postId}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("Like toggle error:", err);
    }
  };

  /** ADD COMMENT */
  const handleComment = async (postId) => {
    if (!currentUser) return navigate("/login");
    const text = (commentText[postId] || "").trim();
    if (!text) return;

    try {
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
      const postSnap = await getDoc(postRef);
      
      const newComment = {
        userId: currentUser.uid,
        userName: userName || null,
        text,
        createdAt: Date.now(), 
      };

      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText((prev) => ({ ...prev, [postId]: "" }));

      if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: postSnap.data().userId,
          type: "social",
          message: `${userName || "Someone"} commented: "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
          link: `/post/${postId}`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
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
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${post.userId}`)}>
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
                    <div className="text-gray-900 font-semibold leading-tight hover:text-brand-600 transition">
                      {post.userStageName || "Unknown Artist"}
                    </div>
                    <div className="text-sm text-gray-500">{"$" + (post.userName || "no-username")}</div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">{timeAgo(post.createdAt)}</div>
              </div>

              {post.caption ? (
                <p className="text-gray-700 mt-3 mb-3">
                  {expandedPosts[post.id] ? post.caption : post.caption?.slice(0, 280)}
                  {post.caption && post.caption.length > 280 && (
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="ml-2 text-sm text-purple-600 font-medium hover:underline"
                    >
                      {expandedPosts[post.id] ? "See less" : "…See more"}
                    </button>
                  )}
                </p>
              ) : null}

              {/* MEDIA CONTAINER */}
              <div
                className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                onClick={() => {
                  saveScroll();
                  navigate(`/post/${post.id}`, { state: { fromProfile: false } });
                }}
              >
                {post.mediaURLs?.[0] ? (
                  (post.mediaType === "video" || /\.(mp4|mov|webm)/i.test(post.mediaURLs[0])) ? (
                    <>
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current.set(post.id, el);
                          else videoRefs.current.delete(post.id);
                        }}
                        src={post.mediaURLs[0]}
                        className="w-full max-h-[480px] object-cover"
                        muted={isMuted} // Bound to global state
                        loop
                        playsInline
                        controls={false}
                        aria-label={`Video by ${post.userName || post.userStageName}`}
                      />
                      
                      {/* MUTE TOGGLE BUTTON */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents navigating to the PostViewer
                          setIsMuted((prev) => !prev);
                        }}
                        className="absolute bottom-3 right-3 p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all z-10 opacity-100 md:opacity-0 group-hover:opacity-100"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </>
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
              
              <div className="border-t border-gray-100 mt-3 mb-3" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 p-2 rounded-md transition ${
                      (post.likes || []).includes(currentUser?.uid)
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
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
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 3.866-3.582 7-8 7-1.28 0-2.49-.2-3.57-.57L3 20l1.57-3.43A8.962 8.962 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
                    </svg>
                    <span className="text-sm">{(post.comments || []).length}</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText[post.id] || ""}
                  onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button
                  onClick={() => handleComment(post.id)}
                  disabled={!commentText[post.id]?.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm hover:bg-purple-700 disabled:opacity-50"
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