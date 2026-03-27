// src/pages/MyApplications.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyApplications() {
  const [user, setUser] = useState(null);
  const [sent, setSent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    auth.onAuthStateChanged(u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSent = async () => {
      const allOpps = await getDocs(collection(db, "opportunities"));
      let applications = [];
      for (const opDoc of allOpps.docs) {
        const appsSnap = await getDocs(collection(db, "opportunities", opDoc.id, "applications"));
        appsSnap.forEach(s => {
          if (s.data().userId === user.uid) {
            applications.push({ id: s.id, oppId: opDoc.id, title: opDoc.data().title, ...s.data() });
          }
        });
      }
      setSent(applications);
    };
    fetchSent();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Applications</h1>
      {sent.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">No applications sent yet.</div>
      ) : (
        <div className="space-y-4">
          {sent.map(a => (
            <div key={a.id} className="glass-card p-6 flex items-center justify-between group cursor-pointer" onClick={() => navigate(`/opportunities/${a.oppId}`)}>
              <div>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">Sent</span>
                <h3 className="font-bold text-gray-900 text-lg mt-1">{a.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-1 mt-1">{a.message}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}