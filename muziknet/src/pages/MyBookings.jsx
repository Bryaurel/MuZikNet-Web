// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { CalendarCheck, AlertCircle, Clock, CheckCircle2, XCircle, MapPin, DollarSign } from "lucide-react";

export default function MyBookings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  // Fetch Bookings
  useEffect(() => {
    if (!currentUser) return;

    const qSent = query(collection(db, "bookings"), where("requesterUserId", "==", currentUser.uid));
    const qReceived = query(collection(db, "bookings"), where("performerUserId", "==", currentUser.uid));

    const unsubSent = onSnapshot(qSent, snap => {
      setSent(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReceived = onSnapshot(qReceived, snap => {
      setReceived(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [currentUser]);

  // ==========================================
  // LAZY EVALUATOR: 14-Day & 10-Day Reminders (Runs for Host)
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    sent.forEach(async (b) => {
      if (b.status === "pre_booked" && b.start) {
        const eventDate = b.start.toDate();
        const daysUntil = differenceInDays(eventDate, new Date());

        // 14-Day Reminder (Sent exactly between 10 and 14 days if not sent yet)
        if (daysUntil <= 14 && daysUntil > 10 && !b.notified14) {
          await updateDoc(doc(db, "bookings", b.id), { notified14: true });
          await addDoc(collection(db, "notifications"), {
            userId: b.requesterUserId,
            type: "booking",
            message: `ACTION REQUIRED: You have ${daysUntil - 10} days left to confirm your pre-booking for '${b.title}'.`,
            link: "/my-bookings",
            isRead: false,
            createdAt: serverTimestamp()
          });
        } 
        // 10-Day URGENT Reminder
        else if (daysUntil <= 10 && !b.notified10) {
          await updateDoc(doc(db, "bookings", b.id), { notified10: true });
          await addDoc(collection(db, "notifications"), {
            userId: b.requesterUserId,
            type: "booking",
            message: `URGENT: Final confirmation required for '${b.title}'. The event is 10 days away!`,
            link: "/my-bookings",
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }
    });
  }, [sent, currentUser]);

  // ==========================================
  // ACTIONS
  // ==========================================

  // Talent Action: Accept
  const acceptBooking = async (b) => {
    try {
      const daysUntil = differenceInDays(b.start.toDate(), new Date());
      // If <= 10 days, lock it in. Otherwise, it's tentative.
      const newStatus = daysUntil <= 10 ? "confirmed" : "pre_booked";

      await updateDoc(doc(db, "bookings", b.id), { 
        status: newStatus, 
        updatedAt: serverTimestamp() 
      });

      await addDoc(collection(db, "notifications"), {
        userId: b.requesterUserId,
        type: "booking",
        message: `Talent accepted your gig request. Status: ${newStatus === 'confirmed' ? 'CONFIRMED' : 'PRE-BOOKED'}.`,
        link: "/my-bookings",
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  // Host Action: Final Confirm
  const confirmPreBooking = async (b) => {
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "confirmed", updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: b.performerUserId,
        type: "booking",
        message: `Your pre-booking for '${b.title}' has been officially CONFIRMED by the host!`,
        link: "/calendar",
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  // Shared Action: Decline/Cancel
  const declineOrCancelBooking = async (b, isHost) => {
    try {
      const newStatus = isHost ? "canceled" : "declined";
      await updateDoc(doc(db, "bookings", b.id), { status: newStatus, updatedAt: serverTimestamp() });
      
      // Notify the other party
      const targetUserId = isHost ? b.performerUserId : b.requesterUserId;
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "booking",
        message: `The booking for '${b.title}' was ${newStatus}.`,
        link: "/my-bookings",
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // UI RENDER HELPERS
  // ==========================================
  const renderBookingCard = (b, isSentByMe) => {
    const isPreBooked = b.status === "pre_booked";
    const isConfirmed = b.status === "confirmed";
    const isPending = b.status === "pending";
    const isDead = b.status === "declined" || b.status === "canceled";

    const eventDate = b.start?.toDate ? b.start.toDate() : new Date();
    const daysUntil = differenceInDays(eventDate, new Date());

    return (
      <div key={b.id} className={`glass-card p-5 border-l-4 transition-all ${
        isConfirmed ? "border-green-500 bg-white" : 
        isPreBooked ? "border-amber-400 bg-amber-50/20" : 
        isDead ? "border-gray-300 opacity-60 grayscale-[0.5]" : "border-brand-500 bg-white"
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
            isDead ? "bg-gray-200 text-gray-600" : "bg-brand-50 text-brand-600"
          }`}>
            {isPreBooked ? "Tentative" : b.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-500"/> {format(eventDate, "MMM d, yyyy")}</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-500"/> {b.location || "TBA"}</div>
          <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500"/> {b.pay || "TBD"}</div>
          {daysUntil > 0 && <div className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-3.5 h-3.5"/> In {daysUntil} Days</div>}
        </div>

        {/* HOST CONTROLS (Sent Bookings) */}
        {isSentByMe && !isDead && (
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

        {/* TALENT CONTROLS (Received Bookings) */}
        {!isSentByMe && isPending && (
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl shadow-sm">
          <CalendarCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Booking Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your pending offers, tentative pre-bookings, and confirmed contracts.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* LEFT: RECEIVED (Talent View) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Received (Talent)</h2>
          {received.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings received yet.</div>
          ) : (
            <div className="space-y-4">
              {received.map(b => renderBookingCard(b, false))}
            </div>
          )}
        </div>

        {/* RIGHT: SENT (Host View) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Requests Sent (Host)</h2>
          {sent.length === 0 ? (
            <div className="glass-card p-10 text-center text-gray-400 border-dashed border-2">No bookings sent yet.</div>
          ) : (
            <div className="space-y-4">
              {sent.map(b => renderBookingCard(b, true))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}