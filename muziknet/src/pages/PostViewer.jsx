// src/pages/PostViewer.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, query, where, addDoc, serverTimestamp, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { Heart, MessageCircle, Send, ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import DefaultAvatar from "../components/DefaultAvatar";

export default function PostViewer() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [profilePosts, setProfilePosts] = useState(location.state?.posts || []);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const commenterCacheRef = useRef({});

  // Real-time listener for the specific post
  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const unsub = onSnapshot(postRef, async (snap) => {
      if (snap.exists()) {
        const postData = snap.data();
        // Fetch the user's stage name if not embedded
        try {
          const userRef = doc(db, "users", postData.userId);
          const userSnap = await getDoc(userRef);
          postData.userStageName = userSnap.exists() ? userSnap.data().stageName : "Unknown Artist";
        } catch (e) {
           postData.userStageName = "Artist";
        }
        setPost({ id: snap.id, ...postData });
        setLoading(false);
      } else {
        navigate("/"); // Fallback if post is deleted or doesn't exist
      }
    });
    return () => unsub();
  }, [postId, navigate]);

  useEffect(() => {
    if (profilePosts.length > 0) {
      const idx = profilePosts.findIndex((p) => p.id === postId);
      setCurrentIndex(idx !== -1 ? idx : null);
    }
  }, [postId, profilePosts]);

  // Likes (live)
  useEffect(() => {
    if (!post) return;
    const likesQ = query(collection(db, "likes"), where("postId", "==", post.id));
    const unsubscribe = onSnapshot(likesQ, (snap) => {
      setLikesCount(snap.size);
    });
    return () => unsubscribe();
  }, [post]);

  // Comments (live) + resolve commenter stage names with caching
  useEffect(() => {
    if (!post) return;
    const commentsQ = query(
      collection(db, "comments"),
      where("postId", "==", post.id),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(commentsQ, async (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      const missingIds = Array.from(
        new Set(raw.map((c) => c.userId).filter((id) => !commenterCacheRef.current[id]))
      );

      if (missingIds.length > 0) {
        await Promise.all(
          missingIds.map(async (uid) => {
            try {
              const uRef = doc(db, "users", uid);
              const uSnap = await getDoc(uRef);
              commenterCacheRef.current[uid] = uSnap.exists() ? uSnap.data().stageName || "Artist" : "Artist";
            } catch (e) {
              commenterCacheRef.current[uid] = "Artist";
            }
          })
        );
      }

      const withNames = raw.map((c) => ({
        ...c,
        stageName: commenterCacheRef.current[c.userId] || (c.userId === user?.uid ? "You" : "Artist"),
      }));

      setComments(withNames);
    });

    return () => unsubscribe();
  }, [post, user]);

  const handleLike = async () => {
    if (!user) return navigate("/login");

    const likeRef = collection(db, "likes");
    const existingLikeQuery = query(
      likeRef,
      where("postId", "==", post.id),
      where("userId", "==", user.uid)
    );

    const snap = await getDocs(existingLikeQuery);
    if (snap.empty) {
      await addDoc(likeRef, { postId: post.id, userId: user.uid, createdAt: serverTimestamp() });

      if (post.userId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          type: "social",
          message: `${user.displayName || "Someone"} liked your post.`,
          link: `/user/${post.userId}`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    
    const textToSave = newComment.trim();
    const commentsRef = collection(db, "comments");
    await addDoc(commentsRef, {
      postId: post.id,
      userId: user.uid,
      text: textToSave,
      createdAt: serverTimestamp(),
    });

    setNewComment("");

    if (post.userId !== user.uid) {
      await addDoc(collection(db, "notifications"), {
        userId: post.userId,
        type: "social",
        message: `${user.displayName || "Someone"} commented: "${textToSave.length > 20 ? textToSave.substring(0, 20) + '...' : textToSave}"`,
        link: `/user/${post.userId}`,
        isRead: false,
        createdAt: serverTimestamp()
      });
    }
  };

  // NEW: Handle Deletion
  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, "posts", post.id));
      goBack(); // Kicks them back to the previous screen automatically
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post. Please try again.");
    }
  };

  const goBack = () => {
    try {
      const saved = sessionStorage.getItem("homeScroll") || "0";
      if (window.history.length > 1) {
        navigate(-1);
        setTimeout(() => window.scrollTo(0, Number(saved)), 50);
      } else {
        navigate("/", { replace: true });
        setTimeout(() => window.scrollTo(0, Number(saved)), 50);
      }
    } catch (e) {
      navigate("/", { replace: true });
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-black/90 text-brand-500 font-bold animate-pulse">
        <div>Loading post… 🎵</div>
      </div>
    );

  if (!post)
    return (
      <div className="h-screen flex items-center justify-center bg-black/90 text-white font-bold">
        <div>Post not found.</div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/95 z-50 text-white flex flex-col overflow-auto">
      
      {/* Top bar with back button, username, and conditionally rendered delete button */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button onClick={goBack} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full font-bold hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-sm font-extrabold text-gray-300">{post.userStageName}</div>
          
          {/* ONLY SHOW DELETE BUTTON TO THE POST OWNER */}
          {user?.uid === post.userId && (
            <button 
              onClick={handleDeletePost} 
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center p-4 relative group">
        {post.mediaURLs?.[0] ? (
          (post.mediaType === "video" || post.mediaURLs[0].match(/\.(mp4|mov|webm)/i)) ? (
            <video src={post.mediaURLs[0]} controls autoPlay className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl" />
          ) : (
            <img src={post.mediaURLs[0]} alt="Post media" className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl" />
          )
        ) : (
          <div className="text-gray-500 font-bold">No media</div>
        )}

        {/* Carousel controls */}
        {currentIndex > 0 && (
          <button onClick={() => navigate(`/post/${profilePosts[currentIndex - 1].id}`, { state: { posts: profilePosts } })} className="absolute left-6 p-3 bg-black/50 hover:bg-brand-600 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < profilePosts.length - 1 && (
          <button onClick={() => navigate(`/post/${profilePosts[currentIndex + 1].id}`, { state: { posts: profilePosts } })} className="absolute right-6 p-3 bg-black/50 hover:bg-brand-600 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Caption & interactions */}
      <div className="p-6 bg-gray-900 rounded-t-3xl flex flex-col gap-4 max-w-4xl mx-auto w-full">
        {post.caption && <p className="text-gray-200 leading-relaxed">{post.caption}</p>}

        <div className="flex items-center gap-3 py-2 border-b border-white/10">
          <button onClick={handleLike} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white px-4 py-2.5 rounded-full font-bold">
            <Heart className={`w-5 h-5 ${post.likes?.includes(user?.uid) ? "fill-red-500 text-red-500" : ""}`} /> 
            {likesCount}
          </button>
          <div className="flex items-center gap-2 text-gray-400 font-bold px-2">
             <MessageCircle className="w-5 h-5" /> {comments.length} Comments
          </div>
        </div>

        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto hide-scrollbar">
          {comments.map((c) => (
            <div key={c.id} className="bg-white/5 p-3 rounded-2xl text-sm border border-white/5">
              <strong className="text-brand-400">{c.userId === user?.uid ? "You" : c.stageName}: </strong>
              <span className="text-gray-300">{c.text}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            className="flex-1 bg-white/10 border border-transparent focus:border-brand-500 focus:bg-white/20 rounded-full px-5 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-500"
          />
          <button onClick={submitComment} disabled={!newComment.trim()} className="bg-brand-600 text-white px-5 py-3 rounded-full font-bold hover:bg-brand-700 transition-colors disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}