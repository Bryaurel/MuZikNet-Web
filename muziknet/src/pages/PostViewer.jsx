// PostViewer.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

function PostViewer() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]); // If coming from profile
  const [currentIndex, setCurrentIndex] = useState(null);
  const [newComment, setNewComment] = useState("");

  const user = auth.currentUser;

  // Detect if opened from Profile.jsx
  // Profile.jsx uses navigate(`/post/${post.id}`, { state: { fromProfile: true, posts: [...] } })
  const fromProfile = location.state?.fromProfile || false;

  // Load the post
  useEffect(() => {
    const loadPost = async () => {
      const ref = doc(db, "posts", postId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPost({
          id: snap.id,
          likes: data.likes || [],
          comments: data.comments || [],
          ...data,
        });
      }
    };
    loadPost();
  }, [postId]);

  // Load posts list if from profile (to enable left-right navigation)
  useEffect(() => {
    if (fromProfile && Array.isArray(location.state.posts)) {
      setProfilePosts(location.state.posts);

      const idx = location.state.posts.findIndex((p) => p.id === postId);
      setCurrentIndex(idx !== -1 ? idx : null);
    }
  }, [fromProfile, postId, location.state]);

  if (!post) {
    return (
      <div className="flex flex-col items-center mt-10 text-gray-500">
        <div className="animate-pulse text-5xl">🎵</div>
        Loading post...
      </div>
    );
  }

  const docRef = doc(db, "posts", post.id);

  // LIKE TOGGLE
  const toggleLike = async () => {
    if (!user) return;

    const alreadyLiked = (post.likes || []).includes(user.uid);

    const newLikes = alreadyLiked
      ? post.likes.filter((uid) => uid !== user.uid)
      : [...(post.likes || []), user.uid];

    setPost({ ...post, likes: newLikes });

    await updateDoc(docRef, {
      likes: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  // ADD COMMENT
  const submitComment = async () => {
    if (!user || !newComment.trim()) return;

    const commentObj = {
      userId: user.uid,
      userName:
        auth.currentUser.displayName || post.username || "Unknown User",
      text: newComment.trim(),
      createdAt: Date.now(),
    };

    const updated = [...(post.comments || []), commentObj];
    setPost({ ...post, comments: updated });
    setNewComment("");

    await updateDoc(docRef, {
      comments: arrayUnion(commentObj),
    });
  };

  // NAVIGATION (only for profile posts)
  const navigatePrev = () => {
    if (currentIndex > 0) {
      const prevPost = profilePosts[currentIndex - 1];
      navigate(`/post/${prevPost.id}`, {
        state: { fromProfile: true, posts: profilePosts },
      });
    }
  };

  const navigateNext = () => {
    if (
      currentIndex !== null &&
      currentIndex < profilePosts.length - 1
    ) {
      const nextPost = profilePosts[currentIndex + 1];
      navigate(`/post/${nextPost.id}`, {
        state: { fromProfile: true, posts: profilePosts },
      });
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:underline"
      >
        ← Back
      </button>

      {/* MEDIA DISPLAY */}
      <div className="relative w-full rounded-xl overflow-hidden bg-gray-200 border border-gray-400">
        {post.mediaURLs?.length > 0 ? (
          /\.(mp4|mov|webm)$/i.test(post.mediaURLs[0]) ? (
            <video
              src={post.mediaURLs[0]}
              controls
              className="w-full h-auto"
            />
          ) : (
            <img
              src={post.mediaURLs[0]}
              alt="Post Media"
              className="w-full h-auto object-cover"
            />
          )
        ) : (
          <div className="w-full h-60 flex justify-center items-center text-4xl text-gray-400">
            🎵
          </div>
        )}
      </div>

      {/* LEFT/RIGHT ARROWS IF FROM PROFILE */}
      {fromProfile && profilePosts.length > 1 && (
        <div className="flex justify-between text-3xl px-2">
          <button
            onClick={navigatePrev}
            disabled={currentIndex === 0}
            className={`${
              currentIndex === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:text-blue-600"
            }`}
          >
            ⬅
          </button>
          <button
            onClick={navigateNext}
            disabled={currentIndex === profilePosts.length - 1}
            className={`${
              currentIndex === profilePosts.length - 1
                ? "opacity-30 cursor-not-allowed"
                : "hover:text-blue-600"
            }`}
          >
            ➡
          </button>
        </div>
      )}

      {/* POST INFO */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{post.caption || "Untitled Post"}</h2>

        <p className="text-gray-600 text-sm">
          Posted on:{" "}
          {post.createdAt
            ? new Date(post.createdAt).toLocaleString()
            : "Unknown date"}
        </p>

        {/* Likes */}
        <button
          onClick={toggleLike}
          className="mt-2 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        >
          {post.likes?.includes(user?.uid) ? "❤️ Unlike" : "🤍 Like"}{" "}
          ({(post.likes || []).length})
        </button>
      </div>

      {/* COMMENTS */}
      <div className="mt-4 space-y-4">
        <h3 className="font-semibold text-lg">Comments</h3>

        {(post.comments || []).length > 0 ? (
          post.comments.map((c, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-100 rounded-lg border border-gray-300"
            >
              <p className="text-sm font-bold">{c.userName}</p>
              <p>{c.text}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No comments yet.</p>
        )}

        {/* ADD COMMENT */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded"
          />
          <button
            onClick={submitComment}
            className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostViewer;
