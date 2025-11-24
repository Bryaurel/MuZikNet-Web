import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function Settings() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Settings</h1>

      <div className="bg-white shadow rounded-xl p-4 space-y-4 max-w-md mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          📊 Dashboard
        </button>

        <button
          onClick={() => navigate("/edit-profile")}
          className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          ✏️ Edit Profile
        </button>

        <button
          onClick={() => alert("Feature coming soon!")}
          className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          📧 Change Email Address
        </button>

        <button
          onClick={() => alert("Feature coming soon!")}
          className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          🔒 Change Password
        </button>

        <button
          onClick={() => alert("Feature coming soon!")}
          className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          👁️ Manage Profile Visibility
        </button>

        <button
          onClick={handleLogout}
          className="w-full text-left p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          🚪 Log Out
        </button>
      </div>
    </div>
  );
}

export default Settings;
