import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { Mic2, Ticket, Star, ArrowLeft, Upload } from "lucide-react";

function EditProfile({ isOnboarding = false }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    stageName: "",
    bio: "",
    city: "",
    instruments: "",
    photoURL: "",
    roles: [], 
  });

  const [accountType, setAccountType] = useState(""); // "talent", "host", or "both"
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const savedRoles = data.roles || [];
            
            // Map existing roles back to the UI selection
            if (savedRoles.includes("Talent") && savedRoles.includes("Host")) setAccountType("both");
            else if (savedRoles.includes("Talent")) setAccountType("talent");
            else if (savedRoles.includes("Host")) setAccountType("host");

            setFormData((prev) => ({ 
              ...prev, 
              ...data,
              roles: savedRoles,
              fullName: data.fullName || currentUser.displayName || "" 
            }));
          }
        } catch (err) {
          console.error("Error loading profile:", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleSelect = (type) => {
    setAccountType(type);
    if (type === "talent") setFormData(prev => ({ ...prev, roles: ["Talent"] }));
    if (type === "host") setFormData(prev => ({ ...prev, roles: ["Host"] }));
    if (type === "both") setFormData(prev => ({ ...prev, roles: ["Talent", "Host"] }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileRef = ref(storage, `profilePhotos/${user.uid}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on("state_changed", null, (error) => {
          console.error(error);
          setError("Failed to upload photo.");
          setUploading(false);
        },
        async () => {
          const photoURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData((prev) => ({ ...prev, photoURL }));
          await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });
          setUploading(false);
        }
      );
    } catch (err) {
      setError("Failed to upload photo.");
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.stageName.trim()) return setError("Stage Name / Display Name is required.");
    if (formData.roles.length === 0) return setError("Please select how you want to use MuZikNet.");

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { ...formData, updatedAt: new Date() }, { merge: true });
      
      if (!isOnboarding) navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile.");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#f8f9fc] text-brand-600 animate-pulse text-4xl">🎵</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-4 md:p-6 flex justify-center items-center">
      <div className="glass-card p-6 md:p-10 w-full max-w-3xl relative">
        
        {!isOnboarding && (
          <button onClick={() => navigate("/profile")} className="absolute top-6 left-6 text-gray-400 hover:text-brand-600 transition flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="text-center mb-8 mt-4 md:mt-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isOnboarding ? "Set up your profile" : "Edit Profile"}
          </h2>
          {isOnboarding && <p className="text-gray-500 mt-2">Choose how you want to use the platform.</p>}
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-center text-sm font-medium">{error}</div>}

        <form onSubmit={handleSave} className="space-y-8">

          <div className="border-t border-gray-100 pt-8">
            <div className="flex flex-col md:flex-row gap-8">
              
              {/* PHOTO UPLOAD */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative w-32 h-32 mb-4">
                  <img
                    src={formData.photoURL || "https://via.placeholder.com/150"}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover shadow-sm border-4 border-white bg-gray-100"
                  />
                </div>
                <label className="cursor-pointer flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-semibold hover:bg-gray-50 transition shadow-sm">
                  {uploading ? "Uploading..." : <><Upload className="w-3.5 h-3.5"/> Change Photo</>}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              {/* TEXT FIELDS */}
              <div className="flex-1 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stage / Display Name *</label>
                    <input type="text" name="stageName" value={formData.stageName} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">City of Residence</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Kigali, Rwanda" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Instruments & Skills (Top 3)</label>
                  <input type="text" name="instruments" value={formData.instruments} onChange={handleChange} placeholder="e.g. Singer, Guitar, Sound Engineer" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" placeholder="Tell the community about yourself..." className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm resize-none"></textarea>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-600 text-white font-bold rounded-xl py-4 hover:bg-brand-700 transition shadow-lg shadow-brand-500/30">
            {isOnboarding ? "Complete Setup & Enter Platform" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;