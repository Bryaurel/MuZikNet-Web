// src/pages/MyApplications.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";

export default function MyApplications() {
  const [user, setUser] = useState(null);
  const [applicationsSent, setApplicationsSent] = useState([]);
  const [applicationsReceived, setApplicationsReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Applications sent by current user: search all opportunities subcollections (expensive)
    // We'll query opportunitites and then filter subcollections — simpler approach: a global 'applications' collection is recommended.
    // For demo, we'll query opportunities where createdBy == user.uid (received), and query applications subcollections for sent (scanning)
    (async () => {
      try {
        // Received: opportunities created by me -> applications inside each
        const myOppsSnap = await getDocs(query(collection(db, "opportunities"), where("createdBy", "==", user.uid)));
        const opps = myOppsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const received = [];
        for (const op of opps) {
          const appsSnap = await getDocs(collection(db, "opportunities", op.id, "applications"));
          appsSnap.forEach(s => received.push({ id: s.id, opportunityId: op.id, opportunityTitle: op.title, ...s.data() }));
        }

        // Sent: scan all opportunities and collect applications authored by current user
        const allOppsSnap = await getDocs(collection(db, "opportunities"));
        const sent = [];
        for (const d of allOppsSnap.docs) {
          const appsSnap = await getDocs(collection(db, "opportunities", d.id, "applications"));
          appsSnap.forEach(s => {
            const data = s.data();
            if (data.userId === user.uid) {
              sent.push({ id: s.id, opportunityId: d.id, opportunityTitle: d.data().title || "", ...data });
            }
          });
        }

        setApplicationsReceived(received);
        setApplicationsSent(sent);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">My applications</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Applications sent</h3>
          {applicationsSent.length === 0 ? <div className="text-gray-500">No sent applications.</div> : (
            <div className="space-y-3">
              {applicationsSent.map(a => (
                <div key={a.id} className="border rounded p-3">
                  <div className="font-semibold">{a.opportunityTitle}</div>
                  <div className="text-sm text-gray-600">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Applications received (for your opportunities)</h3>
          {applicationsReceived.length === 0 ? <div className="text-gray-500">No received applications yet.</div> : (
            <div className="space-y-3">
              {applicationsReceived.map(a => (
                <div key={a.id} className="border rounded p-3">
                  <div className="font-semibold">{a.opportunityTitle}</div>
                  <div className="text-sm text-gray-600">{a.message}</div>
                  <div className="text-xs text-gray-500 mt-2">{a.name} • {a.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
