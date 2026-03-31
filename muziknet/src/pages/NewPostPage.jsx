// src/pages/NewPostPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Image as ImageIcon, Video, UploadCloud, X, ArrowLeft, Loader2 } from "lucide-react";

export default function NewPostPage() {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) setUserData(snap.data());
    };
    fetchUserData();
  }, [user]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const combined = [...files, ...selectedFiles].slice(0, 4); // Max 4 files
    setFiles(combined);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 && !caption.trim()) {
      return alert("Please add a photo, video, or caption.");
    }
    if (!userData) return alert("User data loading. Please wait.");

    setLoading(true);

    try {
      const uploadedURLs = [];
      for (const file of files) {
        const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file, { contentType: file.type });
        const url = await getDownloadURL(fileRef);
        uploadedURLs.push(url);
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        username: userData.username || "",
        profilePhoto: userData.photoURL || "",
        userStageName: userData.stageName || "",
        caption: caption.trim() || "",
        mediaURLs: uploadedURLs,
        mediaType: files.length > 0 && files[0].type.startsWith("video/") ? "video" : "image",
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      navigate("/profile");
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Error creating post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 transition-colors font-medium">
        <ArrowLeft className="w-5 h-5" /> Cancel
      </button>

      <div className="glass-card p-6 md:p-10">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create New Post</h2>
          <p className="text-gray-500 mt-1">Share your latest performance, behind-the-scenes, or announcements.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Caption Input */}
          <div>
            <textarea
              placeholder="What's on your mind? Tell your fans..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none text-gray-700"
              rows={4}
            />
          </div>

          {/* Media Upload Area */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Media (Max 4)</label>
            
            {files.length < 4 && (
              <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:bg-gray-50 transition-colors bg-white group">
                <div className="flex gap-4 mb-3 text-brand-300 group-hover:text-brand-500 transition-colors">
                  <ImageIcon className="w-8 h-8" />
                  <Video className="w-8 h-8" />
                </div>
                <span className="text-sm font-bold text-gray-700">Click to upload photos or videos</span>
                <span className="text-xs text-gray-400 mt-1">MP4, JPG, PNG (Max 50MB)</span>
                <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
              </label>
            )}

            {/* Media Preview Grid */}
            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {files.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black shadow-sm group">
                    {file.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                    ) : (
                      <video src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                    )}
                    <button type="button" onClick={() => removeFile(i)} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</> : <><UploadCloud className="w-5 h-5" /> Share Post</>}
          </button>
        </form>
      </div>
    </div>
  );
}