// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { CalendarCheck, AlertCircle, Clock, MapPin, DollarSign, ChevronDown, Music, X, Send, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyBookings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  
  // Expansion States
  const [showAllSent, setShowAllSent] = useState(false);
  const [showAllReceived, setShowAllReceived] = useState(false);

  // Review Modal States
  const [reviewModal, setReviewModal] = useState({ isOpen: false, booking: null, isHost: false });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u || null);
      if (u) {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        if (uSnap.exists()) {
          setUserRoles(uSnap.data().roles || []);
        }
      }
    });
    return () => unsub();
  }, []);

  // Fetch Bookings
  useEffect(() => {
    if (!currentUser) return;

    const qSent = query(collection(db, "bookings"), where("requesterUserId", "==", currentUser.uid));
    const qReceived = query(collection(db, "bookings"), where("performerUserId", "==", currentUser.uid));

    const unsubSent = onSnapshot(qSent, snap => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
      setSent(sorted);
    });

    const unsubReceived = onSnapshot(qReceived, snap => {
      const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt);
      setReceived(sorted);
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [currentUser]);

  // LAZY EVALUATOR: Reminders
  useEffect(() => {
    if (!currentUser) return;

    sent.forEach(async (b) => {
      if (b.status === "pre_booked" && b.start) {
        const eventDate = b.start.toDate();
        const daysUntil = differenceInDays(eventDate, new Date());

        if (daysUntil <= 14 && daysUntil > 10 && !b.notified14) {
          await updateDoc(doc(db, "bookings", b.id), { notified14: true });
          await addDoc(collection(db, "notifications"), {
            userId: b.requesterUserId, type: "booking", message: `ACTION REQUIRED: You have ${daysUntil - 10} days left to confirm your pre-booking for '${b.title}'.`, link: "/my-bookings", isRead: false, createdAt: serverTimestamp()
          });
        } 
        else if (daysUntil <= 10 && !b.notified10) {
          await updateDoc(doc(db, "bookings", b.id), { notified10: true });
          await addDoc(collection(db, "notifications"), {
            userId: b.requesterUserId, type: "booking", message: `URGENT: Final confirmation required for '${b.title}'. The event is 10 days away!`, link: "/my-bookings", isRead: false, createdAt: serverTimestamp()
          });
        }
      }
    });
  }, [sent, currentUser]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const acceptBooking = async (b) => {
    try {
      const daysUntil = differenceInDays(b.start.toDate(), new Date());
      const newStatus = daysUntil <= 10 ? "confirmed" : "pre_booked";

      await updateDoc(doc(db, "bookings", b.id), { status: newStatus, updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: b.requesterUserId, type: "booking", message: `Talent accepted your gig request. Status: ${newStatus === 'confirmed' ? 'CONFIRMED' : 'PRE-BOOKED'}.`, link: "/my-bookings", isRead: false, createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  const confirmPreBooking = async (b) => {
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "confirmed", updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: b.performerUserId, type: "booking", message: `Your pre-booking for '${b.title}' has been officially CONFIRMED by the host!`, link: "/calendar", isRead: false, createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  const declineOrCancelBooking = async (b, isHost) => {
    try {
      const newStatus = isHost ? "canceled" : "declined";
      await updateDoc(doc(db, "bookings", b.id), { status: newStatus, updatedAt: serverTimestamp() });
      const targetUserId = isHost ? b.performerUserId : b.requesterUserId;
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId, type: "booking", message: `The booking for '${b.title}' was ${newStatus}.`, link: "/my-bookings", isRead: false, createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // THE 8TH-NOTE REVIEW SYSTEM
  // ==========================================
  const openReviewModal = (b, isHost) => {
    setReviewModal({ isOpen: true, booking: b, isHost });
    setRating(5); // Default 5 notes
    setReviewText("");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return alert("Please leave a brief comment.");
    
    setSubmittingReview(true);
    const { booking, isHost } = reviewModal;
    const targetUserId = isHost ? booking.performerUserId : booking.requesterUserId;

    try {
      // 1. Save the review to the database
      await addDoc(collection(db, "reviews"), {
        bookingId: booking.id,
        reviewerId: currentUser.uid,
        targetUserId: targetUserId,
        rating: rating,
        comment: reviewText.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Mark the booking so they can't review twice
      const fieldToUpdate = isHost ? "hostReviewed" : "talentReviewed";
      await updateDoc(doc(db, "bookings", booking.id), {
        [fieldToUpdate]: true,
        status: "completed" // Moves gig to final completed state
      });

      // 3. Client-side math to update the user's average rating on their profile
      const userRef = doc(db, "users", targetUserId);
      const uSnap = await getDoc(userRef);
      if(uSnap.exists()) {
         const data = uSnap.data();
         const currentAvg = data.avgRating || 0;
         const reviewCount = data.reviewCount || 0;
         
         const newCount = reviewCount + 1;
         const newAvg = ((currentAvg * reviewCount) + rating) / newCount;
         
         await updateDoc(userRef, {
           avgRating: newAvg,
           reviewCount: newCount
         });
      }

      setReviewModal({ isOpen: false, booking: null, isHost: false });
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Something went wrong saving your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ==========================================
  // UI RENDER HELPERS
  // ==========================================
  const renderBookingCard = (b, isSentByMe) => {
    const eventDate = b.start?.toDate ? b.start.toDate() : new Date();
    const daysUntil = differenceInDays(eventDate, new Date());
    const isPast = eventDate < new Date();

    const isPreBooked = b.status === "pre_booked";
    const isConfirmed = b.status === "confirmed";
    const isPending = b.status === "pending";
    const isCompleted = b.status === "completed";
    const isDead = b.status === "declined" || b.status === "canceled";

    // Can they leave a review? (Event is in the past, and they haven't reviewed yet)
    const canReview = (isConfirmed || isCompleted) && isPast && (isSentByMe ? !b.hostReviewed : !b.talentReviewed);

    return (
      <div key={b.id} className={`glass-card p-5 border-l-4 transition-all ${
        isConfirmed ? "border-green-500 bg-white" : 
        isPreBooked ? "border-amber-400 bg-amber-50/20" : 
        isCompleted ? "border-brand-500 bg-brand-50/10" :
        isDead ? "border-gray-300 opacity-60 grayscale-[0.5]" : "border-blue-500 bg-white"
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{b.title}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {isSentByMe ? `To: Talent ID ${b.performerUserId.substring(0,5)}` : `From: Host ID ${b.requesterUserId.substring(0,5)}`}
            </p>
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md ${
            isConfirmed ? "bg-green-100 text-green-700" :
            isPreBooked ? "bg-amber-100 text-amber-700" :
            isCompleted ? "bg-brand-100 text-brand-700" :
            isDead ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"
          }`}>
            {isPreBooked ? "Tentative" : b.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-500"/> {format(eventDate, "MMM d, yyyy")}</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-500"/> {b.location || "TBA"}</div>
          <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500"/> {b.pay || "TBD"}</div>
          {daysUntil > 0 && !isDead ? (
            <div className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-3.5 h-3.5"/> In {daysUntil} Days</div>
          ) : isPast && !isDead ? (
            <div className="flex items-center gap-1.5 text-brand-600"><CheckCircle2 className="w-3.5 h-3.5"/> Event Passed</div>
          ) : null}
        </div>

        {/* REVIEW BUTTON (Shows after event passes) */}
        {canReview && (
          <div className="border-t border-brand-100 pt-3 flex">
            <button 
              onClick={() => openReviewModal(b, isSentByMe)} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition shadow-md shadow-brand-500/20"
            >
              <Music className="w-4 h-4" /> Mark Complete & Rate
            </button>
          </div>
        )}

        {/* HOST CONTROLS (Before Event) */}
        {isSentByMe && !isDead && !isPast && (
          <div className="border-t border-gray-100 pt-3 flex gap-2">
            {isPreBooked && (
              <button onClick={() => confirmPreBooking(b)} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition shadow-md">
                Lock & Confirm
              </button>
            )}
            <button onClick={() => declineOrCancelBooking(b, true)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition">
              Cancel Gig
            </button>
          </div>
        )}

        {/* TALENT CONTROLS (Before Event) */}
        {!isSentByMe && isPending && !isPast && (
          <div className="border-t border-gray-100 pt-3 flex gap-2">
            <button onClick={() => declineOrCancelBooking(b, false)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition">
              Decline
            </button>
            <button onClick={() => acceptBooking(b)} className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition shadow-md">
              Accept {daysUntil > 10 ? "(Pre-Book)" : "(Confirm)"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const isOnlyHost = userRoles.includes("Host") && !userRoles.includes("Talent");
  const displayedSent = showAllSent ? sent : sent.slice(0, 3);
  const displayedReceived = showAllReceived ? received : received.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* HEADER WITH MASTER SCHEDULE BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl shadow-sm">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Booking Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your pending offers, tentative pre-bookings, and completed contracts.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate("/calendar")} 
          className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-gray-900/20 whitespace-nowrap"
        >
          <CalendarCheck className="w-5 h-5" /> Master Schedule
        </button>
      </div>

      {/* DYNAMIC GRID based on Role */}
      <div className={`grid gap-8 ${isOnlyHost ? 'grid-cols-1 max-w-3xl mx-auto' : 'lg:grid-cols-2'}`}>
        
        {/* LEFT: RECEIVED (Hidden if user is ONLY a Host) */}
        {!isOnlyHost && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Received (Talent)</h2>
            {received.length === 0 ? (
              <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings received yet.</div>
            ) : (
              <div className="space-y-4">
                {displayedReceived.map(b => renderBookingCard(b, false))}
                
                {received.length > 3 && (
                  <button 
                    onClick={() => setShowAllReceived(!showAllReceived)} 
                    className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition"
                  >
                    {showAllReceived ? "Show Less" : `View all ${received.length} received requests`} 
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllReceived ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* RIGHT: SENT (Host View) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Sent (Host)</h2>
          {sent.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings sent yet.</div>
          ) : (
            <div className="space-y-4">
              {displayedSent.map(b => renderBookingCard(b, true))}

              {sent.length > 3 && (
                  <button 
                    onClick={() => setShowAllSent(!showAllSent)} 
                    className="w-full flex items-center justify-center gap-1 py-3 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition"
                  >
                    {showAllSent ? "Show Less" : `View all ${sent.length} sent requests`} 
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllSent ? 'rotate-180' : ''}`} />
                  </button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* THE 8TH-NOTE REVIEW MODAL */}
      {/* ========================================================= */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-extrabold text-gray-900">Rate the Experience</h2>
              <button onClick={() => setReviewModal({ isOpen: false, booking: null, isHost: false })} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={submitReview} className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 font-medium mb-3">
                  How was working with {reviewModal.isHost ? "the talent" : "the organizer"} for <span className="font-bold text-gray-900">'{reviewModal.booking?.title}'</span>?
                </p>
                
                {/* THE MUSICAL NOTE RATING SYSTEM */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setRating(note)}
                      className={`text-4xl transition-all duration-200 ${note <= rating ? 'opacity-100 scale-110 drop-shadow-md' : 'opacity-30 grayscale hover:opacity-70'}`}
                    >
                      🎵
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-600 font-extrabold uppercase tracking-widest mt-4">
                  {rating} out of 5 Notes
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Leave a Comment</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="They were amazing to work with! The crowd loved them..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingReview}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-bold py-4 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/30 disabled:opacity-50"
              >
                {submittingReview ? "Saving Review..." : <><Send className="w-4 h-4" /> Submit Feedback</>}
              </button>
            </form>
            
          </div>
        </div>
      )}

    </div>
  );
}