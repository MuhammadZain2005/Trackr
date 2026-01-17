import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const applicationsRef = collection(db, "applications");

// ✅ CREATE (matches your Firestore fields)
export async function createApplication(data) {
  const payload = {
    applicationID: "", // optional; Firestore doc id is usually enough
    companyName: data.companyName ?? "",
    positionTitle: data.positionTitle ?? "",
    location: data.location ?? "",
    compensation: data.compensation ?? "",
    ApplicationPlatform: data.ApplicationPlatform ?? "LinkedIn",
    WorkMode: data.WorkMode ?? "In-person",
    JobDuration: data.JobDuration ?? "",

    // timestamps (your DB uses timestamps)
    dateApplied: data.dateApplied
      ? Timestamp.fromDate(new Date(data.dateApplied)) // expects "YYYY-MM-DD"
      : serverTimestamp(),

    FollowUpDate: data.FollowUpDate
      ? Timestamp.fromDate(new Date(data.FollowUpDate))
      : null,

    // resume + status (your DB uses these names)
    ResumeMode: data.ResumeMode ?? "Master",
    TailoredResumeID: data.TailoredResumeID ?? "",
    Status: data.Status ?? "applied",

    createdAt: serverTimestamp(),
    UpdatedAt: serverTimestamp(),
  };

  const res = await addDoc(applicationsRef, payload);

  // OPTIONAL: store doc id into applicationID if you want it visible in doc fields
  // await updateDoc(doc(db, "applications", res.id), { applicationID: res.id });

  return res.id;
}

// ✅ READ list (order by UpdatedAt like your schema)
export async function getApplications() {
  const q = query(applicationsRef, orderBy("UpdatedAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// ✅ UPDATE status (your field is Status)
export async function updateApplicationStatus(id, newStatus) {
  const ref = doc(db, "applications", id);
  await updateDoc(ref, {
    Status: newStatus,
    UpdatedAt: serverTimestamp(),
  });
}

// ✅ General update (notes, follow-up date, etc.)
export async function updateApplication(id, patch) {
  const ref = doc(db, "applications", id);
  await updateDoc(ref, {
    ...patch,
    UpdatedAt: serverTimestamp(),
  });
}
