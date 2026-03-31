// src/pages/PostViewer.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { Heart, MessageCircle, Send, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import DefaultAvatar from "../components/DefaultAvatar";

export default function PostViewer() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [profilePosts, setProfilePosts] = useState(location.state?.posts || []);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [newComment, setNewComment] = useState("");
  const user = auth.currentUser;

  // Real-time listener for the specific post (for instant likes/comments)
  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const unsub = onSnapshot(postRef, (snap) => {
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (profilePosts.length > 0) {
      const idx = profilePosts.findIndex((p) => p.id === postId);
      setCurrentIndex(idx !== -1 ? idx : null);
    }
  }, [postId, profilePosts]);

  const toggleLike = async () => {
    if (!user) return navigate("/login");
    const postRef = doc(db, "posts", post.id);
    const hasLiked = post.likes?.includes(user.uid);
    await updateDoc(postRef, {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) return;
    const postRef = doc(db, "posts", post.id);
    const commentObj = {
      userId: user.uid,
      userName: user.displayName || "User",
      text: newComment.trim(),
      createdAt: Date.now(),
    };
    await updateDoc(postRef, { comments: arrayUnion(commentObj) });
    setNewComment("");
  };

  if (!post) return <div className="h-screen flex items-center justify-center text-brand-600 animate-pulse">🎵 Loading Post...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden shadow-soft border border-gray-100">
        
        {/* LEFT SIDE: MEDIA */}
        <div className="relative bg-black flex items-center justify-center aspect-square lg:aspect-auto lg:h-[600px]">
          {(post.mediaType === "video" || post.mediaURLs?.[0]?.match(/\.(mp4|mov|webm)/i)) ? (
            <video src={post.mediaURLs[0]} controls autoPlay className="w-full h-full object-contain" />
          ) : (
            <img src={post.mediaURLs?.[0]} alt="" className="w-full h-full object-contain" />
          )}

          {currentIndex > 0 && (
            <button onClick={() => navigate(`/post/${profilePosts[currentIndex - 1].id}`, { state: { posts: profilePosts } })} className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < profilePosts.length - 1 && (
            <button onClick={() => navigate(`/post/${profilePosts[currentIndex + 1].id}`, { state: { posts: profilePosts } })} className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* RIGHT SIDE: INTERACTIONS */}
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
               {post.profilePhoto ? <img src={post.profilePhoto} className="w-full h-full object-cover" /> : <DefaultAvatar />}
            </div>
            <div>
              <p className="font-bold text-gray-900">{post.username || "Artist"}</p>
              <p className="text-xs text-gray-400">Post</p>
            </div>
          </div>

          {/* Comments Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar bg-gray-50/30">
            {post.caption && <p className="text-gray-800 text-sm leading-relaxed pb-4 border-b border-gray-100">{post.caption}</p>}
            
            {post.comments?.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">No comments yet. Start the conversation!</p>
            ) : (
              post.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-brand-600 mb-1">{c.userName}</p>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions & Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${post.likes?.includes(user?.uid) ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}>
                <Heart className={`w-6 h-6 ${post.likes?.includes(user?.uid) ? "fill-current" : ""}`} />
                <span className="text-sm font-bold">{post.likes?.length || 0}</span>
              </button>
              <div className="flex items-center gap-1.5 text-gray-500">
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-bold">{post.comments?.length || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-brand-200 transition-all">
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <button onClick={submitComment} disabled={!newComment.trim()} className="text-brand-600 disabled:opacity-30">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}