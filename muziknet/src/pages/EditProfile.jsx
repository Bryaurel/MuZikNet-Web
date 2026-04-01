// src/pages/EditProfile.jsx
import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Upload, Check, X, Loader2 } from "lucide-react";
import { PRICE_RANGES } from "../components/BookingFilters";

function EditProfile({ isOnboarding = false }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    stageName: "",
    username: "", 
    bio: "",
    city: "",
    instruments: "",
    photoURL: "",
    roles: [], 
    priceRange: "", // ADDED FIELD
  });

  const [initialUsername, setInitialUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle"); 
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
            setFormData((prev) => ({ 
              ...prev, 
              ...data,
              fullName: data.fullName || currentUser.displayName || "" 
            }));
            setInitialUsername(data.username || "");
          }
        } catch (err) {
          console.error("Error loading profile:", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time unique username check
  useEffect(() => {
    if (!formData.username || formData.username === initialUsername) {
      setUsernameStatus("idle");
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus("checking");
      const q = query(collection(db, "users"), where("username", "==", formData.username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus("taken");
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, initialUsername]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "username") {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase().replace(/\s/g, "") }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileRef = ref(storage, `profilePhotos/${user.uid}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const photoURL = await getDownloadURL(uploadTask.ref);
      setFormData((prev) => ({ ...prev, photoURL }));
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });
    } catch (err) {
      setError("Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.username.trim()) return setError("Username is required.");
    if (usernameStatus === "taken") return setError("Username is already taken.");
    if (!formData.stageName.trim()) return setError("Stage Name is required.");

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { ...formData, updatedAt: new Date() }, { merge: true });
      if (!isOnboarding) navigate("/profile");
    } catch (err) {
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

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isOnboarding ? "Finish your setup" : "Edit Profile"}
          </h2>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-center text-sm font-medium border border-red-100">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <img
                src={formData.photoURL || "https://via.placeholder.com/150"}
                alt="Profile"
                className="w-full h-full rounded-full object-cover shadow-sm border-4 border-white bg-gray-100"
              />
              <label className="absolute bottom-0 right-0 cursor-pointer bg-brand-600 text-white p-2 rounded-full shadow-lg hover:bg-brand-700 transition">
                <Upload className="w-4 h-4"/>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            {uploading && <p className="text-xs text-brand-600 font-bold animate-pulse">Uploading photo...</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username *</label>
              <div className="relative">
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username} 
                  onChange={handleChange} 
                  placeholder="unique_username"
                  className={`w-full border rounded-xl p-3 bg-gray-50 focus:bg-white outline-none transition-all text-sm ${
                    usernameStatus === 'taken' ? 'border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-brand-500'
                  }`} 
                  required 
                />
                <div className="absolute right-3 top-3">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {usernameStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                  {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 mt-1 font-bold">This username is already taken.</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stage Name *</label>
              <input type="text" name="stageName" value={formData.stageName} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Instruments & Skills</label>
              <input type="text" name="instruments" value={formData.instruments} onChange={handleChange} placeholder="e.g. Guitar, Vocals" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
            </div>
            
            {/* PRICE RANGE SELECTION (Only for Talents) */}
            {formData.roles?.includes("Talent") && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Standard Rate per Gig</label>
                <select 
                  name="priceRange" 
                  value={formData.priceRange} 
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                >
                  <option value="">Select a rate</option>
                  {PRICE_RANGES.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm resize-none"></textarea>
          </div>

          <button type="submit" className="w-full bg-brand-600 text-white font-bold rounded-xl py-4 hover:bg-brand-700 transition shadow-lg shadow-brand-500/30">
            {isOnboarding ? "Complete Setup" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;