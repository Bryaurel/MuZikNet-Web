// src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, addDoc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import FeedPost from "../components/FeedPost"; // IMPORT THE NEW COMPONENT

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [isMuted, setIsMuted] = useState(true); 
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  
  const videoRefs = useRef(new Map());

  const saveScroll = () => {
    try { sessionStorage.setItem("homeScroll", String(window.scrollY)); } catch {}
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("homeScroll");
    if (saved) setTimeout(() => window.scrollTo(0, Number(saved)), 50);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snap) => {
      const arr = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let userName = null, stageName = null, profilePhoto = data.profilePhoto || data.photoURL || null;

          try {
            const uSnap = await getDoc(doc(db, "users", data.userId));
            if (uSnap.exists()) {
              const u = uSnap.data();
              userName = u.username || u.userName || null;
              stageName = u.stageName || null;
              profilePhoto = profilePhoto || u.photoURL || null;
            }
          } catch {}

          return {
            id: d.id,
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
    }, (err) => console.error("Home snapshot error:", err));

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.play().catch(() => {});
        } else {
          entry.target.pause();
        }
      });
    }, { threshold: 0.6 });

    videoRefs.current.forEach((video) => video && observer.observe(video));
    return () => observer.disconnect();
  }, [posts]);

  const handleLike = async (postId) => {
    if (!currentUser) return navigate("/login");
    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) return;

      const postData = snap.data();
      const hasLiked = (postData.likes || []).includes(currentUser.uid);

      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        if (postData.userId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: postData.userId, type: "social", message: `${currentUser.displayName || "Someone"} liked your post.`, link: `/post/${postId}`, isRead: false, createdAt: serverTimestamp()
          });
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleComment = async (postId, text) => {
    if (!currentUser || !text) return;
    try {
      let userName = currentUser.displayName || "Someone";
      const uSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (uSnap.exists()) userName = uSnap.data().stageName || userName;

      const postSnap = await getDoc(doc(db, "posts", postId));
      
      // Save directly to comments collection
      await addDoc(collection(db, "comments"), {
        postId, userId: currentUser.uid, text, createdAt: serverTimestamp(),
      });

      if (postSnap.exists() && postSnap.data().userId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: postSnap.data().userId, type: "social", message: `${userName} commented: "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`, link: `/post/${postId}`, isRead: false, createdAt: serverTimestamp()
        });
      }
    } catch (err) { console.error("Comment error:", err); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-gray-900 text-3xl font-extrabold mb-8 tracking-tight">Your Feed</h1>
      
      <div className="space-y-2">
        {posts.map((post) => (
          <FeedPost 
            key={post.id}
            post={post}
            currentUser={currentUser}
            onLike={handleLike}
            onComment={handleComment}
            navigate={navigate}
            saveScroll={saveScroll}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            registerVideoRef={(el) => {
              if (el) videoRefs.current.set(post.id, el);
              else videoRefs.current.delete(post.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}