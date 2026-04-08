// src/components/ReviewModal.jsx
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { X, Send } from "lucide-react";

export default function ReviewModal({ isOpen, booking, isHost, currentUser, onClose }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!isOpen || !booking) return null;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return alert("Please leave a brief comment.");
    
    setSubmittingReview(true);
    const targetUserId = isHost ? booking.performerUserId : booking.requesterUserId;

    try {
      await addDoc(collection(db, "reviews"), {
        bookingId: booking.id,
        reviewerId: currentUser.uid,
        targetUserId: targetUserId,
        rating: rating,
        comment: reviewText.trim(),
        createdAt: serverTimestamp()
      });

      const fieldToUpdate = isHost ? "hostReviewed" : "talentReviewed";
      await updateDoc(doc(db, "bookings", booking.id), {
        [fieldToUpdate]: true,
        status: "completed"
      });

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
      onClose();
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Something went wrong saving your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-extrabold text-gray-900">Rate the Experience</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={submitReview} className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 font-medium mb-3">
              How was working with {isHost ? "the talent" : "the organizer"} for <span className="font-bold text-gray-900">'{booking.title}'</span>?
            </p>
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
  );
}