// src/pages/Messages.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection, query, where, onSnapshot, addDoc,
  doc, setDoc, orderBy, getDocs, getDoc, serverTimestamp
} from "firebase/firestore";
import { format, isSameDay } from "date-fns";
import { Send, ArrowLeft, Search, MessageSquarePlus, Check, CheckCheck, User } from "lucide-react";

export default function Messages() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Load current user & network
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setCurrentUser(user);

      const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
      const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));

      setFollowers(followersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setFollowing(followingSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Conversations Listener
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const convos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const enriched = await Promise.all(
        convos.map(async (c) => {
          const otherUid = c.participants.find((id) => id !== currentUser.uid);
          const userDoc = await getDoc(doc(db, "users", otherUid));
          return {
            ...c,
            otherUser: {
              uid: otherUid,
              stageName: userDoc.exists() ? userDoc.data().stageName : "Unknown",
              photoURL: userDoc.exists() ? userDoc.data().photoURL : "",
            },
          };
        })
      );

      // Sort by latest message
      enriched.sort((a, b) => (b.lastTimestamp?.toMillis() || 0) - (a.lastTimestamp?.toMillis() || 0));
      setConversations(enriched);

      // Handle direct navigation to a chat
      if (location.state?.convoId && !selectedConversation) {
        const found = enriched.find((c) => c.id === location.state.convoId);
        if (found) setSelectedConversation(found);
      }
    });

    return () => unsubscribe();
  }, [currentUser, location.state]);

  // Messages Listener
  useEffect(() => {
    if (!selectedConversation) return;

    const messagesRef = collection(db, "conversations", selectedConversation.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  // Send Message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser || !selectedConversation) return;

    const msg = {
      sender: currentUser.uid,
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      seenBy: [currentUser.uid],
    };

    setMessageText(""); // Optimistic clear

    await addDoc(collection(db, "conversations", selectedConversation.id, "messages"), msg);
    await setDoc(doc(db, "conversations", selectedConversation.id), {
      lastMessage: msg.text,
      lastTimestamp: serverTimestamp(),
      participants: selectedConversation.participants
    }, { merge: true });
  };

  // Start Conversation
  const startConversation = async (otherUser) => {
    if (!currentUser) return;
    const uids = [currentUser.uid, otherUser.uid].sort();
    const convoId = `${uids[0]}_${uids[1]}`;

    await setDoc(doc(db, "conversations", convoId), {
      participants: uids,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setShowStartModal(false);
    setSelectedConversation({ id: convoId, participants: uids, otherUser }); 
  };

  // Read Receipts
  const renderReadStatus = (msg) => {
    if (msg.sender !== currentUser.uid) return null;
    
    const recipientUid = selectedConversation?.participants?.find((uid) => uid !== currentUser.uid) || selectedConversation?.otherUser?.uid;
    if (!recipientUid) return null;

    const isRead = msg.seenBy?.includes(recipientUid);
    
    return isRead ? (
      <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
    ) : (
      <Check className="w-3.5 h-3.5 text-gray-400" />
    );
  };

  const contactOptions = [...followers, ...following].filter(
    (u, idx, arr) => arr.findIndex((o) => o.uid === u.uid) === idx
  );

  return (
    <div className="h-[calc(100vh-72px)] md:h-[calc(100vh-100px)] flex bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden relative">
      
      {/* INBOX SIDEBAR */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white transition-all ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between glass z-10">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h2>
          <button 
            onClick={() => setShowStartModal(true)}
            className="p-2 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search chats..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent rounded-xl text-sm focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const other = conv.otherUser;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors border-l-4 ${
                    isSelected ? "bg-brand-50 border-brand-500" : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {other?.photoURL ? (
                      <img src={other.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 m-auto text-gray-400 mt-3" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-gray-900 truncate">{other?.stageName || "User"}</span>
                    </div>
                    <span className={`text-sm truncate block ${isSelected ? "text-brand-600 font-medium" : "text-gray-500"}`}>
                      {conv.lastMessage || "Started a conversation"}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">💬</div>
              <p className="text-gray-500 text-sm">No messages yet.</p>
              <button onClick={() => setShowStartModal(true)} className="text-brand-600 font-medium text-sm mt-2 hover:underline">Start one now</button>
            </div>
          )}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className={`flex-1 flex flex-col bg-[#f8f9fc] ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full shadow-soft flex items-center justify-center mb-4">
              <MessageSquarePlus className="w-8 h-8 text-brand-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h3>
            <p className="max-w-xs text-sm">Select a conversation from the sidebar or start a new one to connect with other musicians.</p>
          </div>
        ) : (
          <>
            {/* Chat Header (Sticky & Glass) */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 glass z-10">
              <button 
                onClick={() => setSelectedConversation(null)} 
                className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                {selectedConversation.otherUser?.photoURL ? (
                  <img src={selectedConversation.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 m-auto text-gray-400 mt-2.5" />
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">
                  {selectedConversation.otherUser?.stageName || "User"}
                </p>
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                  Active
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 hide-scrollbar">
              {messages.length === 0 && (
                <div className="text-center text-sm text-gray-400 mt-10">
                  This is the beginning of your conversation. Say hi! 👋
                </div>
              )}

              {messages.map((msg, i) => {
                const prevMsg = messages[i - 1];
                const showDate = !prevMsg || (msg.timestamp && prevMsg.timestamp && !isSameDay(msg.timestamp.toDate(), prevMsg.timestamp.toDate()));
                const isMe = msg.sender === currentUser.uid;

                return (
                  <div key={msg.id} className="flex flex-col">
                    {showDate && msg.timestamp && (
                      <div className="text-center my-4">
                        <span className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                          {format(msg.timestamp.toDate(), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}

                    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        
                        {/* THE CHAT BUBBLE */}
                        <div className={`px-4 py-2.5 shadow-sm text-[15px] leading-relaxed ${
                          isMe
                            ? "bg-brand-500 text-white rounded-2xl rounded-tr-sm"
                            : "bg-white text-gray-900 border border-gray-100 rounded-2xl rounded-tl-sm"
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        
                        {/* Timestamp & Read Receipt */}
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium px-1">
                          {msg.timestamp ? format(msg.timestamp.toDate(), "HH:mm") : "Sending..."}
                          {isMe && renderReadStatus(msg)}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-white border-t border-gray-100 z-10">
              <div className="flex items-end gap-2 bg-gray-50 p-1.5 rounded-3xl border border-gray-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200 transition-all">
                <textarea
                  placeholder="Message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none px-4 py-2.5 text-sm text-gray-900 outline-none hide-scrollbar"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="p-2.5 rounded-full bg-brand-500 text-white hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex-shrink-0 mb-0.5 mr-0.5"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2 hidden md:block">Press Enter to send, Shift + Enter for a new line</p>
            </div>
          </>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {showStartModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">New Message</h2>
              <button onClick={() => setShowStartModal(false)} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="overflow-y-auto p-2">
              {contactOptions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  You need to follow other users to message them directly.
                </div>
              ) : (
                contactOptions.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => startConversation(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-brand-50 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold flex-shrink-0">
                      {(user.stageName || user.fullName || "U")[0].toUpperCase()}
                    </div>
                    <div className="text-left flex-1 overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{user.stageName || user.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">${user.username || "user"}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}