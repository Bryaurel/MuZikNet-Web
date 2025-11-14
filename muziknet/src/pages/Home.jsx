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
  addDoc,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [likesCount, setLikesCount] = useState({});
  const [commentsCount, setCommentsCount] = useState({});
  const [commentText, setCommentText] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const scrollYRef = useRef(0);

  const saveScroll = () => {
    scrollYRef.current = window.scrollY;
  };

  useEffect(() => {
    window.scrollTo(0, scrollYRef.current);
  }, [posts]);

  // Load posts
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const postsData = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const post = { id: docSnap.id, ...docSnap.data() };
          const userRef = doc(db, "users", post.userId);
          const userSnap = await getDoc(userRef);
          post.userStageName = userSnap.exists()
            ? userSnap.data().stageName
            : "Unknown Artist";
          return post;
        })
      );
      // Exclude current user's posts
      const filteredPosts = postsData.filter((p) => p.userId !== currentUser.uid);
      setPosts(filteredPosts);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Load likes & comments count
  useEffect(() => {
    posts.forEach((post) => {
      const likesQ = query(collection(db, "likes"), where("postId", "==", post.id));
      onSnapshot(likesQ, (snap) => {
        setLikesCount((prev) => ({ ...prev, [post.id]: snap.size }));
      });

      const commentsQ = query(collection(db, "comments"), where("postId", "==", post.id));
      onSnapshot(commentsQ, (snap) => {
        setCommentsCount((prev) => ({ ...prev, [post.id]: snap.size }));
      });
    });
  }, [posts]);

  const handleLike = async (postId) => {
    if (!currentUser) return navigate("/login");

    const likeRef = collection(db, "likes");
    const existingLikeQuery = query(
      likeRef,
      where("postId", "==", postId),
      where("userId", "==", currentUser.uid)
    );

    const snap = await getDocs(existingLikeQuery);
    if (snap.empty) {
      await addDoc(likeRef, { postId, userId: currentUser.uid, createdAt: serverTimestamp() });
    }
  };

  const handleComment = async (postId) => {
    if (!currentUser || !commentText[postId]) return;

    const commentsRef = collection(db, "comments");
    await addDoc(commentsRef, {
      postId,
      userId: currentUser.uid,
      text: commentText[postId],
      createdAt: serverTimestamp(),
    });

    setCommentText((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Welcome to MuZikNet</h2>

      <div className="space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white shadow-md rounded-lg p-4 flex gap-4 items-start"
            style={{ minHeight: "250px" }} // uniform post height
          >
            {/* Media */}
            <div className="flex-shrink-0 w-2/5 h-full cursor-pointer">
              {post.mediaURLs?.[0] ? (
                post.mediaURLs[0].match(/\.(mp4|mov|webm)$/i) ? (
                  <video
                    src={post.mediaURLs[0]}
                    className="w-full h-full object-cover rounded"
                    onClick={() => {
                      saveScroll();
                      navigate(`/user-post/${post.id}`);
                    }}
                  />
                ) : (
                  <img
                    src={post.mediaURLs[0]}
                    className="w-full h-full object-cover rounded"
                    onClick={() => {
                      saveScroll();
                      navigate(`/user-post/${post.id}`);
                    }}
                  />
                )
              ) : (
                <div className="w-full h-full bg-gray-200 rounded"></div>
              )}
            </div>

            {/* Caption & Actions */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-xl font-semibold">{post.userStageName}</h3>

              <p className="text-gray-600 mt-2 overflow-hidden" style={{ maxHeight: "6rem" }}>
                {expandedPosts[post.id] ? post.caption : post.caption?.slice(0, 150) || "No caption"}
                {post.caption && post.caption.length > 150 && (
                  <span
                    onClick={() => toggleExpand(post.id)}
                    className="text-blue-500 cursor-pointer ml-1"
                  >
                    {expandedPosts[post.id] ? "See less" : "See more"}
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleLike(post.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  ♡ Like ({likesCount[post.id] || 0})
                </button>

                <button
                  onClick={() => {
                    saveScroll();
                    navigate(`/user-post/${post.id}`);
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  💬 Comment ({commentsCount[post.id] || 0})
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText[post.id] || ""}
                  onChange={(e) =>
                    setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => handleComment(post.id)}
                  className="bg-gray-800 text-white px-3 py-1 rounded"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
