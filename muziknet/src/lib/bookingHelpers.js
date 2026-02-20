// src/lib/bookingHelpers.js
import { addDoc, collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * createBookingRequest - creates a booking doc and sends an initial message (creates conversation if needed)
 * params:
 *  - requesterUser (object) { uid, displayName }
 *  - performerUid (string)
 *  - { title, start, end, price, message }
 *
 * Returns booking id and convoId used for messaging.
 */
export async function createBookingRequest(requesterUser, performerUid, payload) {
  // create booking doc
  const bookingDoc = {
    requesterUserId: requesterUser.uid,
    performerUserId: performerUid,
    title: payload.title || "Booking request",
    start: payload.start ? new Date(payload.start) : null,
    end: payload.end ? new Date(payload.end) : null,
    price: payload.price || null,
    message: payload.message || "",
    status: "pending",
    createdAt: serverTimestamp(),
  };

  const createdRef = await addDoc(collection(db, "bookings"), bookingDoc);
  const bookingId = createdRef.id;

  // create/open conversation
  const uids = [requesterUser.uid, performerUid].sort();
  const convoId = `${uids[0]}_${uids[1]}`;
  const convoRef = doc(db, "conversations", convoId);

  await setDoc(convoRef, {
    participants: uids,
    lastMessage: bookingDoc.message || "Booking request",
    lastTimestamp: serverTimestamp(),
  }, { merge: true });

  // add initial message to subcollection
  await addDoc(collection(db, "conversations", convoId, "messages"), {
    sender: requesterUser.uid,
    text: `Booking request: ${bookingDoc.title}\n${bookingDoc.message || ""}`,
    timestamp: serverTimestamp(),
    seenBy: [requesterUser.uid],
    meta: {
      bookingRef: bookingId
    }
  });

  return { bookingId, convoId };
}
