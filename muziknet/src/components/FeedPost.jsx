// src/components/FeedPost.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Heart, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";

export default function FeedPost({ 
  post, 
  currentUser, 
  onLike, 
  onComment, 
  navigate, 
  saveScroll, 
  registerVideoRef, 
  isMuted, 
  onToggleMute 
}) {
  const [commentText, setCommentText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // NEW: Real-time comment counter
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);

  // NEW: Listener to grab the live comment count for this specific post
  useEffect(() => {
    const q = query(collection(db, "comments"), where("postId", "==", post.id));
    const unsub = onSnapshot(q, (snap) => {
      setCommentCount(snap.size);
    });
    return () => unsub();
  }, [post.id]);

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText(""); 
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="p-4">
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${post.userId}`)}>
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
              {post.profilePhoto ? (
                <img src={post.profilePhoto} alt={post.userStageName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">🎵</div>
              )}
            </div>
            <div>
              <div className="text-gray-900 font-semibold leading-tight hover:text-brand-600 transition">
                {post.userStageName || "Unknown Artist"}
              </div>
              <div className="text-sm text-gray-500">${post.userName || "user"}</div>
            </div>
          </div>
          <div className="text-sm text-gray-400 font-medium">{timeAgo(post.createdAt)}</div>
        </div>

        {post.caption && (
          <p className="text-gray-700 mt-3 mb-3 text-sm md:text-base leading-relaxed">
            {isExpanded ? post.caption : post.caption.slice(0, 280)}
            {post.caption.length > 280 && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 text-sm text-brand-600 font-bold hover:underline">
                {isExpanded ? "See less" : "…See more"}
              </button>
            )}
          </p>
        )}

        <div 
          className="relative rounded-xl overflow-hidden bg-black shadow-sm cursor-pointer group"
          onClick={() => {
            saveScroll();
            navigate(`/post/${post.id}`, { state: { fromProfile: false } });
          }}
        >
          {post.mediaURLs?.[0] ? (
            (post.mediaType === "video" || /\.(mp4|mov|webm)/i.test(post.mediaURLs[0])) ? (
              <>
                <video
                  ref={registerVideoRef}
                  src={post.mediaURLs[0]}
                  className="w-full max-h-[500px] object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute();
                  }}
                  className="absolute bottom-3 right-3 p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all z-10 opacity-100 md:opacity-0 group-hover:opacity-100"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <img src={post.mediaURLs[0]} alt="Post" className="w-full max-h-[500px] object-cover" />
            )
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-gray-400 bg-gray-50">No media</div>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-4 mb-3">
          <button onClick={() => onLike(post.id)} className={`flex items-center gap-2 p-2 rounded-lg transition ${post.likes?.includes(currentUser?.uid) ? "bg-red-50 text-red-500" : "text-gray-600 hover:bg-gray-50"}`}>
            <Heart className={`w-5 h-5 ${post.likes?.includes(currentUser?.uid) ? "fill-red-500" : ""}`} />
            <span className="text-sm font-bold">{post.likes?.length || 0}</span>
          </button>

          <button 
            onClick={() => { saveScroll(); navigate(`/post/${post.id}`, { state: { fromProfile: false } }); }}
            className="flex items-center gap-2 p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <MessageCircle className="w-5 h-5" />
            {/* NEW: Use the real-time commentCount state here */}
            <span className="text-sm font-bold">{commentCount}</span>
          </button>
        </div>

        <div className="border-t border-gray-100 mb-3" />

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!commentText.trim()}
            className="bg-brand-600 text-white p-2.5 rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </article>
  );
}