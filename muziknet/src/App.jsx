import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Messages from "./pages/Messages.jsx";
import Opportunities from "./pages/Opportunities.jsx";
import Booking from "./pages/Booking.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Settings from "./pages/Settings.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import NewPostPage from "./pages/NewPostPage.jsx";
import PostViewer from "./pages/PostViewer.jsx";
import ChooseUsername from "./pages/ChooseUsername.jsx";
import UserProfile from "./pages/UserProfile.jsx";

import { auth, db } from "./firebase.js";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [user, loading] = useAuthState(auth);
  const [needsUsername, setNeedsUsername] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (!data.username) {
            setNeedsUsername(true); // show username popup first
          } else if (!data.fullName || !data.stageName) {
            navigate("/edit-profile");
          }
        }
      } catch (err) {
        console.error("Error checking profile:", err);
      }
    };

    checkProfile();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen space-x-2 text-gray-700">
        <span className="animate-spin text-3xl">🎵</span>
        <span>Loading...</span>
      </div>
    );
  }

  const isEmailVerified = user?.emailVerified ?? false;

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      {!user && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      )}

      {/* PROTECTED ROUTES */}
      {user && isEmailVerified && (
        <>
          {needsUsername ? (
            <Route path="*" element={<ChooseUsername />} />
          ) : (
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="messages" element={<Messages />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="booking" element={<Booking />} />
              <Route path="new-post" element={<NewPostPage />} />
              <Route path="post/:postId" element={<PostViewer />} />
              <Route path="/user/:uid" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          )}
        </>
      )}

      {/* EMAIL NOT VERIFIED */}
      {user && !isEmailVerified && (
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
              state={{ message: "Please verify your email before accessing the app." }}
            />
          }
        />
      )}
    </Routes>
  );
}

export default App;
