import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "applications"),
      where("applicantId", "==", uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawApps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Also fetch the corresponding opportunity for display
      const final = [];
      for (let app of rawApps) {
        const opRef = doc(db, "opportunities", app.opportunityId);
        const opSnap = await getDoc(opRef);

        final.push({
          ...app,
          opportunity: opSnap.exists() ? opSnap.data() : null,
        });
      }

      setApplications(final);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">My Applications</h1>

        {applications.length === 0 ? (
          <p>You haven't applied to any opportunities yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="border p-4 rounded-lg bg-white shadow-sm">
                <h2 className="text-xl font-semibold">
                  {app.opportunity?.title || "Opportunity removed"}
                </h2>

                <p className="text-gray-600 mt-1">
                  Category: {app.opportunity?.category || "Unknown"}
                </p>

                <span className="mt-4 inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                  Application Status: {app.status}
                </span>

                {app.opportunity && (
                  <Link
                    to={`/opportunities/${app.opportunityId}`}
                    className="mt-4 block text-blue-600 underline"
                  >
                    View Opportunity →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
