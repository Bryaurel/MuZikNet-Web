// src/pages/Apply.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function Apply() {
  const { id } = useParams(); // opportunity id
  const navigate = useNavigate();
  const [op, setOp] = useState(null);
  const [form, setForm] = useState({ message: "", cv: null, name: "", email: "" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "opportunities", id)).then(snap => {
      if (snap.exists()) setOp({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  const handleFileChange = (e) => {
    setForm((p) => ({ ...p, cv: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("Please sign in to apply.");
      return;
    }
    setError("");
    setUploading(true);

    try {
      let cvUrl = "";
      if (form.cv) {
        const path = `applications/${id}/${auth.currentUser.uid}-${Date.now()}-${form.cv.name}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, form.cv);
        await new Promise((res, rej) => {
          uploadTask.on("state_changed", null, rej, async () => {
            cvUrl = await getDownloadURL(uploadTask.snapshot.ref);
            res();
          });
        });
      }

      // Save application under subcollection applications
      await addDoc(collection(db, "opportunities", id, "applications"), {
        userId: auth.currentUser.uid,
        name: form.name || auth.currentUser.displayName || "",
        email: form.email || auth.currentUser.email || "",
        message: form.message,
        cvUrl: cvUrl || "",
        createdAt: serverTimestamp(),
      });

      // optional: notify owner (out of scope) or redirect
      navigate(`/opportunities/${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to submit application.");
    } finally {
      setUploading(false);
    }
  };

  if (!op) return <div className="text-center p-6">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Apply to: {op.title}</h2>
      <p className="text-sm text-gray-600 mb-4">{op.organizer}</p>

      {error && <div className="p-2 bg-red-100 text-red-700 rounded mb-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600">Message (optional)</label>
          <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={5} className="w-full border rounded p-2" />
        </div>

        <div>
          <label className="block text-sm text-gray-600">CV (optional)</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 text-white rounded" disabled={uploading}>{uploading ? "Sending..." : "Send application"}</button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}
