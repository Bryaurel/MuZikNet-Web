import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, deleteField } from "firebase/firestore";

export default function PostViewer() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      if (ts.toDate) return ts.toDate();
      if (ts.seconds) return new Date(ts.seconds * 1000);
    } catch {
      return null;
    }
    return null;
  };

  // Load user's posts
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return navigate("/login");

    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setPosts(arr);
        setLoading(false);
      },
      (err) => {
        console.error("PostViewer snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  // Find clicked post index
  useEffect(() => {
    if (!posts.length) return;
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return navigate("/profile");
    setCurrentIndex(idx);
    setMediaIndex(0);
  }, [posts, postId, navigate]);

  // Keyboard navigation
  const onKeyDown = useCallback(
    (e) => {
      if (currentIndex === null) return;
      const media = posts[currentIndex]?.mediaURLs || [];
      if (e.key === "ArrowLeft") {
        if (mediaIndex > 0) setMediaIndex((i) => i - 1);
        else if (currentIndex > 0) navigate(`/post/${posts[currentIndex - 1].id}`, { replace: true });
      } else if (e.key === "ArrowRight") {
        if (mediaIndex < media.length - 1) setMediaIndex((i) => i + 1);
        else if (currentIndex < posts.length - 1) navigate(`/post/${posts[currentIndex + 1].id}`, { replace: true });
      } else if (e.key === "Escape") navigate("/profile");
    },
    [currentIndex, mediaIndex, posts, navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Loading post… 🎵</div>
      </div>
    );

  if (currentIndex === null)
    return (
      <div className="h-screen flex items-center justify-center">
        <div>No post found. Returning to profile...</div>
      </div>
    );

  const post = posts[currentIndex];
  const media = post.mediaURLs || [];
  const currentMedia = media[mediaIndex];
  const user = auth.currentUser;

  const goPrevPost = () => {
    if (currentIndex > 0) navigate(`/post/${posts[currentIndex - 1].id}`, { replace: true });
  };
  const goNextPost = () => {
    if (currentIndex < posts.length - 1) navigate(`/post/${posts[currentIndex + 1].id}`, { replace: true });
  };
  const prevMedia = () => { if (mediaIndex > 0) setMediaIndex((i) => i - 1); };
  const nextMedia = () => { if (mediaIndex < media.length - 1) setMediaIndex((i) => i + 1); };
  const goBack = () => navigate("/profile");

  // Toggle like
  const toggleLike = async () => {
    if (!user) return;
    const postRef = doc(db, "posts", post.id);
    const userHasLiked = post.likes?.[user.uid] ?? false;
    try {
      if (userHasLiked) {
        await updateDoc(postRef, { [`likes.${user.uid}`]: deleteField() });
      } else {
        await updateDoc(postRef, { [`likes.${user.uid}`]: true });
      }
    } catch (err) {
      console.error("Error updating likes:", err);
    }
  };

  // Add comment
  const addComment = async () => {
    if (!user || !commentText.trim()) return;
    const postRef = doc(db, "posts", post.id);
    try {
      await updateDoc(postRef, {
        comments: arrayUnion({
          userId: user.uid,
          text: commentText,
          createdAt: new Date()
        })
      });
      setCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="bg-white/10 px-3 py-1 rounded hover:bg-white/20">← Back</button>
          <div className="text-sm text-gray-300">{post.caption || "No caption"}</div>
        </div>
        <div className="text-xs text-gray-400">{formatTimestamp(post.createdAt)?.toLocaleString() || ""}</div>
      </div>

      {/* Main media area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <button onClick={goPrevPost} disabled={currentIndex === 0} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 rounded-full p-3 disabled:opacity-30">←</button>
        <button onClick={goNextPost} disabled={currentIndex === posts.length - 1} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 rounded-full p-3 disabled:opacity-30">→</button>

        <div className="max-w-4xl w-full h-full flex items-center justify-center">
          {currentMedia ? (
            currentMedia.match(/\.(mp4|mov|webm)$/i) ? (
              <video key={currentMedia} src={currentMedia} controls className="max-h-[85vh] max-w-full object-contain" />
            ) : (
              <img key={currentMedia} src={currentMedia} alt="Post media" className="max-h-[85vh] max-w-full object-contain" />
            )
          ) : <div className="text-gray-400">No media</div>}
        </div>

        {media.length > 1 && (
          <>
            <button onClick={prevMedia} disabled={mediaIndex === 0} className="absolute left-20 top-1/2 transform -translate-y-1/2 bg-white/10 rounded-full p-2 disabled:opacity-30">◀</button>
            <button onClick={nextMedia} disabled={mediaIndex === media.length - 1} className="absolute right-20 top-1/2 transform -translate-y-1/2 bg-white/10 rounded-full p-2 disabled:opacity-30">▶</button>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={toggleLike} className="bg-white/10 px-3 py-1 rounded">
              {post.likes?.[user.uid] ? "❤️ Liked" : "♡ Like"} ({Object.keys(post.likes || {}).length})
            </button>
          </div>
          <div className="text-sm text-gray-400">{currentIndex + 1} / {posts.length}</div>
        </div>

        {/* Comments */}
        <div className="mb-2 max-h-32 overflow-y-auto">
          {post.comments?.map((c, i) => (
            <div key={i} className="text-sm text-gray-200">
              <strong>{c.userId}</strong>: {c.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 p-2 rounded bg-white/10 text-white"
            onKeyDown={(e) => e.key === "Enter" && addComment()}
          />
          <button onClick={addComment} className="bg-white/10 px-3 py-1 rounded">💬</button>
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2 items-center overflow-x-auto mt-3">
          {media.map((url, i) => (
            <button key={i} onClick={() => setMediaIndex(i)} className={`w-20 h-20 flex-shrink-0 rounded overflow-hidden border-2 ${i === mediaIndex ? "border-blue-400" : "border-white/20"}`} title={`Media ${i + 1}`}>
              {url.match(/\.(mp4|mov|webm)$/i) ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
          {media.length > 1 && <div className="ml-2 text-sm text-gray-300 flex items-center gap-1">🎵 {media.length} media</div>}
        </div>
      </div>
    </div>
  );
}
