import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  orderBy,
} from "firebase/firestore";

export default function UserPostViewer() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  // cache for commenter names to avoid repeated lookups
  const commenterCacheRef = useRef({});

  useEffect(() => {
    const fetchPost = async () => {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        navigate("/"); // fallback if post doesn't exist
        return;
      }

      const postData = postSnap.data();
      const userRef = doc(db, "users", postData.userId);
      const userSnap = await getDoc(userRef);
      postData.userStageName = userSnap.exists() ? userSnap.data().stageName : "Unknown Artist";

      setPost({ id: postSnap.id, ...postData });
      setLoading(false);
    };

    fetchPost();
  }, [postId, navigate]);

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
      // find which userIds we need names for
      const missingIds = Array.from(
        new Set(raw.map((c) => c.userId).filter((id) => !commenterCacheRef.current[id]))
      );

      if (missingIds.length > 0) {
        // fetch missing user documents in parallel
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

      // attach stageName to comments
      const withNames = raw.map((c) => ({
        ...c,
        stageName: commenterCacheRef.current[c.userId] || (c.userId === currentUser?.uid ? "You" : "Artist"),
      }));

      setComments(withNames);
    });

    return () => unsubscribe();
  }, [post, currentUser]);

  const handleLike = async () => {
    if (!currentUser) return navigate("/login");

    const likeRef = collection(db, "likes");
    const existingLikeQuery = query(
      likeRef,
      where("postId", "==", post.id),
      where("userId", "==", currentUser.uid)
    );

    const snap = await getDocs(existingLikeQuery);
    if (snap.empty) {
      await addDoc(likeRef, { postId: post.id, userId: currentUser.uid, createdAt: serverTimestamp() });
    }
  };

  const handleComment = async () => {
    if (!currentUser || !commentText.trim()) return;

    const commentsRef = collection(db, "comments");
    await addDoc(commentsRef, {
      postId: post.id,
      userId: currentUser.uid,
      text: commentText.trim(),
      createdAt: serverTimestamp(),
    });

    setCommentText("");
  };

  const goBack = () => {
    // prefer history back so page isn't reloaded
    try {
      const saved = sessionStorage.getItem("homeScroll") || "0";
      // if there is history, go back; else go to home.
      if (window.history.length > 1) {
        navigate(-1);
        // small delay then ensure correct scroll
        setTimeout(() => {
          window.scrollTo(0, Number(saved));
        }, 50);
      } else {
        navigate("/", { replace: true });
        setTimeout(() => {
          window.scrollTo(0, Number(saved));
        }, 50);
      }
    } catch (e) {
      navigate("/", { replace: true });
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Loading post… 🎵</div>
      </div>
    );

  if (!post)
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Post not found.</div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/90 z-50 text-white flex flex-col overflow-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3">
        <button onClick={goBack} className="bg-white/10 px-3 py-1 rounded hover:bg-white/20">
          ← Back
        </button>
        <div className="text-xs text-gray-400">{post.userStageName}</div>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center px-4">
        {post.mediaURLs?.[0] ? (
          post.mediaURLs[0].match(/\.(mp4|mov|webm)$/i) ? (
            <video src={post.mediaURLs[0]} controls className="max-h-[80vh] max-w-full object-contain" />
          ) : (
            <img src={post.mediaURLs[0]} alt="Post media" className="max-h-[80vh] max-w-full object-contain" />
          )
        ) : (
          <div className="text-gray-400">No media</div>
        )}
      </div>

      {/* Caption & interactions */}
      <div className="p-4 border-t border-white/10 flex flex-col gap-3">
        <p className="text-gray-300">{post.caption || "No caption"}</p>

        <div className="flex items-center gap-3">
          <button onClick={handleLike} className="bg-blue-500 text-white px-3 py-1 rounded">
            ♡ Like ({likesCount})
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-400">Comments ({comments.length})</div>
          {comments.map((c) => (
            <div key={c.id} className="bg-white/10 p-2 rounded text-sm">
              <strong>{c.userId === currentUser?.uid ? "You" : c.stageName}: </strong>
              {c.text}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-black"
          />
          <button onClick={handleComment} className="bg-gray-800 text-white px-3 py-1 rounded">
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
