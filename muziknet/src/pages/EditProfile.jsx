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
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
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
          setSuccess("Profile photo updated successfully!");
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

      setSuccess("Profile updated successfully!");
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen space-x-2 text-gray-700">
        <span className="animate-spin">🎵</span>
        <span>Loading...</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-md max-w-lg mx-auto p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Edit Profile</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-center text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-3 text-center text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col items-center">
            <img
              src={formData.photoURL || "https://via.placeholder.com/100"}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover mb-2"
            />
            <label className="cursor-pointer text-blue-500 text-sm hover:underline">
              {uploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <input
            type="text"
            name="stageName"
            value={formData.stageName}
            onChange={handleChange}
            placeholder="Stage Name (optional)"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username (unique)"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Bio"
            rows="3"
            className="w-full border border-gray-300 rounded-lg p-2"
          ></textarea>

          <input
            type="text"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            placeholder="Nationality"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City of residence"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <input
            type="text"
            name="instruments"
            value={formData.instruments}
            onChange={handleChange}
            placeholder="Instruments / Skills"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition"
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
