import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import PostViewer from "./PostViewer";

export default function UserProfile() {
  const { uid } = useParams(); // UID of the other user
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followed, setFollowed] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);

  // Load current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load user data
  useEffect(() => {
    async function fetchUser() {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    }
    fetchUser();
  }, [uid]);

  // Load followers/following
  useEffect(() => {
    async function fetchFollowersFollowing() {
      const followersSnap = await getDocs(collection(db, "users", uid, "followers"));
      const followingSnap = await getDocs(collection(db, "users", uid, "following"));
      setFollowers(followersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setFollowing(followingSnap.docs.map(d => ({ uid: d.id, ...d.data() })));

      if (currentUser) {
        setFollowed(followersSnap.docs.some(d => d.id === currentUser.uid));
      }
    }
    fetchFollowersFollowing();
  }, [uid, currentUser]);

  // Load posts
  useEffect(() => {
    async function fetchPosts() {
      const postsSnap = await getDocs(query(collection(db, "posts"), where("uid", "==", uid)));
      setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    fetchPosts();
  }, [uid]);

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    // For now we only toggle local state; later we will update Firestore
    setFollowed(!followed);
  };

  const handleMessage = () => {
    if (!currentUser) return;
    navigate(`/messages/${uid}`);
  };

  if (!userData) return <div className="p-4 text-gray-500">Loading user...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-6 p-4 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            src={userData.avatar || "/default-avatar.png"}
            alt={userData.username}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-semibold">{userData.fullName}</h1>
            <p className="text-gray-500">@{userData.username}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFollowToggle}
            className={`px-4 py-2 rounded ${followed ? "bg-gray-300" : "bg-purple-600 text-white"}`}
          >
            {followed ? "Unfollow" : "Follow"}
          </button>
          <button
            onClick={handleMessage}
            className="px-4 py-2 rounded bg-blue-500 text-white"
          >
            Message
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-6 text-gray-700">
        <div><span className="font-semibold">{followers.length}</span> Followers</div>
        <div><span className="font-semibold">{following.length}</span> Following</div>
        <div><span className="font-semibold">{posts.length}</span> Posts</div>
      </div>

      {/* Post Gallery */}
      <div className="grid grid-cols-3 gap-2">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="aspect-square bg-gray-200 rounded cursor-pointer"
            style={{ backgroundImage: `url(${post.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            onClick={() => setSelectedPostIndex(index)}
          />
        ))}
      </div>

      {/* Post Viewer Modal */}
      {selectedPostIndex !== null && (
        <PostViewer
          posts={posts}
          initialIndex={selectedPostIndex}
          onClose={() => setSelectedPostIndex(null)}
        />
      )}
    </div>
  );
}