// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore";
import { Settings, Edit3, Music, Briefcase, Plus, Users, Image as ImageIcon, MapPin, Zap, DollarSign } from "lucide-react";
import DefaultAvatar from "../components/DefaultAvatar";

function Profile() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("artist"); // 'artist' or 'organizer'
  
  const [profile, setProfile] = useState({
    fullName: "",
    stageName: "",
    bio: "",
    city: "",
    instruments: "",
    photoURL: "",
    username: "",
    roles: [],
    availableNow: false
  });

  const [stats, setStats] = useState({
    posts: 0,
    opportunities: 0,
    followers: 0,
    following: 0,
  });

  const [posts, setPosts] = useState([]);
  const [myOpportunities, setMyOpportunities] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Real-time profile listener
    const profileRef = doc(db, "users", user.uid);
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile((prev) => ({ ...prev, ...data }));
        
        // Logical Redirect: If user is ONLY a Host, force them to Organizer view
        if (data.roles?.includes("Host") && !data.roles?.includes("Talent")) {
            setViewMode("organizer");
        }
      }
    });

    const fetchData = async () => {
      try {
        const postsQ = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const oppsQ = query(collection(db, "opportunities"), where("createdBy", "==", user.uid), orderBy("createdAt", "desc"));
        
        const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
        const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));

        onSnapshot(postsQ, (snap) => {
          const fetchedPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPosts(fetchedPosts);
          setStats(s => ({ ...s, posts: fetchedPosts.length }));
        });

        onSnapshot(oppsQ, (snap) => {
          const fetchedOpps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMyOpportunities(fetchedOpps);
          setStats(s => ({ ...s, opportunities: fetchedOpps.length }));
        });

        setStats(s => ({
          ...s,
          followers: followersSnap.size,
          following: followingSnap.size,
        }));

      } catch (err) {
        console.error("Error fetching profile data:", err);
      }
    };

    fetchData();
    return () => unsubProfile();
  }, []);

  const toggleAvailability = async () => {
    if(!auth.currentUser) return;
    const newStatus = !profile.availableNow;
    setProfile(prev => ({ ...prev, availableNow: newStatus })); 
    
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        availableNow: newStatus
      });
    } catch (err) {
      console.error("Error updating availability", err);
      setProfile(prev => ({ ...prev, availableNow: !newStatus }));
    }
  };

  const instrumentsArray = Array.isArray(profile.instruments)
    ? profile.instruments
    : typeof profile.instruments === "string" && profile.instruments.trim().length > 0
      ? profile.instruments.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const isTalent = profile.roles?.includes("Talent");
  const isHost = profile.roles?.includes("Host");
  const isBoth = isTalent && isHost;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      <div className="glass-card p-6 md:p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center">
          
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex-shrink-0">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.stageName} className="w-full h-full object-cover" />
            ) : (
              <DefaultAvatar className="w-full h-full text-4xl" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {profile.stageName || profile.fullName || "Loading..."}
                </h1>
                <p className="text-brand-600 font-medium text-sm mt-1">
                  ${profile.username || "unknown"}
                </p>

                {/* Primary Role Badge (Green) */}
                <div className="mt-3">
                  {isBoth ? (
                    <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      Talent & Host
                    </span>
                  ) : isHost ? (
                    <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      Host
                    </span>
                  ) : isTalent ? (
                    <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      Talent
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => navigate("/edit-profile")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => navigate("/settings")} className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 mt-4 leading-relaxed max-w-2xl text-sm md:text-base">
              {profile.bio || "No bio provided. Update your profile to tell the world about your music!"}
            </p>

            <div className="flex flex-wrap gap-2 mt-4 items-center">
              {profile.city && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  <MapPin className="w-3 h-3" /> {profile.city}
                </span>
              )}
              {profile.priceRange && isTalent && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <DollarSign className="w-3 h-3" /> {profile.priceRange} / gig
                </span>
              )}
              {instrumentsArray.slice(0, 3).map((skill, idx) => (
                <span key={idx} className="text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                  {skill}
                </span>
              ))}   
            </div>

            {/* Availability Toggle - Only for Talents */}
            {isTalent && (
                <div className="mt-5 inline-flex items-center gap-3 p-1.5 pr-4 bg-gray-50 rounded-full border border-gray-200">
                <button 
                    onClick={toggleAvailability}
                    className={`w-11 h-6 rounded-full transition-colors relative shadow-inner ${profile.availableNow ? 'bg-amber-500' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${profile.availableNow ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </button>
                <div className="flex items-center gap-1.5">
                    <Zap className={`w-4 h-4 ${profile.availableNow ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
                    <span className={`text-sm font-bold ${profile.availableNow ? "text-amber-600" : "text-gray-500"}`}>
                    {profile.availableNow ? "Available Right Now" : "Not Available"}
                    </span>
                </div>
                </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="text-center"><div className="text-xl font-bold text-gray-900">{stats.followers}</div><div className="text-xs text-gray-500 uppercase tracking-wide">Followers</div></div>
          <div className="text-center"><div className="text-xl font-bold text-gray-900">{stats.following}</div><div className="text-xs text-gray-500 uppercase tracking-wide">Following</div></div>
          <div className="text-center"><div className="text-xl font-bold text-gray-900">{stats.posts}</div><div className="text-xs text-gray-500 uppercase tracking-wide">Posts</div></div>
          <div className="text-center"><div className="text-xl font-bold text-gray-900">{stats.opportunities}</div><div className="text-xs text-gray-500 uppercase tracking-wide">Hosted</div></div>
        </div>
      </div>

      {/* View Switcher - Only for "Both" */}
      {isBoth && (
        <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-full inline-flex relative shadow-inner">
            <button
                onClick={() => setViewMode("artist")}
                className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${viewMode === "artist" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
            >
                <Music className="w-4 h-4" /> Artist Portfolio
            </button>
            <button
                onClick={() => setViewMode("organizer")}
                className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${viewMode === "organizer" ? "text-white" : "text-gray-500 hover:text-gray-900"}`}
            >
                <Briefcase className="w-4 h-4" /> Organizer Dashboard
            </button>
            
            <div 
                className="absolute top-1 bottom-1 w-1/2 bg-brand-600 rounded-full transition-transform duration-300 ease-in-out shadow-sm"
                style={{ transform: viewMode === "artist" ? "translateX(0%)" : "translateX(100%)", left: "4px", width: "calc(50% - 4px)" }}
            ></div>
            </div>
        </div>
      )}

      {/* Dynamic Content Area */}
      {viewMode === "artist" ? (
        <div className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-brand-500"/> Media & Performances</h2>
            <button onClick={() => navigate("/new-post")} className="flex items-center gap-1 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-full transition">
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4">📸</div>
              <h3 className="text-lg font-semibold text-gray-900">No posts yet</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  onClick={() => navigate(`/post/${post.id}`, { state: { fromProfile: true, posts } })} 
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-pointer shadow-soft"
                >
                  {(post.mediaType === "video" || post.mediaURLs?.[0]?.match(/\.(mp4|mov|webm)/i)) ? (
                    <video 
                      src={post.mediaURLs[0]} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      muted 
                      playsInline
                      loop
                      onMouseEnter={(e) => e.target.play().catch(() => {})} 
                      onMouseLeave={(e) => e.target.pause()}
                    />
                  ) : (
                    <img 
                      src={post.mediaURLs?.[0] || ""} 
                      alt="Post" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-500"/> Hosted Opportunities</h2>
            <button onClick={() => navigate("/opportunities/new")} className="flex items-center gap-1 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-full transition">
              <Plus className="w-4 h-4" /> Post Gig
            </button>
          </div>

          {myOpportunities.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl mb-4">🎪</div>
              <h3 className="text-lg font-semibold text-gray-900">No events hosted</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myOpportunities.map(opp => (
                <div key={opp.id} className="glass-card p-5 hover:border-brand-300 flex flex-col">
                   <h3 className="font-bold text-gray-900 text-lg leading-tight">{opp.title}</h3>
                   <p className="text-sm text-gray-500 mt-1">{opp.status} • {opp.location}</p>
                   <button onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-brand-600 text-sm font-semibold mt-4 text-left">Manage Applicants →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;