// src/pages/MyCalendar.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import Calendar from "../components/Calendar";
import { Calendar as CalendarIcon, Clock, Plus, X, MapPin } from "lucide-react";
import { format } from "date-fns";
import DefaultAvatar from "../components/DefaultAvatar";

export default function MyCalendar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalUsers, setModalUsers] = useState({}); // Stores fetched profiles for the modal
  const [showPersonalEventModal, setShowPersonalEventModal] = useState(false);
  const [personalEventForm, setPersonalEventForm] = useState({ title: "", start: "", end: "", location: "", description: "" });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  // Fetch Events
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const bookingsRef = collection(db, "bookings");
    const externalRef = collection(db, "external_events");
    
    const qPerformer = query(bookingsRef, where("performerUserId", "==", currentUser.uid));
    const qHost = query(bookingsRef, where("requesterUserId", "==", currentUser.uid));
    const qExternal = query(externalRef, where("userId", "==", currentUser.uid));

    let talentBookings = [];
    let hostBookings = [];
    let externalEvents = [];

    const processData = () => {
      const mappedTalent = talentBookings.map(b => ({
        id: b.id, type: 'talent', title: b.title, start: b.start.toDate(), end: b.end.toDate(), status: b.status, raw: b
      }));

      const groupedHost = {};
      hostBookings.forEach(b => {
        const key = `${b.title}_${b.start.toDate().getTime()}`;
        if (!groupedHost[key]) {
          groupedHost[key] = { id: `group_${key}`, type: 'host_group', title: b.title, start: b.start.toDate(), end: b.end.toDate(), location: b.location, bookings: [] };
        }
        groupedHost[key].bookings.push(b);
      });

      const mappedHost = Object.values(groupedHost).map(group => {
        const hasConfirmed = group.bookings.some(b => b.status === "confirmed");
        group.status = hasConfirmed ? "confirmed" : "tentative";
        return group;
      });

      const mappedExternal = externalEvents.map(e => ({
        id: e.id, type: 'external', title: e.title, start: e.start.toDate(), end: e.end.toDate(), raw: e
      }));

      setEvents([...mappedTalent, ...mappedHost, ...mappedExternal]);
      setLoading(false);
    };

    const unsubPerf = onSnapshot(qPerformer, snap => { talentBookings = snap.docs.map(d => ({ id: d.id, ...d.data() })); processData(); });
    const unsubHost = onSnapshot(qHost, snap => { hostBookings = snap.docs.map(d => ({ id: d.id, ...d.data() })); processData(); });
    const unsubExt = onSnapshot(qExternal, snap => { externalEvents = snap.docs.map(d => ({ id: d.id, ...d.data() })); processData(); });

    return () => { unsubPerf(); unsubHost(); unsubExt(); };
  }, [currentUser]);

  // Fetch User Profiles when an event is clicked
  useEffect(() => {
    if (!selectedEvent) return;

    const fetchUsersForModal = async () => {
      const uidsToFetch = new Set();
      if (selectedEvent.type === 'talent') uidsToFetch.add(selectedEvent.raw.requesterUserId);
      if (selectedEvent.type === 'host_group') {
        selectedEvent.bookings.forEach(b => uidsToFetch.add(b.performerUserId));
      }

      const fetchedData = {};
      for (let uid of uidsToFetch) {
        if (!uid) continue;
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) fetchedData[uid] = snap.data();
      }
      setModalUsers(fetchedData);
    };

    fetchUsersForModal();
  }, [selectedEvent]);

  // Actions
  const handleBookingAction = async (bookingId, newStatus, targetUserId, isHost) => {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    try {
      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) return;
      
      const currentStatus = bookingSnap.data().status;
      let finalStatus = newStatus;

      if (newStatus === "confirmed") {
        if (isHost) {
          finalStatus = currentStatus === "talent_confirmed" ? "confirmed" : "host_confirmed";
        } else {
          finalStatus = currentStatus === "host_confirmed" ? "confirmed" : "talent_confirmed";
        }
      }

      await updateDoc(bookingRef, { status: finalStatus, updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId, type: "booking", message: `A booking status was updated to ${finalStatus.replace("_", " ").toUpperCase()}`, link: "/calendar", isRead: false, createdAt: serverTimestamp()
      });

      setSelectedEvent(null); 
    } catch (err) { console.error(err); }
  };

  const handleAddExternalEvent = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "external_events"), {
        userId: currentUser.uid, title: personalEventForm.title, location: personalEventForm.location, description: personalEventForm.description, start: new Date(personalEventForm.start), end: new Date(personalEventForm.end), createdAt: serverTimestamp()
      });
      setShowPersonalEventModal(false);
      setPersonalEventForm({ title: "", start: "", end: "", location: "", description: "" });
    } catch (err) { console.error(err); }
  };

  // Calendar Visuals
  const eventPropGetter = (event) => {
    let className = "rounded-lg border-2 font-bold px-2 py-1 text-sm transition-all shadow-sm ";
    let style = {};

    if (event.type === 'external') {
      className += "bg-blue-500 text-white border-blue-600";
    } else if (event.status === "confirmed") {
      className += "bg-brand-500 text-white border-brand-600";
    } else if (event.status === "talent_confirmed" || event.status === "host_confirmed") {
      className += "bg-white text-brand-700 border-brand-500";
    } else if (event.status === "pre_booked" || event.status === "tentative") {
      className += "bg-white text-gray-700 border-dashed border-brand-300";
    } else if (event.status === "canceled" || event.status === "declined") {
      className += "bg-gray-100 text-gray-400 border-gray-200 line-through opacity-70";
    } else {
      className += "bg-white text-gray-500 border-gray-200";
    }

    return { className, style };
  };

  const CustomEvent = ({ event }) => {
    let tag = null;
    if (event.type === 'talent') {
      if (event.status === 'talent_confirmed') tag = "Pending Host";
      if (event.status === 'host_confirmed') tag = "Action Needed";
    } else if (event.type === 'host_group') {
      if (event.status === 'tentative') tag = "Pending Talents";
    }
    return (
      <div className="flex flex-col">
        <span className="truncate">{event.title}</span>
        {tag && <span className="text-[10px] uppercase bg-white/90 text-brand-700 px-1 mt-0.5 rounded w-fit shadow-sm">{tag}</span>}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-xl shadow-sm">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Master Schedule</h1>
            <p className="text-sm text-gray-500">Manage MuZikNet gigs and outside events in one place.</p>
          </div>
        </div>
        <button onClick={() => setShowPersonalEventModal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-gray-900/20">
          <Plus className="w-4 h-4" /> Add Personal Event
        </button>
      </div>

      <div className="glass-card p-4 md:p-6 h-[80vh] flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Clock className="w-8 h-8 animate-spin mb-3 text-brand-300" />
            <p>Loading your itinerary...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0"> {/* This traps the calendar inside the flex container */}
            <Calendar 
              events={events} 
              defaultView="month" 
              selectable={true} 
              onSelectEvent={(event) => setSelectedEvent(event)} 
              eventPropGetter={eventPropGetter} 
              components={{ event: CustomEvent }} 
            />
          </div>
        )}
      </div>

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md mb-2 block w-fit">
                  {selectedEvent.type === 'host_group' ? 'Hosted Event' : selectedEvent.type === 'talent' ? 'Gig / Performance' : 'Personal Event'}
                </span>
                <h2 className="text-xl font-extrabold text-gray-900">{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 font-medium">
                <Clock className="w-4 h-4 text-brand-500" /> {format(selectedEvent.start, "MMM d, yyyy • h:mm a")}
              </div>
              {(selectedEvent.location || selectedEvent.raw?.location) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 font-medium">
                  <MapPin className="w-4 h-4 text-brand-500" /> {selectedEvent.location || selectedEvent.raw?.location}
                </div>
              )}

              {/* HOST VIEW: List of Talents */}
              {selectedEvent.type === 'host_group' && (
                <div className="space-y-4 border-t border-gray-100 pt-6">
                  <h3 className="font-bold text-gray-900 mb-2">Talent Roster</h3>
                  {selectedEvent.bookings.map(b => {
                    const talentUser = modalUsers[b.performerUserId];
                    return (
                      <div key={b.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-4 transition-all hover:border-brand-200">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => navigate(`/user/${b.performerUserId}`)}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                              {talentUser?.photoURL ? <img src={talentUser.photoURL} className="w-full h-full object-cover" /> : <DefaultAvatar className="w-full h-full text-sm" />}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 hover:text-brand-600 transition">{talentUser?.stageName || "Loading..."}</p>
                              <p className="text-xs text-gray-500">${talentUser?.username || "unknown"}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {b.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        {b.status !== 'confirmed' && b.status !== 'canceled' && b.status !== 'declined' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleBookingAction(b.id, "canceled", b.performerUserId, true)} className="flex-1 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition">Decline</button>
                            <button onClick={() => handleBookingAction(b.id, "confirmed", b.performerUserId, true)} className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition shadow-md">Confirm</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TALENT VIEW: Host Details */}
              {selectedEvent.type === 'talent' && (
                <div className="border-t border-gray-100 pt-6">
                  {modalUsers[selectedEvent.raw.requesterUserId] && (
                    <div className="flex items-center gap-3 mb-5 cursor-pointer p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-200 transition" onClick={() => navigate(`/user/${selectedEvent.raw.requesterUserId}`)}>
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                        {modalUsers[selectedEvent.raw.requesterUserId].photoURL ? (
                          <img src={modalUsers[selectedEvent.raw.requesterUserId].photoURL} className="w-full h-full object-cover" />
                        ) : <DefaultAvatar className="w-full h-full" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Event Host</p>
                        <p className="font-extrabold text-gray-900">{modalUsers[selectedEvent.raw.requesterUserId].stageName || modalUsers[selectedEvent.raw.requesterUserId].fullName}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 mb-5 bg-brand-50 p-4 rounded-xl border border-brand-100 italic">"{selectedEvent.raw.message}"</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-900">Current Status:</span>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest ${selectedEvent.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedEvent.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  {selectedEvent.status !== 'confirmed' && selectedEvent.status !== 'canceled' && selectedEvent.status !== 'declined' && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleBookingAction(selectedEvent.id, "declined", selectedEvent.raw.requesterUserId, false)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition">Decline</button>
                      <button onClick={() => handleBookingAction(selectedEvent.id, "confirmed", selectedEvent.raw.requesterUserId, false)} className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-md transition">Confirm Gig</button>
                    </div>
                  )}
                </div>
              )}

              {/* EXTERNAL EVENT VIEW */}
              {selectedEvent.type === 'external' && (
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap">{selectedEvent.raw.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD PERSONAL EVENT MODAL */}
      {showPersonalEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Form unchanged, kept identical to previous version for brevity */}
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-extrabold text-gray-900">Add Personal Event</h2>
              <button onClick={() => setShowPersonalEventModal(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddExternalEvent} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label><input required value={personalEventForm.title} onChange={e => setPersonalEventForm({...personalEventForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label><input type="datetime-local" required value={personalEventForm.start} onChange={e => setPersonalEventForm({...personalEventForm, start: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white outline-none" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label><input type="datetime-local" required value={personalEventForm.end} onChange={e => setPersonalEventForm({...personalEventForm, end: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white outline-none" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label><input value={personalEventForm.location} onChange={e => setPersonalEventForm({...personalEventForm, location: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label><textarea rows={3} value={personalEventForm.description} onChange={e => setPersonalEventForm({...personalEventForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white outline-none resize-none" /></div>
              <button type="submit" className="w-full mt-4 bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition shadow-lg">Save to Calendar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}