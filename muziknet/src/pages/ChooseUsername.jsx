import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ChooseUsername() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    setError("");
    if (!username) return setError("Username cannot be empty.");

    setLoading(true);
    try {
      // Check uniqueness
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setError("Username already taken. Choose another.");
        setLoading(false);
        return;
      }

      // Save username
      const user = auth.currentUser;
      if (!user) throw new Error("User not found");

      await setDoc(doc(db, "users", user.uid), { username }, { merge: true });

      navigate("/edit-profile"); // go to profile edit next
    } catch (err) {
      console.error(err);
      setError("Error saving username. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Choose Your Username</h2>
        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-center text-sm">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.trim())}
          className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Username"}
        </button>
      </div>
    </div>
  );
}
