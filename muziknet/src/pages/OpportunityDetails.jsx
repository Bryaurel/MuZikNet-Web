// src/pages/OpportunityDetails.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  doc,
  onSnapshot,
  deleteDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

/**
 * Opportunity Details page
 * - Shows full fields
 * - Owner: edit/delete, view applications (list)
 * - Admin: Approve/Reject
 * - Regular user: Apply link
 *
 * Note: For brevity edit redirects to NewOpportunity with prefill (not implemented). You can extend to add full edit page.
 */

export default function OpportunityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [opp, setOpp] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        // check isAdmin flag on user's doc
        try {
          const uRef = doc(db, "users", u.uid);
          const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", u.uid))).catch(() => null);
          // easier: fetch doc
          const direct = await (async () => {
            try {
              const dd = await (await import("firebase/firestore")).getDoc(uRef);
              return dd;
            } catch {
              return null;
            }
          })();
          if (direct && direct.exists && direct.exists()) {
            const data = direct.data();
            setIsAdmin(!!data?.isAdmin);
          } else {
            // fallback: check field via getDoc (safe path above)
            setIsAdmin(false);
          }
        } catch (err) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // listen to opportunity doc
  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "opportunities", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setOpp({ id: snap.id, ...snap.data() });
      else setOpp(null);
    }, (err) => {
      console.error("Opportunity snapshot error:", err);
    });
    return () => unsub();
  }, [id]);

  // load applications (owner only)
  useEffect(() => {
    if (!id || !opp) return;
    async function loadApps() {
      if (!currentUser || currentUser.uid !== opp.createdBy) return;
      setLoadingApps(true);
      try {
        const appsSnap = await getDocs(collection(db, "opportunities", id, "applications"));
        setApplications(appsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingApps(false);
      }
    }
    loadApps();
  }, [id, opp, currentUser]);

  const handleDelete = async () => {
    if (!currentUser || currentUser.uid !== opp.createdBy) return;
    if (!confirm("Delete this opportunity? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "opportunities", id));
      alert("Deleted");
      navigate("/opportunities");
    } catch (err) {
      console.error(err);
      alert("Failed to delete");
    }
  };

  const handleApprove = async (status) => {
    // admin only
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, "opportunities", id), { status, reviewedAt: serverTimestamp() });
      alert(`Opportunity ${status}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
  };

  if (!opp) return <div className="p-6 text-gray-500">Loading opportunity...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{opp.title}</h1>
            <p className="text-sm text-gray-600">{opp.organizer}</p>
            <div className="text-xs text-gray-500 mt-2">Status: {opp.status}</div>
          </div>

          <div className="flex gap-2">
            {currentUser && currentUser.uid === opp.createdBy && (
              <>
                <button onClick={() => navigate(`/opportunities/edit/${id}`)} className="px-3 py-2 bg-gray-100 rounded">Edit</button>
                <button onClick={handleDelete} className="px-3 py-2 bg-red-100 text-red-700 rounded">Delete</button>
              </>
            )}

            {isAdmin && (
              <>
                <button onClick={() => handleApprove("approved")} className="px-3 py-2 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => handleApprove("rejected")} className="px-3 py-2 bg-yellow-400 text-black rounded">Reject</button>
              </>
            )}

            <button onClick={() => navigate(`/opportunities/${id}/apply`)} className="px-3 py-2 bg-purple-600 text-white rounded">Apply</button>
          </div>
        </div>

        <div className="mt-6 text-gray-700">
          <p className="mb-4">{opp.description}</p>

          {opp.requirements && (
            <>
              <h3 className="font-semibold">Requirements</h3>
              <p className="text-sm text-gray-700 mb-4">{opp.requirements}</p>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
            <div><strong>Location:</strong> {opp.location || "Remote/Not specified"}</div>
            <div><strong>Deadline:</strong> {opp.deadline ? (opp.deadline.toDate ? opp.deadline.toDate().toLocaleDateString() : new Date(opp.deadline).toLocaleDateString()) : "None"}</div>
            <div><strong>Fees:</strong> {opp.fees || "None"}</div>
            <div><strong>Looking for:</strong> {(opp.lookingFor && Array.isArray(opp.lookingFor)) ? opp.lookingFor.join(", ") : (opp.lookingFor || "—")}</div>
            <div><strong>Genres:</strong> {(opp.genres && Array.isArray(opp.genres)) ? opp.genres.join(", ") : (opp.genres || "—")}</div>
            {opp.link && <div><strong>Application link:</strong> <a href={opp.link} target="_blank" rel="noreferrer" className="text-purple-600">{opp.link}</a></div>}
          </div>
        </div>
      </div>

      {/* Owner: applications list */}
      {currentUser && opp.createdBy === currentUser.uid && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Applications</h2>
          {loadingApps ? (
            <div>Loading...</div>
          ) : applications.length === 0 ? (
            <div className="text-gray-500">No applications yet.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a.id} className="p-3 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{a.applicantName || a.applicantUid}</div>
                      <div className="text-sm text-gray-600">{a.message}</div>
                    </div>
                    <div className="text-sm text-gray-500">{a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : ""}</div>
                  </div>
                  {a.cvURL && (
                    <div className="mt-2">
                      <a href={a.cvURL} target="_blank" rel="noreferrer" className="text-purple-600">Download CV</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
