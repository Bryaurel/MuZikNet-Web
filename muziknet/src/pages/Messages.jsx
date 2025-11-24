import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { format, isSameDay } from "date-fns";

export default function Messages() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Load current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setCurrentUser(user);

      // Load followers / following
      const followersSnap = await getDocs(
        collection(db, "users", user.uid, "followers")
      );
      const followingSnap = await getDocs(
        collection(db, "users", user.uid, "following")
      );

      setFollowers(followersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setFollowing(followingSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const convos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConversations(convos);

      // Select first automatically
      if (!selectedConversation && convos.length > 0) {
        setSelectedConversation(convos[0]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load messages
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (!selectedConversation) return;

    const messagesRef = collection(
      db,
      "conversations",
      selectedConversation.id,
      "messages"
    );

    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Auto scroll
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  // Send new message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser || !selectedConversation) return;

    const msg = {
      sender: currentUser.uid,
      text: messageText,
      timestamp: new Date(),
      seenBy: [currentUser.uid],
    };

    await addDoc(
      collection(db, "conversations", selectedConversation.id, "messages"),
      msg
    );

    await setDoc(
      doc(db, "conversations", selectedConversation.id),
      {
        lastMessage: messageText,
        lastTimestamp: new Date(),
      },
      { merge: true }
    );

    setMessageText("");
  };

  // Start conversation
  const startConversation = async (otherUser) => {
    if (!currentUser) return;

    const uids = [currentUser.uid, otherUser.uid].sort();

    // ❗ FIXED THE ERROR HERE
    const convoId = `${uids[0]}_${uids[1]}`;

    await setDoc(
      doc(db, "conversations", convoId),
      {
        participants: uids,
        lastMessage: "",
        lastTimestamp: null,
      },
      { merge: true }
    );

    setShowStartModal(false);
    setSelectedConversation({ id: convoId, participants: uids });
  };

  // Read status
  const renderReadStatus = (msg) => {
    if (msg.sender !== currentUser.uid) return null;

    const recipientUid = selectedConversation.participants.find(
      (uid) => uid !== currentUser.uid
    );

    return msg.seenBy.includes(recipientUid) ? "🎵🎵" : "🎵";
  };

  // Contacts list for modal
  const contactOptions = [...followers, ...following].filter(
    (u, idx, arr) => arr.findIndex((o) => o.uid === u.uid) === idx
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-100">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-gray-900 mb-3">Messages</h2>
          <input
            placeholder="Search messages..."
            className="w-full pl-3 py-1 border rounded"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const otherUid = conv.participants.find(
                (uid) => uid !== currentUser.uid
              );
              const lastMsg = conv.lastMessage || "No messages yet";

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex flex-col gap-1 text-left hover:bg-gray-50 transition ${
                    selectedConversation?.id === conv.id ? "bg-purple-50" : ""
                  }`}
                >
                  <span className="font-semibold">{otherUid}</span>
                  <span className="text-sm text-gray-500 truncate">
                    {lastMsg}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-gray-500 text-sm">
              No conversations yet.
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <p className="mb-3">No conversation selected</p>
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              onClick={() => setShowStartModal(true)}
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {selectedConversation.participants.find(
                  (uid) => uid !== currentUser.uid
                )}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {messages.length === 0 && (
                <p className="text-gray-500 text-center mt-4">
                  No messages yet
                </p>
              )}

              {messages.map((msg, i) => {
                const prevMsg = messages[i - 1];
                const showDate =
                  !prevMsg ||
                  !isSameDay(
                    msg.timestamp.toDate(),
                    prevMsg.timestamp.toDate()
                  );

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center text-gray-400 text-sm my-2">
                        {format(msg.timestamp.toDate(), "PPP")}
                      </div>
                    )}

                    <div
                      className={`flex ${msg.sender === currentUser.uid
                        ? "justify-end"
                        : "justify-start"
                        }`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                          msg.sender === currentUser.uid
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p className="text-xs mt-1 text-right">
                          {format(msg.timestamp.toDate(), "HH:mm")}{" "}
                          {renderReadStatus(msg)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
              />
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>

      {/* Start Conversation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Start a Conversation</h2>

            {contactOptions.map((user) => (
              <button
                key={user.uid}
                onClick={() => startConversation(user)}
                className="w-full p-2 text-left hover:bg-gray-100 rounded mb-1"
              >
                {user.fullName || user.username || user.uid}
              </button>
            ))}

            <button
              className="mt-4 text-sm text-gray-600 hover:underline"
              onClick={() => setShowStartModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
