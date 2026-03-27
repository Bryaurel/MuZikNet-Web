// src/pages/Apply.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, // <--- IMPORTANT: Ensure this is imported
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Send, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Apply() {
  const { id } = useParams(); // Opportunity ID from URL
  const navigate = useNavigate();
  const [op, setOp] = useState(null);
  const [form, setForm] = useState({ message: "", cv: null });
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "opportunities", id)).then(snap => {
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!auth.currentUser) {
      setError("You must be logged in to apply.");
      return;
    }

    setUploading(true);

    try {
      let cvUrl = "";
      
      // 1. Handle File Upload if exists
      if (form.cv) {
        const fileRef = ref(storage, `applications/${id}/${auth.currentUser.uid}_${Date.now()}`);
        const uploadTask = await uploadBytesResumable(fileRef, form.cv);
        cvUrl = await getDownloadURL(uploadTask.ref);
      }

      // 2. Add to Sub-collection: opportunities/{id}/applications
      // Ensure 'collection' and 'db' are correctly used
      const applicationsRef = collection(db, "opportunities", id, "applications");
      
      await addDoc(applicationsRef, {
        userId: auth.currentUser.uid,
        applicantName: auth.currentUser.displayName || "Anonymous Artist",
        applicantEmail: auth.currentUser.email || "",
        message: form.message.trim(),
        cvURL: cvUrl,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      // Wait 2 seconds so the user sees the success message, then redirect
      setTimeout(() => navigate(`/opportunities/${id}`), 2000);

    } catch (err) {
      console.error("Application submission error:", err);
      setError("Failed to send application. Please check your connection or permissions.");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-card p-10 text-center flex flex-col items-center max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900">Application Sent!</h2>
          <p className="text-gray-500 mt-2">The host has been notified. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!op) return <div className="p-10 text-center text-brand-500 font-bold animate-pulse">🎵 Loading Gig Details...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-brand-600 mb-6 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" /> Cancel
      </button>

      <div className="glass-card p-8">
        <div className="mb-8 pb-6 border-b border-gray-100">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-3 py-1 rounded-full">Applying for</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3 leading-tight">{op.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{op.organizer}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Message / Pitch</label>
            <textarea 
              value={form.message} 
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} 
              rows={6} 
              placeholder="Tell the organizer why you're the best fit..."
              className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Portfolio / Resume (Optional)</label>
            <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-colors">
              <FileText className="w-8 h-8 text-gray-300 mb-2" />
              <span className="text-sm text-gray-500 font-medium text-center">
                {form.cv ? form.cv.name : "Click to upload your CV or Portfolio PDF"}
              </span>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setForm(p => ({ ...p, cv: e.target.files[0] }))} />
            </label>
          </div>

          <button 
            type="submit"
            disabled={uploading} 
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-bold py-4 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/30 disabled:opacity-50"
          >
            {uploading ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Application
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}