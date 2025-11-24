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

import CommentsAndLikes from "../components/CommentsAndLikes";

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
    } catch { /* empty */ }
  };

  /** RESTORE SCROLL */
  useEffect(() => {
    const saved = sessionStorage.getItem("homeScroll");
    if (saved) {
      setTimeout(() => window.scrollTo(0, Number(saved)), 50);
    }
  }, []);

  /** LOAD POSTS */
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

            try {
              const uRef = doc(db, "users", data.userId);
              const uSnap = await getDoc(uRef);
              if (uSnap.exists()) {
                const u = uSnap.data();
                userName = u.username || u.userName || u.user || null;
                stageName = u.stageName || null;
              }
            } catch { /* empty */ }

            return {
              id,
              ...data,
              likes: Array.isArray(data.likes) ? data.likes : [],
              comments: Array.isArray(data.comments) ? data.comments : [],
              userName,
              userStageName: stageName || data.userStageName || "Unknown Artist",
            };
          })
        );

        // Remove current user's posts
        setPosts(arr.filter((p) => p.userId !== currentUser.uid));
        mountedRef.current = true;
      },
      (err) => console.error("Home snapshot error:", err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  /** LIKE TOGGLE */
  const handleLike = async (postId) => {
    if (!currentUser) return navigate("/login");

    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) return;

      const likes = snap.data().likes || [];
      const hasLiked = likes.includes(currentUser.uid);

      if (hasLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
        });
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

      const newComment = {
        userId: currentUser.uid,
        userName,
        text,
        createdAt: Date.now(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment),
      });

      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Welcome to MuZikNet</h2>

      <div className="space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white shadow-md rounded-lg p-4 flex gap-6 items-start"
            style={{ minHeight: "240px" }}
          >
            {/* LEFT MEDIA */}
            <div
              className="flex-shrink-0 w-2/5 h-full cursor-pointer rounded overflow-hidden bg-gray-100"
              onClick={() => {
                saveScroll();
                navigate(`/post/${post.id}`, {
                  state: { fromProfile: false }
                });
              }}
            >
              {post.mediaURLs?.[0] ? (
                post.mediaURLs[0].match(/\.(mp4|mov|webm)$/i) ? (
                  <video
                    src={post.mediaURLs[0]}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    aria-label={`Video by ${post.userName || post.userStageName}`}
                  />
                ) : (
                  <img
                    src={post.mediaURLs[0]}
                    alt={`Post by ${post.userName || post.userStageName}`}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No media
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold">
                {(post.userName || "(no-username)") +
                  " | " +
                  (post.userStageName || "Unknown Artist")}
              </h3>

              {/* CAPTION */}
              <p className="text-gray-600 mt-2 overflow-hidden" style={{ maxHeight: "6rem" }}>
                {expandedPosts[post.id] ? post.caption : post.caption?.slice(0, 300)}
                {post.caption && post.caption.length > 300 && (
                  <span
                    onClick={() => toggleExpand(post.id)}
                    className="text-blue-500 cursor-pointer ml-1"
                  >
                    {expandedPosts[post.id] ? " See less" : " ...See more"}
                  </span>
                )}
              </p>

              {/* LIKES + COMMENTS + INPUT (component) */}
              <CommentsAndLikes
                post={post}
                currentUser={currentUser}
                handleLike={handleLike}
                handleComment={handleComment}
                commentText={commentText}
                setCommentText={setCommentText}
                navigate={navigate}
                saveScroll={saveScroll}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
