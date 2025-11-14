import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db, provider } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();

  // Handle text input changes
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle normal email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password);

      // Prevent unverified users from logging in
      if (!user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        setShowResend(true);
        return;
      }

      navigate("/"); // Redirect to homepage after login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Ensure user document exists or update it in Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: user.displayName,
          email: user.email,
          photoURL: user.photoURL || "",
          lastLogin: new Date(),
        },
        { merge: true }
      );

      navigate("/"); // Redirect to homepage after Google login
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err.message);
    }
  };

  // Resend email verification
  const handleResendVerification = async () => {
    setError("");
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setError("Verification email sent! Please check your inbox.");
        setShowResend(false); // Hide button after sending
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>

        {/* Display error messages */}
        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-center text-sm">
            {error}
          </div>
        )}

        {/* Email/Password Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Resend verification button */}
        {showResend && (
          <button
            onClick={handleResendVerification}
            className="mt-2 w-full text-sm text-blue-500 hover:underline"
          >
            Resend verification email
          </button>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>

        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
