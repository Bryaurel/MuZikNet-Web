import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function MyOpportunities() {
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser.uid;
    const q = query(
      collection(db, "opportunities"),
      where("createdBy", "==", uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOpportunities(data);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "opportunities", id));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">My Opportunities</h1>

        {opportunities.length === 0 ? (
          <p>You haven't posted any opportunities yet.</p>
        ) : (
          <div className="space-y-4">
            {opportunities.map((op) => (
              <div key={op.id} className="border p-4 rounded-lg shadow-sm bg-white">
                
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">{op.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      op.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : op.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {op.status}
                  </span>
                </div>

                <p className="text-gray-600 mt-1">{op.category}</p>

                <div className="flex gap-4 mt-4">
                  <Link
                    to={`/opportunities/${op.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    View
                  </Link>

                  <Link
                    to={`/opportunities/edit/${op.id}`}
                    className="px-4 py-2 bg-yellow-600 text-white rounded"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(op.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>

                  {op.status === "approved" && (
                    <Link
                      to={`/dashboard/my-opportunities/${op.id}/applications`}
                      className="px-4 py-2 bg-gray-800 text-white rounded"
                    >
                      View Applications
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
