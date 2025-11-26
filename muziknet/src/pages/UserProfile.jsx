// src/pages/UserProfile.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import PostViewer from "./PostViewer";

export default function UserProfile() {
  const { uid } = useParams(); // UID of the user to view
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followed, setFollowed] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [loadingFollowAction, setLoadingFollowAction] = useState(false);

  // get current logged-in user
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) setCurrentUser(u);
      else setCurrentUser(null);
    });
    return () => unsub();
  }, []);

  // realtime userData listener
  useEffect(() => {
    if (!uid) return;
    const uRef = doc(db, "users", uid);
    const unsub = onSnapshot(uRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
      else setUserData(null);
    }, (err) => {
      console.error("User snapshot error:", err);
    });
    return () => unsub();
  }, [uid]);

  // realtime followers & following listeners
  useEffect(() => {
    if (!uid) return;

    const followersRef = collection(db, "users", uid, "followers");
    const followingRef = collection(db, "users", uid, "following");

    const unsubF = onSnapshot(followersRef, (snap) => {
      setFollowers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    }, (err) => console.error("Followers snapshot error:", err));

    const unsubG = onSnapshot(followingRef, (snap) => {
      setFollowing(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    }, (err) => console.error("Following snapshot error:", err));

    return () => {
      unsubF(); unsubG();
    };
  }, [uid]);

  // watch whether current user follows this profile
  useEffect(() => {
    if (!currentUser || !uid) {
      setFollowed(false);
      return;
    }
    // check existence in the user's followers subcollection
    const ref = doc(db, "users", uid, "followers", currentUser.uid);
    let unsub = () => {};
    // realtime check
    try {
      unsub = onSnapshot(ref, (snap) => {
        setFollowed(!!snap.exists());
      }, (err) => {
        // If doc path doesn't exist yet (or permission), fallback to false
        console.error("follow state snapshot error:", err);
        setFollowed(false);
      });
    } catch (err) {
      setFollowed(false);
    }
    return () => unsub();
  }, [currentUser, uid]);

  // realtime posts listener (3-per-row gallery)
  useEffect(() => {
    if (!uid) return;
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(postsQuery, (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(fetched);
    }, (err) => console.error("Posts snapshot error:", err));
    return () => unsub();
  }, [uid]);

  // Follow / Unfollow implementation that updates Firestore
  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!uid || uid === currentUser.uid) return; // can't follow yourself

    setLoadingFollowAction(true);
    try {
      const followerDocRef = doc(db, "users", uid, "followers", currentUser.uid);
      const followingDocRef = doc(db, "users", currentUser.uid, "following", uid);

      if (followed) {
        // unfollow: remove both docs
        await deleteDoc(followerDocRef);
        await deleteDoc(followingDocRef);
        setFollowed(false);
      } else {
        // follow: create both docs with a minimal payload
        const smallProfile = {
          fullName: currentUser.displayName || "",
          photoURL: currentUser.photoURL || "",
          username: currentUser.displayName ? "" : "",
          followedAt: serverTimestamp(),
        };
        await setDoc(followerDocRef, {
          ...smallProfile,
          uid: currentUser.uid,
        });
        await setDoc(followingDocRef, {
          uid,
          followedAt: serverTimestamp(),
        });
        setFollowed(true);
      }
    } catch (err) {
      console.error("Follow/unfollow error:", err);
      // no UI alert here to keep it minimal; you can add one if desired
    } finally {
      setLoadingFollowAction(false);
    }
  };

  // Start or open a conversation and navigate to Messages with convoId in state
  const handleMessage = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (uid === currentUser.uid) return;

    const uids = [currentUser.uid, uid].sort();
    const convoId = `${uids[0]}_${uids[1]}`;
    const convoRef = doc(db, "conversations", convoId);

    try {
      // create or merge conversation doc so it exists
      await setDoc(convoRef, {
        participants: uids,
        lastMessage: "",
        lastTimestamp: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // navigate to messages page and pass convoId in state so Messages.jsx can open it
      navigate("/messages", { state: { convoId } });
    } catch (err) {
      console.error("Error creating/opening conversation:", err);
    }
  };

  // helper to format joined date safely
  const joinedDate = () => {
    if (!userData?.createdAt) return null;
    try {
      // if Firestore timestamp object
      if (userData.createdAt.seconds) {
        return new Date(userData.createdAt.seconds * 1000).toLocaleDateString();
      }
      // if plain date string or number
      return new Date(userData.createdAt).toLocaleDateString();
    } catch {
      return null;
    }
  };

  if (!userData) return <div className="p-4 text-gray-500">Loading user...</div>;

  // instruments might be stored as string or array; normalize to array
  const instrumentsArray = Array.isArray(userData.instruments)
    ? userData.instruments
    : typeof userData.instruments === "string" && userData.instruments.trim().length > 0
      ? userData.instruments.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className="max-w-4xl mx-auto mt-6 p-6 bg-white rounded-lg shadow">
      {/* Top */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Card */}
        <div className="w-full md:w-1/3 bg-white rounded-lg">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full overflow-hidden border mb-4">
              <img
                src={userData.photoURL || "/default-avatar.png"}
                alt={userData.username || userData.fullName}
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-xl font-semibold">{userData.fullName || "Unnamed"}</h2>

            {/* stageName in purple */}
            {userData.stageName && (
              <p className="text-purple-600 font-medium mt-1">{userData.stageName}</p>
            )}

            {/* username with $ and less opacity */}
            {userData.username && (
              <p className="text-gray-500 mt-1">${userData.username}</p>
            )}

            {/* bio */}
            {userData.bio && <p className="text-gray-700 mt-3">{userData.bio}</p>}

            {/* small info */}
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {instrumentsArray.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {instrumentsArray.map((ins) => (
                    <span key={ins} className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {ins}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                {userData.city && <span>{userData.city}</span>}
                {userData.nationality && <span>• {userData.nationality}</span>}
              </div>
              {joinedDate() && <div>Joined {joinedDate()}</div>}
            </div>

            {/* Edit/Follow/Message Buttons */}
            <div className="mt-4 w-full flex gap-2">
              {currentUser && currentUser.uid === uid ? (
                <button
                  onClick={() => navigate("/edit-profile")}
                  className="flex-1 bg-gray-100 py-2 rounded hover:bg-gray-200"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={loadingFollowAction}
                    className={`flex-1 py-2 rounded ${
                      followed ? "bg-gray-300" : "bg-purple-600 text-white"
                    }`}
                  >
                    {followed ? "Unfollow" : "Follow"}
                  </button>

                  <button
                    onClick={handleMessage}
                    className="flex-1 py-2 rounded bg-white border hover:bg-gray-50"
                  >
                    Message
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="mt-4 w-full flex justify-between text-sm text-gray-700 font-medium px-4">
              <div className="text-center">
                <div className="text-lg">{followers.length}</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg">{following.length}</div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
              <div className="text-center">
                <div className="text-lg">{posts.length}</div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg">0</div>
                <div className="text-xs text-gray-500">Gigs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts area */}
        <div className="w-full md:w-2/3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Posts</h3>
            {currentUser && currentUser.uid === uid && (
              <button
                onClick={() => navigate("/new-post")}
                className="px-3 py-2 bg-purple-600 text-white rounded"
              >
                Create Post
              </button>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="w-full text-center text-5xl py-10 text-gray-400 text-lg">
              No posts 🎵
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPostIndex(index)}
                >
                  {post.mediaURLs?.[0] ? (
                    /\.(mp4|mov|webm)$/i.test(post.mediaURLs[0]) ? (
                      <video
                        src={post.mediaURLs[0]}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        loop
                      />
                    ) : (
                      <img
                        src={post.mediaURLs[0]}
                        alt={post.caption || "Post image"}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      🎵
                    </div>
                  )}

                  {post.mediaURLs?.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      +{post.mediaURLs.length - 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PostViewer modal (re-uses your existing PostViewer) */}
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
