// src/pages/ChooseUsername.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

export default function ChooseUsername() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    const cleanUsername = username.trim().toLowerCase();
    
    if (!cleanUsername) return setError("Username cannot be empty.");
    if (cleanUsername.includes(" ")) return setError("Username cannot contain spaces.");

    setLoading(true);
    try {
      // Check uniqueness
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", cleanUsername));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setError("This username is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error("User not found");

      // Save username - App.jsx will automatically detect this and switch the view!
      await setDoc(doc(db, "users", user.uid), { 
        username: cleanUsername,
        updatedAt: new Date()
      }, { merge: true });

    } catch (err) {
      console.error(err);
      setError("Error saving username. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#f5f5f5]">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-2xl font-bold text-gray-900">Claim your username</h2>
          <p className="text-gray-500 text-sm mt-2">This is how people will find and tag you on MuZikNet.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="relative mb-6">
          <span className="absolute left-4 top-3 text-gray-400 font-bold">$</span>
          <input
            type="text"
            placeholder="your_name"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full border border-gray-300 rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition bg-gray-50"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !username}
          className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/20"
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </div>
    </div>
  );
}