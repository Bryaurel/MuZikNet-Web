// src/pages/MyApplications.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collectionGroup, query, where, getDocs, getDoc } from "firebase/firestore";
import { Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyApplications() {
  const [user, setUser] = useState(null);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchSent = async () => {
      setLoading(true);
      try {
        // OPTIMIZATION: Use collectionGroup to efficiently find all applications by this user
        const appsQuery = query(collectionGroup(db, "applications"), where("userId", "==", user.uid));
        const appsSnap = await getDocs(appsQuery);
        
        // Fetch the parent Opportunity title for each application
        const applications = await Promise.all(
          appsSnap.docs.map(async (appDoc) => {
            const appData = appDoc.data();
            const oppRef = appDoc.ref.parent.parent; // Navigates UP to the Opportunity doc
            let oppTitle = "Unknown Gig";
            
            if (oppRef) {
              const oppSnap = await getDoc(oppRef);
              if (oppSnap.exists()) {
                oppTitle = oppSnap.data().title;
              }
            }

            return {
              id: appDoc.id,
              oppId: oppRef ? oppRef.id : "",
              title: oppTitle,
              ...appData
            };
          })
        );
        
        // Sort by newest first
        applications.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setSent(applications);
      } catch (err) {
        console.error("Error fetching applications:", err);
        // NOTE: If this fails, check the browser console for the Firebase Index creation link!
      } finally {
        setLoading(false);
      }
    };
    
    fetchSent();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-2xl shadow-sm">
          <Briefcase className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Track the status of gigs and opportunities you've applied for.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center flex flex-col items-center text-gray-400">
           <Loader2 className="w-8 h-8 animate-spin mb-3 text-brand-500" />
           <p>Locating your applications...</p>
        </div>
      ) : sent.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed border-2 flex flex-col items-center">
           <div className="text-4xl mb-4">📝</div>
           <h3 className="text-xl font-bold text-gray-900">No applications sent yet</h3>
           <p className="text-gray-500 text-sm mt-2 max-w-sm mb-6">You haven't applied to any gigs on the talent board.</p>
           <button onClick={() => navigate("/opportunities")} className="text-brand-600 font-bold bg-brand-50 px-6 py-2 rounded-full hover:bg-brand-100 transition">
              Browse Opportunities
           </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sent.map(a => (
            <div 
              key={a.id} 
              className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer hover:border-brand-300 transition-all" 
              onClick={() => navigate(`/opportunities/${a.oppId}`)}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                     Application
                   </span>
                   <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border ${
                     a.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                     a.status === 'declined' ? 'bg-red-100 text-red-700 border-red-200' :
                     'bg-amber-100 text-amber-700 border-amber-200'
                   }`}>
                     {a.status || 'Pending'}
                   </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{a.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-1 mt-1 bg-gray-50 p-2 rounded-lg italic">"{a.message}"</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 text-brand-600 font-semibold text-sm">
                View Details
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}