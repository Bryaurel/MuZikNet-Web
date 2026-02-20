// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * MyBookings
 * - Shows Bookings Sent (requests this user created) and Bookings Received (requests others created targeting this user)
 * - Booking document example: bookings/{id} { requesterUserId, performerUserId, title, start, end, price, message, status: "pending"|"accepted"|"declined", createdAt }
 *
 * This page fetches bookings where requesterUserId === currentUser.uid (sent)
 * and where performerUserId === currentUser.uid (received)
 */

export default function MyBookings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const qSent = query(collection(db, "bookings"), where("requesterUserId", "==", currentUser.uid));
    const qReceived = query(collection(db, "bookings"), where("performerUserId", "==", currentUser.uid));

    const unsubSent = onSnapshot(qSent, snap => {
      setSent(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReceived = onSnapshot(qReceived, snap => {
      setReceived(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [currentUser]);

  const acceptBooking = async (b) => {
    // update booking status to accepted (simple setDoc)
    try {
      await setDoc(doc(db, "bookings", b.id), { status: "accepted", updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error("Accept booking error", err);
    }
  };

  const declineBooking = async (b) => {
    try {
      await setDoc(doc(db, "bookings", b.id), { status: "declined", updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error("Decline booking error", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Bookings Sent</h3>
          {sent.length === 0 ? <div className="text-gray-500">No sent bookings</div> : (
            <div className="space-y-3">
              {sent.map(b => (
                <div key={b.id} className="p-3 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{b.title}</div>
                      <div className="text-sm text-gray-600">{new Date(b.start).toLocaleString()} - {new Date(b.end).toLocaleString()}</div>
                      <div className="text-sm text-gray-600">To: {b.performerUserId}</div>
                    </div>
                    <div className="text-sm">{b.status}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">{b.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Bookings Received</h3>
          {received.length === 0 ? <div className="text-gray-500">No received bookings</div> : (
            <div className="space-y-3">
              {received.map(b => (
                <div key={b.id} className="p-3 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{b.title}</div>
                      <div className="text-sm text-gray-600">{new Date(b.start).toLocaleString()} - {new Date(b.end).toLocaleString()}</div>
                      <div className="text-sm text-gray-600">From: {b.requesterUserId}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm">{b.status}</div>
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => acceptBooking(b)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Accept</button>
                          <button onClick={() => declineBooking(b)} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Decline</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">{b.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
