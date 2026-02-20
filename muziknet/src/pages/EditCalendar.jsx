// src/pages/EditCalendar.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from "firebase/firestore";
import Calendar from "../components/Calendar";

/**
 * EditCalendar - performer sets their availability events
 * - Simple form to create availability slots (start datetime, end datetime, title)
 * - Shows existing availability events (simple Firestore collection: users/{uid}/availability)
 */

export default function EditCalendar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("Available");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(u => {
      setCurrentUser(u || null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const ref = collection(db, "users", currentUser.uid, "availability");
    // realtime get all availability events
    const q = query(ref);
    const unsub = onSnapshot(q, snap => {
      const ev = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          start: data.start.toDate ? data.start.toDate() : new Date(data.start),
          end: data.end.toDate ? data.end.toDate() : new Date(data.end),
        };
      });
      setEvents(ev);
    }, (err) => console.error("availability snapshot error", err));

    return () => unsub();
  }, [currentUser]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!start || !end) return alert("Start and end are required");
    setLoading(true);
    try {
      await addDoc(collection(db, "users", currentUser.uid, "availability"), {
        title,
        start: new Date(start),
        end: new Date(end),
        createdAt: serverTimestamp(),
      });
      setStart(""); setEnd(""); setTitle("Available");
    } catch (err) {
      console.error("Create availability error", err);
      alert("Failed to save availability");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-4">Availability Calendar</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border px-2 py-1 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Start (date & time)</label>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="w-full border px-2 py-1 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">End (date & time)</label>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="w-full border px-2 py-1 rounded" />
            </div>
            <button disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded">Save Availability</button>
          </form>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <Calendar
            events={events.map(ev => ({ id: ev.id, title: ev.title, start: ev.start, end: ev.end }))}
            defaultView="week"
          />
        </div>
      </div>
    </div>
  );
}
