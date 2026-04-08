// src/components/MyBookingCard.jsx
import React from "react";
import { db } from "../firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { differenceInDays, format } from "date-fns";
import { Clock, MapPin, DollarSign, AlertCircle, CheckCircle2, Music } from "lucide-react";

export default function MyBookingCard({ booking, isSentByMe, onOpenReview }) {
  const eventDate = booking.start?.toDate ? booking.start.toDate() : new Date();
  const daysUntil = differenceInDays(eventDate, new Date());
  const isPast = eventDate < new Date();

  const isPreBooked = booking.status === "pre_booked";
  const isConfirmed = booking.status === "confirmed";
  const isPending = booking.status === "pending";
  const isCompleted = booking.status === "completed";
  const isDead = booking.status === "declined" || booking.status === "canceled";

  const canReview = (isConfirmed || isCompleted) && isPast && (isSentByMe ? !booking.hostReviewed : !booking.talentReviewed);

  // Actions
  const updateBookingStatus = async (newStatus, notificationMessage, targetUserId) => {
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: newStatus, updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId, 
        type: "booking", 
        message: notificationMessage, 
        link: "/my-bookings", 
        isRead: false, 
        createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  return (
    <div className={`glass-card p-5 border-l-4 transition-all ${
      isConfirmed ? "border-green-500 bg-white" : 
      isPreBooked ? "border-amber-400 bg-amber-50/20" : 
      isCompleted ? "border-brand-500 bg-brand-50/10" :
      isDead ? "border-gray-300 opacity-60 grayscale-[0.5]" : "border-blue-500 bg-white"
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{booking.title}</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {isSentByMe ? `To: Talent ID ${booking.performerUserId.substring(0,5)}` : `From: Host ID ${booking.requesterUserId.substring(0,5)}`}
          </p>
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md ${
          isConfirmed ? "bg-green-100 text-green-700" :
          isPreBooked ? "bg-amber-100 text-amber-700" :
          isCompleted ? "bg-brand-100 text-brand-700" :
          isDead ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"
        }`}>
          {isPreBooked ? "Tentative" : booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl text-xs font-semibold text-gray-700">
        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-brand-500"/> {format(eventDate, "MMM d, yyyy")}</div>
        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-500"/> {booking.location || "TBA"}</div>
        <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-green-500"/> {booking.pay || "TBD"}</div>
        {daysUntil > 0 && !isDead ? (
          <div className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-3.5 h-3.5"/> In {daysUntil} Days</div>
        ) : isPast && !isDead ? (
          <div className="flex items-center gap-1.5 text-brand-600"><CheckCircle2 className="w-3.5 h-3.5"/> Event Passed</div>
        ) : null}
      </div>

      {canReview && (
        <div className="border-t border-brand-100 pt-3 flex">
          <button onClick={() => onOpenReview(booking, isSentByMe)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition shadow-md shadow-brand-500/20">
            <Music className="w-4 h-4" /> Mark Complete & Rate
          </button>
        </div>
      )}

      {isSentByMe && !isDead && !isPast && (
        <div className="border-t border-gray-100 pt-3 flex gap-2">
          {isPreBooked && (
            <button onClick={() => updateBookingStatus("confirmed", `Your pre-booking for '${booking.title}' has been CONFIRMED!`, booking.performerUserId)} className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition shadow-sm">
              Lock & Confirm
            </button>
          )}
          <button onClick={() => updateBookingStatus("canceled", `The booking for '${booking.title}' was canceled.`, booking.performerUserId)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition">
            Cancel Gig
          </button>
        </div>
      )}

      {!isSentByMe && isPending && !isPast && (
        <div className="border-t border-gray-100 pt-3 flex gap-2">
          <button onClick={() => updateBookingStatus("declined", `The booking for '${booking.title}' was declined.`, booking.requesterUserId)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition">
            Decline
          </button>
          <button onClick={() => updateBookingStatus(daysUntil <= 10 ? "confirmed" : "pre_booked", `Talent accepted your gig.`, booking.requesterUserId)} className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition shadow-md">
            Accept {daysUntil > 10 ? "(Pre-Book)" : "(Confirm)"}
          </button>
        </div>
      )}
    </div>
  );
}