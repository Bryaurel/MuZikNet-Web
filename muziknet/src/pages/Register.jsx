import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db, provider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Mail, ArrowRight } from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      await updateProfile(user, { displayName: formData.fullName });

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          fullName: formData.fullName,
          email: formData.email,
          createdAt: new Date(),
        });
      }

      await sendEmailVerification(user);
      
      // REMOVED await signOut(auth) - This keeps the success state active
      setIsRegistered(true); 
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: user.displayName,
          email: user.email,
          photoURL: user.photoURL || "",
          createdAt: new Date(),
        },
        { merge: true }
      );

      navigate("/edit-profile"); 
    } catch (err) {
      console.error("Google sign-up error:", err);
      setError(err.message);
    }
  };

  // SUCCESS SCREEN UI
  if (isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fc] p-4">
        <div className="glass-card p-10 max-w-md w-full text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Mail className="w-10 h-10 text-brand-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Check your inbox</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            We've sent a verification link to <span className="font-semibold text-gray-700">{formData.email}</span>. Please verify your email to access MuZikNet.
          </p>
          <Link 
            to="/login"
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 transition shadow-md shadow-brand-500/20"
          >
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // STANDARD REGISTRATION FORM
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fc] p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Join MuZik<span className="text-brand-500">Net</span></h2>
          <p className="text-gray-500 text-sm mt-1">Create an account to connect and collaborate.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-6 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
          />
          <input
            type="password"
            name="password"
            placeholder="Create a Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-gray-900 text-white font-semibold py-3.5 rounded-xl hover:bg-black transition disabled:opacity-50 shadow-lg"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">Or continue with</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition text-sm font-medium text-gray-700"
        >
          <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="text-sm text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;