// src/pages/NewOpportunity.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/**
 * NewOpportunity page - creates an opportunity doc with status "pending"
 * Fields: title, category, type, description, requirements, location, deadline, fees, link, lookingFor (comma-separated), genres (comma-separated)
 */

export default function NewOpportunity() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "others",
    type: "unpaid", // unpaid or paid
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

    if (!form.title.trim() || !form.description.trim()) {
      alert("Please provide title and description.");
      return;
    }

    setSaving(true);
    try {
      const doc = await addDoc(collection(db, "opportunities"), {
        title: form.title.trim(),
        category: form.category,
        type: form.type === "paid" ? "paid" : "unpaid",
        description: form.description.trim(),
        requirements: form.requirements.trim(),
        location: form.location.trim(),
        deadline: form.deadline ? new Date(form.deadline) : null,
        fees: form.fees ? form.fees.trim() : null,
        link: form.link ? form.link.trim() : null,
        lookingFor: form.lookingFor ? form.lookingFor.split(",").map((s) => s.trim()).filter(Boolean) : [],
        genres: form.genres ? form.genres.split(",").map((s) => s.trim()).filter(Boolean) : [],
        status: "pending",
        createdBy: currentUser.uid,
        organizer: currentUser.displayName || currentUser.email || "",
        createdAt: serverTimestamp(),
      });

      alert("Opportunity submitted and awaiting admin approval.");
      navigate("/opportunities");
    } catch (err) {
      console.error("Error creating opportunity", err);
      alert("Failed to submit opportunity. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Add Opportunity</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input name="title" value={form.title} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full border px-2 py-2 rounded">
              <option value="scholarship">Scholarship</option>
              <option value="gig">Gig</option>
              <option value="festival">Festival</option>
              <option value="job">Job</option>
              <option value="others">Others</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border px-2 py-2 rounded">
              <option value="unpaid">Unpaid / Volunteer</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={5} className="w-full border px-3 py-2 rounded"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium">Requirements</label>
          <textarea name="requirements" value={form.requirements} onChange={handleChange} rows={3} className="w-full border px-3 py-2 rounded" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Location</label>
            <input name="location" value={form.location} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Deadline</label>
            <input name="deadline" value={form.deadline} onChange={handleChange} type="date" className="w-full border px-3 py-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Fees (optional)</label>
            <input name="fees" value={form.fees} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">Application Link (optional)</label>
            <input name="link" value={form.link} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Looking for (comma separated)</label>
            <input name="lookingFor" value={form.lookingFor} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium">Genres (comma separated)</label>
            <input name="genres" value={form.genres} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/opportunities")} className="px-4 py-2 border rounded">Cancel</button>
          <button disabled={saving} type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            {saving ? "Submitting..." : "Submit for approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
