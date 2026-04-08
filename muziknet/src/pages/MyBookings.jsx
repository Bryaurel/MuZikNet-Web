// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MyBookingCard from "../components/MyBookingCard";
import ReviewModal from "../components/ReviewModal";

export default function MyBookings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  
  const [showAllSent, setShowAllSent] = useState(false);
  const [showAllReceived, setShowAllReceived] = useState(false);

  const [reviewModal, setReviewModal] = useState({ isOpen: false, booking: null, isHost: false });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u || null);
      if (u) {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        if (uSnap.exists()) setUserRoles(uSnap.data().roles || []);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const qSent = query(collection(db, "bookings"), where("requesterUserId", "==", currentUser.uid));
    const qReceived = query(collection(db, "bookings"), where("performerUserId", "==", currentUser.uid));

    const unsubSent = onSnapshot(qSent, snap => setSent(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt)));
    const unsubReceived = onSnapshot(qReceived, snap => setReceived(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt)));

    return () => { unsubSent(); unsubReceived(); };
  }, [currentUser]);

  const openReviewModal = (booking, isHost) => setReviewModal({ isOpen: true, booking, isHost });

  const isOnlyHost = userRoles.includes("Host") && !userRoles.includes("Talent");
  const displayedSent = showAllSent ? sent : sent.slice(0, 3);
  const displayedReceived = showAllReceived ? received : received.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl shadow-sm"><CalendarCheck className="w-8 h-8" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Booking Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your pending offers, tentative pre-bookings, and completed contracts.</p>
          </div>
        </div>
        <button onClick={() => navigate("/calendar")} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition shadow-lg whitespace-nowrap">
          <CalendarCheck className="w-5 h-5" /> Master Schedule
        </button>
      </div>

      <div className={`grid gap-8 ${isOnlyHost ? 'grid-cols-1 max-w-3xl mx-auto' : 'lg:grid-cols-2'}`}>
        {!isOnlyHost && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Received (Talent)</h2>
            {received.length === 0 ? <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings received yet.</div> : (
              <div className="space-y-4">
                {displayedReceived.map(b => <MyBookingCard key={b.id} booking={b} isSentByMe={false} onOpenReview={openReviewModal} />)}
                {received.length > 3 && (
                  <button onClick={() => setShowAllReceived(!showAllReceived)} className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition">
                    {showAllReceived ? "Show Less" : `View all ${received.length} received requests`} <ChevronDown className={`w-4 h-4 transition-transform ${showAllReceived ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Sent (Host)</h2>
          {sent.length === 0 ? <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings sent yet.</div> : (
            <div className="space-y-4">
              {displayedSent.map(b => <MyBookingCard key={b.id} booking={b} isSentByMe={true} onOpenReview={openReviewModal} />)}
              {sent.length > 3 && (
                <button onClick={() => setShowAllSent(!showAllSent)} className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition">
                  {showAllSent ? "Show Less" : `View all ${sent.length} sent requests`} <ChevronDown className={`w-4 h-4 transition-transform ${showAllSent ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ReviewModal 
        isOpen={reviewModal.isOpen} 
        booking={reviewModal.booking} 
        isHost={reviewModal.isHost} 
        currentUser={currentUser}
        onClose={() => setReviewModal({ isOpen: false, booking: null, isHost: false })} 
      />
    </div>
  );
}