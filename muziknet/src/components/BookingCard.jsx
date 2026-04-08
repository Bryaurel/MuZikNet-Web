// src/components/BookingCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { MapPin, Zap, User, Send, X, Clock } from "lucide-react";
import DefaultAvatar from "./DefaultAvatar";

export default function BookingCard({ user, currentUser }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [bookForm, setBookForm] = useState({
    eventType: "",
    date: "",
    timeFrom: "",
    timeTo: "",
    location: "",
    skills: "",
    pay: "",
    details: ""
  });

  const instrumentsArray = Array.isArray(user.instruments)
    ? user.instruments
    : typeof user.instruments === "string" && user.instruments.trim().length > 0
      ? user.instruments.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return navigate("/login");
    setSending(true);

    try {
      // 1. Create a formal Booking Document
      let startDate = new Date(bookForm.date);
      let endDate = new Date(bookForm.date);
      
      if (bookForm.timeFrom) {
        const [h, m] = bookForm.timeFrom.split(":");
        startDate.setHours(parseInt(h, 10), parseInt(m, 10));
      } else {
        startDate.setHours(12, 0);
      }

      if (bookForm.timeTo) {
        const [h, m] = bookForm.timeTo.split(":");
        endDate.setHours(parseInt(h, 10), parseInt(m, 10));
      } else {
        endDate.setHours(14, 0); 
      }

      const bookingRef = await addDoc(collection(db, "bookings"), {
        requesterUserId: currentUser.uid,
        performerUserId: user.uid,
        title: bookForm.eventType,
        location: bookForm.location,
        skills: bookForm.skills,
        start: startDate,
        end: endDate,
        pay: bookForm.pay,
        message: bookForm.details,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      const uids = [currentUser.uid, user.uid].sort();
      const convoId = `${uids[0]}_${uids[1]}`;

      // 2. Ensure conversation exists and FLAG AS UNREAD for the Talent!
      await setDoc(doc(db, "conversations", convoId), {
        participants: uids,
        updatedAt: serverTimestamp(),
        lastMessage: `Sent a booking request for: ${bookForm.eventType}`,
        lastTimestamp: serverTimestamp(),
        [`unread_${user.uid}`]: true,       // Highlights the chat in purple
        [`hasBooking_${user.uid}`]: true    // Triggers the green dot
      }, { merge: true });

      // 3. Send the structured message data
      await addDoc(collection(db, "conversations", convoId, "messages"), {
        text: "Sent a booking request.",
        sender: currentUser.uid,
        timestamp: serverTimestamp(),
        seenBy: [currentUser.uid],
        isBookingRequest: true,
        bookingId: bookingRef.id,
        bookingStatus: "pending",
        bookingData: {
          eventType: bookForm.eventType,
          date: bookForm.date,
          timeFrom: bookForm.timeFrom,
          timeTo: bookForm.timeTo,
          location: bookForm.location,
          skills: bookForm.skills,
          pay: bookForm.pay,
          details: bookForm.details
        }
      });

      setIsModalOpen(false);
      navigate("/messages", { state: { convoId } });

    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to send booking request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="glass-card p-5 flex flex-col justify-between border border-gray-100 hover:border-brand-300 transition-colors shadow-sm h-full">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex-shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.stageName} className="w-full h-full object-cover" />
              ) : (
                <DefaultAvatar className="w-full h-full text-2xl" />
              )}
            </div>
            {user.availableNow && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                <Zap className="w-3 h-3 fill-amber-500" /> Live
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-gray-900 text-lg leading-tight truncate">
            {user.stageName || user.fullName}
          </h3>

          {/* RATING DISPLAY */}
          <div className="flex items-center gap-1 mt-1 mb-2">
            <span className="text-amber-500 text-sm">🎵</span>
            {user.avgRating ? (
              <span className="text-sm font-bold text-gray-900">
                {Number(user.avgRating).toFixed(1)} <span className="text-xs text-gray-500 font-medium">({user.reviewCount} reviews)</span>
              </span>
            ) : (
              <span className="text-xs text-gray-500 font-medium italic">No Reviews</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 mb-3 font-medium">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">{user.city || "Location not set"}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {instrumentsArray.slice(0, 3).map((inst, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-md">
                {inst}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2 w-full">
          <button 
            onClick={() => navigate(`/user/${user.uid}`)} 
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 shadow-md shadow-brand-500/20 transition"
          >
            <Zap className="w-4 h-4" /> Book
          </button>
        </div>
      </div>

      {/* BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
              <h2 className="text-xl font-extrabold text-gray-900">Book {user.stageName || user.fullName}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Event Type</label>
                <input required placeholder="e.g. Wedding, Club Gig, Studio Session" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.eventType} onChange={e => setBookForm({...bookForm, eventType: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Location</label>
                  <input required placeholder="e.g. Kigali Arena" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.location} onChange={e => setBookForm({...bookForm, location: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Proposed Pay</label>
                  <input required placeholder="e.g. $500, TBD" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.pay} onChange={e => setBookForm({...bookForm, pay: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date</label>
                  <input type="date" required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.date} onChange={e => setBookForm({...bookForm, date: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> From (Opt)</label>
                  <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.timeFrom} onChange={e => setBookForm({...bookForm, timeFrom: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">To (Opt)</label>
                  <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.timeTo} onChange={e => setBookForm({...bookForm, timeTo: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Skills Required</label>
                <input required placeholder="e.g. Lead Guitar, Backing Vocals" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" value={bookForm.skills} onChange={e => setBookForm({...bookForm, skills: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Quick Details</label>
                <textarea required rows={3} placeholder="Provide a short description of the gig..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition resize-none" value={bookForm.details} onChange={e => setBookForm({...bookForm, details: e.target.value})} />
              </div>

              <button type="submit" disabled={sending} className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/30 disabled:opacity-50">
                {sending ? "Sending Request..." : <><Send className="w-4 h-4" /> Send Booking Offer</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}