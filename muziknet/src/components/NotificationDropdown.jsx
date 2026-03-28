// src/components/NotificationDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Bell, Heart, MessageCircle, CalendarClock, Briefcase, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationDropdown({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      await updateDoc(doc(db, "notifications", notif.id), { isRead: true });
    }
    if (notif.link) navigate(notif.link);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { isRead: true });
    });
    await batch.commit();
  };

  // THE DOT LOGIC
  const unreadSocial = notifications.some(n => !n.isRead && n.type === 'social');
  const unreadBooking = notifications.some(n => !n.isRead && n.type === 'booking');
  const unreadOpportunity = notifications.some(n => !n.isRead && n.type === 'opportunity');
  const hasUnread = unreadSocial || unreadBooking || unreadOpportunity;

  const getIconAndColor = (type) => {
    switch (type) {
      case "social": 
        return { icon: <Heart className="w-4 h-4" />, bg: "bg-purple-100", text: "text-purple-600" };
      case "booking": 
        return { icon: <CalendarClock className="w-4 h-4" />, bg: "bg-green-100", text: "text-green-600" };
      case "opportunity": 
        return { icon: <Briefcase className="w-4 h-4" />, bg: "bg-blue-100", text: "text-blue-600" };
      default:
        return { icon: <Zap className="w-4 h-4" />, bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        
        {/* THE COLOR-CODED DOTS */}
        <div className="absolute top-1 right-1 flex gap-0.5">
          {unreadSocial && <span className="w-2.5 h-2.5 bg-purple-500 rounded-full border border-white shadow-sm"></span>}
          {unreadOpportunity && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full border border-white shadow-sm"></span>}
          {unreadBooking && <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-white shadow-sm animate-pulse"></span>}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {hasUnread && (
              <button onClick={markAllAsRead} className="text-xs font-bold text-brand-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">🔕</div>
                <p className="text-sm text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { icon, bg, text } = getIconAndColor(notif.type);
                return (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!notif.isRead ? 'bg-brand-50/30' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
                        {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${text.replace('text-', 'bg-')}`}></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}