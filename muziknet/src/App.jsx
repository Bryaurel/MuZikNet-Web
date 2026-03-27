// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
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
import ChooseRole from "./pages/ChooseRole.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import NewOpportunity from "./pages/NewOpportunity.jsx";
import OpportunityDetails from "./pages/OpportunityDetails.jsx";
import Apply from "./pages/Apply.jsx";
import MyCalendar from "./pages/MyCalendar.jsx";
import EditCalendar from "./pages/EditCalendar.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

import { auth, db } from "./firebase.js";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

function App() {
  const [user, authLoading] = useAuthState(auth);
  const [onboardingState, setOnboardingState] = useState("loading"); // "loading", "needsUsername", "needsProfile", "complete"

  useEffect(() => {
    if (!user) {
      setOnboardingState("loading");
      return;
    }

    // Real-time listener: The app instantly reacts when the user updates their doc!
    const docRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (!data.username) {
          setOnboardingState("needsUsername");
        } else if (!data.roles || data.roles.length === 0) {
          setOnboardingState("needsRole");
        } else if (!data.stageName) {
          setOnboardingState("needsProfile");
        } else {
          setOnboardingState("complete");
        }
      } else {
        // If doc doesn't exist yet (very brief moment during registration)
        setOnboardingState("needsUsername");
      }
    });

    return () => unsub();
  }, [user]);

  if (authLoading || (user && onboardingState === "loading")) {
    return (
      <div className="flex items-center justify-center h-screen space-x-3 text-purple-600 bg-gray-50">
        <span className="animate-bounce text-4xl">🎵</span>
        <span className="text-xl font-semibold tracking-widest">MuZikNet</span>
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

      {/* EMAIL NOT VERIFIED */}
      {user && !isEmailVerified && (
        <Route path="*" element={
          <Navigate to="/login" replace state={{ message: "Please verify your email before accessing the app." }} />
        } />
      )}

      {/* ONBOARDING FUNNEL (Protected & Verified) */}
      {user && isEmailVerified && onboardingState === "needsUsername" && (
        <Route path="*" element={<ChooseUsername />} />
      )}

      {user && isEmailVerified && onboardingState === "needsRole" && (
        <Route path="*" element={<ChooseRole />} />
      )}

      {user && isEmailVerified && onboardingState === "needsProfile" && (
        <Route path="*" element={<EditProfile isOnboarding={true} />} />
      )}

      {/* FULLY ONBOARDED (Protected & Verified) */}
      {user && isEmailVerified && onboardingState === "complete" && (
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="edit-profile" element={<EditProfile isOnboarding={false} />} />
          <Route path="messages" element={<Messages />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="opportunities/new" element={<NewOpportunity />} />
          <Route path="opportunities/:id" element={<OpportunityDetails />} />
          <Route path="opportunities/:id/apply" element={<Apply />} />
          <Route path="booking" element={<Booking />} />
          <Route path="calendar" element={<MyCalendar />} />
          <Route path="calendar/edit" element={<EditCalendar />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="new-post" element={<NewPostPage />} />
          <Route path="post/:postId" element={<PostViewer />} />
          <Route path="user/:uid" element={<UserProfile />} />
          <Route path="*" element={<Navigate to="/" />} />

          <Route path="admin" element={<AdminPanel />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;