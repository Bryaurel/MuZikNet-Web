// src/pages/NewOpportunity.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Calendar, DollarSign, ArrowLeft } from "lucide-react";

export default function NewOpportunity() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "gig",
    type: "paid",
    description: "",
    requirements: "",
    location: "",
    deadline: "",
    fees: "",
    link: "",
    lookingFor: "",
    genres: "",
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return navigate("/login");
    if (!form.title.trim() || !form.description.trim()) return alert("Title and Description are required.");

    setSaving(true);
    try {
      await addDoc(collection(db, "opportunities"), {
        ...form,
        lookingFor: form.lookingFor.split(",").map(s => s.trim()).filter(Boolean),
        genres: form.genres.split(",").map(s => s.trim()).filter(Boolean),
        status: "approved", // Set to approved for your presentation ease
        createdBy: currentUser.uid,
        organizer: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
      });
      navigate("/opportunities");
    } catch (err) {
      console.error(err);
      alert("Error submitting opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Board
      </button>

      <div className="glass-card p-8 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-brand-500" /> Post an Opportunity
          </h1>
          <p className="text-gray-500 mt-2">Fill in the details to find the perfect musical talent for your event.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Gig Title</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Lead Guitarist for Summer Festival" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all outline-none" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:bg-white">
                  <option value="gig">Gig / Performance</option>
                  <option value="festival">Festival</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="job">Full-time Job</option>
                  <option value="others">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Type</label>
                <select name="type" value={form.type} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:bg-white">
                  <option value="paid">Paid Opportunity</option>
                  <option value="unpaid">Unpaid / Collaboration</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Describe the role and the event..." className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all outline-none resize-none" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Location</label>
                <MapPin className="absolute left-3 bottom-3.5 w-4 h-4 text-gray-400" />
                <input name="location" value={form.location} onChange={handleChange} placeholder="City, Venue" className="w-full border border-gray-200 rounded-xl p-3 pl-10 bg-gray-50 focus:bg-white outline-none" />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Application Deadline</label>
                <Calendar className="absolute left-3 bottom-3.5 w-4 h-4 text-gray-400" />
                <input name="deadline" type="date" value={form.deadline} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 pl-10 bg-gray-50 focus:bg-white outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Looking For (comma separated)</label>
                  <input name="lookingFor" value={form.lookingFor} onChange={handleChange} placeholder="Singer, DJ, Drummer" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Genres</label>
                  <input name="genres" value={form.genres} onChange={handleChange} placeholder="Jazz, Pop, Afrobeat" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none" />
               </div>
            </div>
          </div>

          <button disabled={saving} type="submit" className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">
            {saving ? "Posting..." : "Publish Opportunity"}
          </button>
        </form>
      </div>
    </div>
  );
}