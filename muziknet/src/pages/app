// src/pages/Apply.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * Apply.jsx
 * - Form to apply to an opportunity
 * - collects: message (cover letter optional), CV upload (optional), contact info auto from profile/email
 * - saves application to subcollection opportunities/{id}/applications
 */

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [cvURL, setCvURL] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  const handleFile = (e) => setCvFile(e.target.files[0] || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return navigate("/login");

    setSubmitting(true);

    try {
      let uploadedURL = null;
      if (cvFile) {
        setUploading(true);
        const path = `applications/${id}/${currentUser.uid}/${Date.now()}_${cvFile.name}`;
        const fileRef = ref(storage, path);
        const task = uploadBytesResumable(fileRef, cvFile);
        await new Promise((resolve, reject) => {
          task.on("state_changed", null, reject, async () => {
            uploadedURL = await getDownloadURL(task.snapshot.ref);
            resolve();
          });
        });
        setUploading(false);
        setCvURL(uploadedURL);
      }

      await addDoc(collection(db, "opportunities", id, "applications"), {
        applicantUid: currentUser.uid,
        applicantName: currentUser.displayName || null,
        message: message.trim() || "",
        cvURL: uploadedURL || null,
        status: "submitted",
        createdAt: serverTimestamp(),
      });

      alert("Application submitted!");
      navigate(`/opportunities/${id}`);
    } catch (err) {
      console.error("Apply error", err);
      alert("Failed to submit application. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Apply</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium">Cover message (optional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full border px-3 py-2 rounded"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium">Upload CV (optional)</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleFile} />
          {uploading && <div className="text-sm text-gray-500">Uploading CV...</div>}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="px-4 py-2 border rounded" onClick={() => navigate(-1)}>Back</button>
          <button disabled={submitting} type="submit" className="px-4 py-2 bg-purple-600 text-white rounded">
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
