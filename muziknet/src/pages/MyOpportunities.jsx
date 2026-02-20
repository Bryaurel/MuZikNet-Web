// src/pages/MyOpportunities.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function MyOpportunities() {
  const [user, setUser] = useState(null);
  const [myOpportunities, setMyOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(u => setUser(u || null));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "opportunities"), where("createdBy", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMyOpportunities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("MyOpps snapshot error", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this opportunity?")) return;
    try {
      await deleteDoc(doc(db, "opportunities", id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (id) => {
    window.location.href = `/opportunities/${id}/edit`;
  };

  const handleApproveToggle = async (id, status) => {
    // only admins should see this button (we'll rely on security rules in production)
    try {
      await updateDoc(doc(db, "opportunities", id), { status });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">My opportunities</h2>

      {myOpportunities.length === 0 ? (
        <div className="text-gray-500">You haven't posted any opportunities yet.</div>
      ) : (
        <div className="space-y-4">
          {myOpportunities.map(op => (
            <div key={op.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{op.title}</div>
                <div className="text-sm text-gray-600">{op.status} • {op.location}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(op.id)} className="px-3 py-1 border rounded">Edit</button>
                <button onClick={() => handleDelete(op.id)} className="px-3 py-1 border rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
