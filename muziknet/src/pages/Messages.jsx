import { useState } from "react";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(0);

  const contacts = [
    { id: 0, name: "Contact 1", lastMessage: "Hey, how are you?" },
    { id: 1, name: "Contact 2", lastMessage: "Let's meet tomorrow." },
    { id: 2, name: "Contact 3", lastMessage: "Check this out!" },
    { id: 3, name: "Contact 4", lastMessage: "Okay, thanks!" },
    { id: 4, name: "Contact 5", lastMessage: "See you soon." },
  ];

  const messages = [
    { from: "them", text: "Hey! How are you doing?" },
    { from: "me", text: "I'm good, just working on my project." },
    { from: "them", text: "Nice! Keep it up." },
  ];

  return (
    <div className="flex h-[75vh] border rounded-lg overflow-hidden bg-white">

      {/* LEFT SIDEBAR — CONTACTS */}
      <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
        <h2 className="p-4 font-bold text-xl text-gray-700">Messages</h2>

        {contacts.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedChat(c.id)}
            className={`p-3 cursor-pointer 
            hover:bg-gray-200 transition 
            ${selectedChat === c.id ? "bg-gray-200" : "bg-gray-50"}`}
          >
            <p className="font-semibold text-gray-800">{c.name}</p>
            <p className="text-sm text-gray-500 truncate">{c.lastMessage}</p>
          </div>
        ))}
      </div>

      {/* MAIN CHAT WINDOW */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <p className="font-semibold text-gray-800 text-lg">
            {contacts[selectedChat].name}
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-xs p-3 rounded-lg text-sm shadow 
              ${msg.from === "me" 
                ? "bg-blue-500 text-white ml-auto" 
                : "bg-white text-gray-800"}`}
            >
              {msg.text}
            </div>
          ))}

        </div>

        {/* Input Bar */}
        <div className="p-3 border-t flex gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
          />
          <button className="bg-blue-500 text-white px-5 py-2 rounded-full hover:bg-blue-600">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
