// src/pages/OpportunityDetails.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  doc, 
  onSnapshot, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { MapPin, Calendar, Users, ArrowLeft, Download, UserCheck, Trash2, Check, X, MessageSquareText } from "lucide-react";
import DefaultAvatar from "../components/DefaultAvatar";

export default function OpportunityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [opp, setOpp] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Host States
  const [applicants, setApplicants] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [hostComments, setHostComments] = useState({}); // Stores typed feedback before sending

  // Talent State
  const [myApplication, setMyApplication] = useState(null);

  // 1. Auth & Admin Check
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        const uRef = doc(db, "users", u.uid);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          setIsAdmin(!!uSnap.data()?.isAdmin);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Real-time Opportunity Listener
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "opportunities", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setOpp({ id: snap.id, ...snap.data() });
      else setOpp(null);
    });
    return () => unsub();
  }, [id]);

  // 3. Real-time Applicants Listener (Owner Only)
  useEffect(() => {
    if (!id || !opp || !currentUser) return;
    if (currentUser.uid !== opp.createdBy) return;

    setLoadingApps(true);
    const unsub = onSnapshot(collection(db, "opportunities", id, "applications"), (snap) => {
      setApplicants(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingApps(false);
    });
    return () => unsub();
  }, [id, opp, currentUser]);

  // 4. Real-time My Application Listener (Talent Only)
  useEffect(() => {
    if (!id || !opp || !currentUser) return;
    if (currentUser.uid === opp.createdBy) return; // Host doesn't need this

    const q = query(
      collection(db, "opportunities", id, "applications"), 
      where("userId", "==", currentUser.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setMyApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setMyApplication(null);
      }
    });
    return () => unsub();
  }, [id, opp, currentUser]);

  const handleDelete = async () => {
    if (!confirm("Delete this opportunity? This cannot be undone.")) return;
    await deleteDoc(doc(db, "opportunities", id));
    navigate("/opportunities");
  };

  const handleApproveStatus = async (status) => {
    await updateDoc(doc(db, "opportunities", id), { 
      status, 
      reviewedAt: serverTimestamp() 
    });
    alert(`Opportunity ${status}`);
  };

  // Host Function: Accept or Decline an applicant
  const handleApplicantDecision = async (appId, newStatus) => {
    try {
      const comment = hostComments[appId] || "";
      await updateDoc(doc(db, "opportunities", id, "applications", appId), {
        status: newStatus,
        hostComment: comment.trim(),
        reviewedAt: serverTimestamp()
      });
      // Clear comment box after sending
      setHostComments(prev => ({ ...prev, [appId]: "" }));
    } catch (err) {
      console.error("Failed to update applicant:", err);
      alert("Error updating application status.");
    }
  };

  if (!opp) return <div className="p-10 text-center animate-pulse text-brand-600">🎵 Loading details...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-brand-600 mb-6 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Board
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: GIG INFO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <span className="bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">{opp.category}</span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 leading-tight">{opp.title}</h1>
                <p className="text-gray-500 font-medium text-lg">{opp.organizer}</p>
              </div>

              {/* ACTION BUTTONS (Admin & Owner) */}
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <button onClick={() => handleApproveStatus("approved")} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md shadow-green-500/20 hover:bg-green-700 transition">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleApproveStatus("rejected")} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {currentUser?.uid === opp.createdBy && (
                  <button onClick={handleDelete} className="p-2.5 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 mb-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</span>
                <div className="flex items-center gap-1 text-sm font-bold text-gray-700"><MapPin className="w-3.5 h-3.5 text-brand-400" />{opp.location}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Deadline</span>
                <div className="flex items-center gap-1 text-sm font-bold text-gray-700"><Calendar className="w-3.5 h-3.5 text-brand-400" />{opp.deadline?.toDate ? opp.deadline.toDate().toLocaleDateString() : 'N/A'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pay</span>
                <div className="text-sm font-extrabold text-green-600 uppercase">{opp.type || "Paid"}</div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</span>
                <div className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded ${opp.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{opp.status}</div>
              </div>
            </div>

            {/* DESCRIPTION SECTION */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">About the Opportunity</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{opp.description}</p>
              </div>
              {opp.requirements && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Requirements</h3>
                  <p className="text-gray-600 leading-relaxed bg-brand-50/50 p-4 rounded-xl border border-brand-100">{opp.requirements}</p>
                </div>
              )}
            </div>
            
            {/* APPLY LOGIC FOR TALENTS */}
            {currentUser?.uid !== opp.createdBy && (
              <div className="mt-10 pt-8 border-t border-gray-100">
                {!myApplication ? (
                  // Show Apply Button if no application exists
                  <button 
                    onClick={() => navigate(`/opportunities/${id}/apply`)} 
                    className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5"
                  >
                    Apply for this Position
                  </button>
                ) : (
                  // Show Status Tracker if they already applied
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" /> Your Application Status
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-gray-500">Current Status:</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest ${
                        myApplication.status === 'accepted' ? 'bg-green-100 text-green-700 border border-green-200' :
                        myApplication.status === 'declined' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {myApplication.status || 'Pending Review'}
                      </span>
                    </div>

                    {myApplication.hostComment && (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Message from Organizer</p>
                        <p className="text-sm text-gray-700 italic">"{myApplication.hostComment}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: APPLICANTS (Owner Only) OR INFO */}
        <div className="lg:col-span-1">
          {currentUser?.uid === opp.createdBy ? (
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-brand-500" /> Applicants ({applicants.length})
              </h3>
              
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 hide-scrollbar">
                {applicants.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">⏳</div>
                    <p className="text-gray-400 text-sm">Waiting for applications...</p>
                  </div>
                ) : (
                  applicants.map(app => (
                    <div key={app.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-200 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <DefaultAvatar className="w-10 h-10 border-2 border-white shadow-sm" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{app.applicantName || "Musical Talent"}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Applied {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3 italic mb-4 bg-white p-3 rounded-xl border border-gray-100">"{app.message}"</p>
                      
                      {app.cvURL && (
                        <a href={app.cvURL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all mb-4">
                          <Download className="w-3.5 h-3.5" /> View Portfolio / CV
                        </a>
                      )}

                      {/* HOST CONTROLS: Accept / Decline / Comment */}
                      <div className="border-t border-gray-200 pt-4 mt-2">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                           <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              app.status === 'accepted' ? 'text-green-600 bg-green-100' :
                              app.status === 'declined' ? 'text-red-600 bg-red-100' :
                              'text-amber-600 bg-amber-100'
                           }`}>
                             {app.status || 'Pending'}
                           </span>
                        </div>

                        <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 mb-3 focus-within:ring-2 focus-within:ring-brand-500">
                          <MessageSquareText className="w-4 h-4 text-gray-400 ml-2 mt-2" />
                          <textarea 
                            rows={2}
                            placeholder="Add feedback for applicant..."
                            value={hostComments[app.id] || ""}
                            onChange={(e) => setHostComments(prev => ({...prev, [app.id]: e.target.value}))}
                            className="w-full text-xs text-gray-700 bg-transparent border-none focus:ring-0 resize-none p-2 outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApplicantDecision(app.id, 'declined')}
                            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => handleApplicantDecision(app.id, 'accepted')}
                            className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition"
                          >
                            Accept
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 bg-gradient-to-br from-brand-500 to-purple-600 text-white">
              <h3 className="text-xl font-bold mb-2">Ready to Jam?</h3>
              <p className="text-brand-100 text-sm leading-relaxed mb-6">Make sure your profile is up to date before applying. Hosts love seeing high-quality media!</p>
              <button onClick={() => navigate('/profile')} className="w-full py-3 bg-white/20 backdrop-blur-md rounded-xl text-sm font-bold hover:bg-white/30 transition">View My Profile</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}