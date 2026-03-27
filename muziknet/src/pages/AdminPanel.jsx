// src/pages/AdminPanel.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Check, X, ShieldAlert, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const [pendingOpps, setPendingOpps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "opportunities"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      setPendingOpps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleStatus = async (id, newStatus) => {
    await updateDoc(doc(db, "opportunities", id), { 
      status: newStatus,
      reviewedAt: serverTimestamp() 
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Approval Queue</h1>
          <p className="text-gray-500">Review and moderate submitted opportunities.</p>
        </div>
      </div>

      {pendingOpps.length === 0 ? (
        <div className="glass-card p-20 text-center text-gray-400 border-dashed border-2">
          All caught up! No pending opportunities.
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingOpps.map(op => (
            <div key={op.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-900">{op.title}</h3>
                <p className="text-sm text-brand-600 font-medium">{op.organizer} • {op.location}</p>
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">{op.description}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`/opportunities/${op.id}`)} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button onClick={() => handleStatus(op.id, "rejected")} className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition">
                  <X className="w-5 h-5" /> Reject
                </button>
                <button onClick={() => handleStatus(op.id, "approved")} className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md shadow-green-500/20">
                  <Check className="w-5 h-5" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}