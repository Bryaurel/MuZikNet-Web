// src/components/BookingCard.jsx
import { useNavigate } from "react-router-dom";

/**
 * BookingCard - small performer card shown in Booking.jsx results
 * Props:
 * - user (object): user document (uid, fullName, photoURL, stageName, username, instruments, city, bio)
 * - currentUser (firebase user or null)
 */

export default function BookingCard({ user, currentUser }) {
  const navigate = useNavigate();

  const goToProfile = () => {
    navigate(`/user/${user.uid}`);
  };

  const instrumentsArray = Array.isArray(user.instruments)
    ? user.instruments
    : (typeof user.instruments === "string" ? user.instruments.split(",").map(x => x.trim()).filter(Boolean) : []);

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col h-full">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.username || user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  🎵
                </div>
              )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{user.stageName || user.fullName}</div>
              <div className="text-sm text-gray-500">${user.username || user.uid}</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-2 line-clamp-2">
            {user.bio || "No bio provided"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex-1">
        <div className="flex gap-2 flex-wrap">
          {instrumentsArray.slice(0,4).map(i => (
            <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded">{i}</span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={goToProfile} className="flex-1 px-3 py-2 rounded bg-white border hover:bg-gray-50">View Profile</button>
        <button onClick={() => navigate("/messages", { state: { openWithUser: user.uid } })} className="flex-1 px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Book / Message</button>
      </div>
    </div>
  );
}
