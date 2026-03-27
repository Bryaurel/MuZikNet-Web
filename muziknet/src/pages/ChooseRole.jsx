// src/pages/ChooseRole.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Mic2, Ticket, Star, ArrowRight } from "lucide-react";

export default function ChooseRole() {
  const [accountType, setAccountType] = useState(""); // "talent", "host", or "both"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!accountType) return setError("Please select an account type.");
    
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not found");

      let roles = [];
      if (accountType === "talent") roles = ["Talent"];
      if (accountType === "host") roles = ["Host"];
      if (accountType === "both") roles = ["Talent", "Host"];

      // Save roles - App.jsx will auto-detect and move them to EditProfile
      await setDoc(doc(db, "users", user.uid), { 
        roles,
        updatedAt: new Date()
      }, { merge: true });

    } catch (err) {
      console.error(err);
      setError("Error saving role. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fc] p-4">
      <div className="glass-card p-8 md:p-10 w-full max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">How will you use MuZikNet?</h2>
          <p className="text-gray-500 text-sm mt-2">This sets up your dashboard and cannot be changed later.</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-center text-sm font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Talent Card */}
          <div 
            onClick={() => setAccountType("talent")}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col h-full ${accountType === "talent" ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-500/20 scale-[1.02]" : "border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50"}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${accountType === "talent" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              <Mic2 className="w-6 h-6" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${accountType === "talent" ? "text-brand-700" : "text-gray-900"}`}>Talent</h3>
            <p className="text-sm text-gray-500 leading-relaxed flex-1">I want to showcase my music, build a portfolio, and apply to gigs and opportunities.</p>
          </div>

          {/* Host Card */}
          <div 
            onClick={() => setAccountType("host")}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col h-full ${accountType === "host" ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-500/20 scale-[1.02]" : "border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50"}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${accountType === "host" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${accountType === "host" ? "text-brand-700" : "text-gray-900"}`}>Event Host</h3>
            <p className="text-sm text-gray-500 leading-relaxed flex-1">I want to post opportunities, review applications, and book musicians for my events.</p>
          </div>

          {/* Both Card */}
          <div 
            onClick={() => setAccountType("both")}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col h-full ${accountType === "both" ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-500/20 scale-[1.02]" : "border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50"}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${accountType === "both" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              <Star className="w-6 h-6" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${accountType === "both" ? "text-brand-700" : "text-gray-900"}`}>Both</h3>
            <p className="text-sm text-gray-500 leading-relaxed flex-1">I am an artist, but I also organize events and hire other musicians.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !accountType}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition disabled:opacity-50 shadow-lg"
        >
          {loading ? "Saving..." : "Continue to Profile Setup"} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}