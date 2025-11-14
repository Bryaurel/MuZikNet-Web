import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const NewPostPage = () => {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    // Keep existing files + new ones, but max 3
    const combinedFiles = [...files, ...selectedFiles].slice(0, 3);

    setFiles(combinedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Please select at least one image or video before posting.");
      return;
    }

    setLoading(true);
    try {
      const uploadedURLs = [];

      // Upload all selected media files
      for (const file of files) {
        const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        uploadedURLs.push(url);
      }

      // Add post to Firestore
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        caption: caption.trim() || "",
        mediaURLs: uploadedURLs,
        createdAt: serverTimestamp(),
      });

      // Clear state before redirect
      setFiles([]);
      setCaption("");

      navigate("/profile");
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Error creating post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    // Allow user to remove a file from selection
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-semibold text-center mb-4">Create New Post</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* File input */}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
        />

        {/* Preview section */}
        <div className="flex flex-wrap gap-3 justify-center">
          {files.map((file, i) => (
            <div key={i} className="relative w-32 h-32 border rounded overflow-hidden">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  className="w-full h-full object-cover"
                />
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Caption input */}
        <textarea
          placeholder="Add a caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="border rounded p-2"
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
};

export default NewPostPage;
