import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

function EditProfile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    stageName: "",
    bio: "",
    nationality: "",
    city: "",
    instruments: "",
    photoURL: "",
    username: "",
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
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
            setFormData((prev) => ({ ...prev, ...docSnap.data() }));
          }
        } catch (err) {
          console.error("Error loading profile:", err);
          setError("Error loading your profile.");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileRef = ref(storage, `profilePhotos/${user.uid}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {},
        (error) => {
          console.error(error);
          setError("Failed to upload photo.");
          setUploading(false);
        },
        async () => {
          const photoURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData((prev) => ({ ...prev, photoURL }));
          await setDoc(
            doc(db, "users", user.uid),
            { photoURL, updatedAt: new Date() },
            { merge: true }
          );
          setSuccess("Profile photo updated!");
          setUploading(false);
        }
      );
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError("Failed to upload photo.");
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("No user found. Please sign in again.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        { ...formData, updatedAt: new Date() },
        { merge: true }
      );

      setSuccess("Profile updated!");
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile.");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-700 space-x-2">
        <span className="animate-spin">🎵</span>
        <span>Loading…</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-xl relative">

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/profile")}
          className="absolute top-4 left-4 text-gray-600 hover:underline text-sm"
        >
          ← Back to Profile
        </button>

        {/* TITLE */}
        <h2 className="text-3xl font-semibold text-center mb-8">Edit Profile</h2>

        {/* ALERTS */}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-center text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-3 text-center text-sm">
            {success}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSave} className="space-y-5">

          {/* PHOTO */}
          <div className="flex flex-col items-center">
            <img
              src={formData.photoURL || "https://via.placeholder.com/100"}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover mb-2 shadow"
            />

            <label className="cursor-pointer text-blue-600 text-sm hover:underline">
              {uploading ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* FULL NAME */}
          <div>
            <label className="block text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* STAGE NAME */}
          <div>
            <label className="block text-gray-700 mb-1">Stage Name</label>
            <input
              type="text"
              name="stageName"
              value={formData.stageName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* USERNAME */}
          <div>
            <label className="block text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* BIO */}
          <div>
            <label className="block text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="3"
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            ></textarea>
          </div>

          {/* NATIONALITY */}
          <div>
            <label className="block text-gray-700 mb-1">Nationality</label>
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* CITY */}
          <div>
            <label className="block text-gray-700 mb-1">City of Residence</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* INSTRUMENTS */}
          <div>
            <label className="block text-gray-700 mb-1">Instruments / Skills</label>
            <input
              type="text"
              name="instruments"
              value={formData.instruments}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
            />
          </div>

          {/* SAVE BUTTON */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
        </form>

        <button
          onClick={() => navigate("/settings")}
          className="w-full mt-4 text-sm text-gray-600 hover:underline"
        >
          ← Back to Settings
        </button>
      </div>
    </div>
  );
}

export default EditProfile;
