// src/pages/MyCalendar.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Calendar from "../components/Calendar";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function MyCalendar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const bookingsRef = collection(db, "bookings");
    
    // Query 1: Gigs where I am the performer
    const qPerformer = query(bookingsRef, where("performerUserId", "==", currentUser.uid), where("status", "==", "accepted"));
    // Query 2: Events where I am the host/requester
    const qHost = query(bookingsRef, where("requesterUserId", "==", currentUser.uid), where("status", "==", "accepted"));

    let fetchedEvents = [];

    const processSnap = (snap, isHost) => {
      const newEvents = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: `${data.title} ${isHost ? '(Hosting)' : '(Performing)'}`,
          start: data.start?.toDate ? data.start.toDate() : new Date(data.start),
          end: data.end?.toDate ? data.end.toDate() : new Date(data.end),
          isHost,
        };
      });
      
      // Merge and remove duplicates by ID
      fetchedEvents = [...fetchedEvents.filter(e => !newEvents.find(n => n.id === e.id)), ...newEvents];
      setEvents(fetchedEvents);
      setLoading(false);
    };

    const unsubPerf = onSnapshot(qPerformer, (snap) => processSnap(snap, false));
    const unsubHost = onSnapshot(qHost, (snap) => processSnap(snap, true));

    return () => { unsubPerf(); unsubHost(); };
  }, [currentUser]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl shadow-sm">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Master Schedule</h1>
          <p className="text-sm text-gray-500">Your upcoming performances and hosted events.</p>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="h-[600px] flex flex-col items-center justify-center text-gray-400">
            <Clock className="w-8 h-8 animate-spin mb-3 text-brand-300" />
            <p>Loading your itinerary...</p>
          </div>
        ) : (
          <Calendar
            events={events}
            defaultView="month"
            selectable={true}
          />
        )}
      </div>
    </div>
  );
}