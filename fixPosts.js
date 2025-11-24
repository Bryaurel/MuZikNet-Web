import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// 1️⃣ Configure your Firebase
const firebaseConfig = {
    apiKey: "AIzaSyArAG2-c8PoqUz445PXsFo3XEwvFkin0PI",
    authDomain: "muziknet-bbba.firebaseapp.com",
    projectId: "muziknet-bbba",
    storageBucket: "muziknet-bbba.firebasestorage.app",
    messagingSenderId: "138178666401",
    appId: "1:138178666401:web:4926759e4a5d82a991b5e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixPosts() {
    const postsCol = collection(db, "posts");
    const snapshot = await getDocs(postsCol);
    
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const updates = {};
        if (!Array.isArray(data.likes)) updates.likes = [];
        if (!Array.isArray(data.comments)) updates.comments = [];
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "posts", docSnap.id), updates);
            console.log(`Fixed post ${docSnap.id}`);
        }
    }
    
    console.log("All posts fixed ✅");
}

fixPosts().catch(console.error);
