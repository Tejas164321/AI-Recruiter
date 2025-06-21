
// src/services/firestoreService.ts
import { db, auth } from '@/lib/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  setDoc,
  orderBy,
  limit,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

import type { ExtractedJobRole, JobScreeningResult, AtsScoreResult, InterviewQuestionsSet, ResumeFile } from '@/lib/types';

if (!db) {
  console.warn("Firestore service (db) is not available. Firestore operations will fail.");
}

// --- ExtractedJobRole Functions ---

export const saveExtractedJobRole = async (jobRoleData: Omit<ExtractedJobRole, 'id' | 'userId' | 'createdAt'>): Promise<ExtractedJobRole> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const docRef = await addDoc(collection(db, "extractedJobRoles"), {
    ...jobRoleData,
    userId,
    createdAt: serverTimestamp(),
  });
  return { ...jobRoleData, id: docRef.id, userId, createdAt: Timestamp.now() } as ExtractedJobRole;
};

export const saveMultipleExtractedJobRoles = async (jobRolesData: Array<Omit<ExtractedJobRole, 'id' | 'userId' | 'createdAt'>>): Promise<ExtractedJobRole[]> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const savedRoles: ExtractedJobRole[] = [];

  for (const roleData of jobRolesData) {
    const docRef = await addDoc(collection(db, "extractedJobRoles"), {
      ...roleData,
      userId,
      createdAt: serverTimestamp(),
    });
    savedRoles.push({ ...roleData, id: docRef.id, userId, createdAt: Timestamp.now() } as ExtractedJobRole);
  }
  return savedRoles;
};


export const getExtractedJobRoles = async (): Promise<ExtractedJobRole[]> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "extractedJobRoles"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExtractedJobRole));
};

export const deleteExtractedJobRole = async (roleId: string): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  // Also delete associated screening results
  const screeningResultsQuery = query(collection(db, "jobScreeningResults"), where("jobDescriptionId", "==", roleId), where("userId", "==", auth.currentUser.uid));
  const screeningResultsSnapshot = await getDocs(screeningResultsQuery);
  const deletePromises = screeningResultsSnapshot.docs.map(docSnapshot => deleteDoc(doc(db, "jobScreeningResults", docSnapshot.id)));
  await Promise.all(deletePromises);

  await deleteDoc(doc(db, "extractedJobRoles", roleId));
};

// --- JobScreeningResult Functions ---

export const saveJobScreeningResult = async (resultData: Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>): Promise<JobScreeningResult> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  
  // Always add a new document for each screening, creating a historical record.
  const docRef = await addDoc(collection(db, "jobScreeningResults"), {
    ...resultData,
    userId,
    createdAt: serverTimestamp(),
  });
  return { ...resultData, id: docRef.id, userId, createdAt: Timestamp.now() } as JobScreeningResult;
};

export const getAllJobScreeningResultsForUser = async (): Promise<JobScreeningResult[]> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "jobScreeningResults"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobScreeningResult));
};


// --- AtsScoreResult Functions ---

export const saveAtsScoreResult = async (resultData: Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>): Promise<AtsScoreResult> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const docRef = await addDoc(collection(db, "atsScoreResults"), {
    ...resultData,
    userId,
    createdAt: serverTimestamp(),
  });
  return { ...resultData, id: docRef.id, userId, createdAt: Timestamp.now() } as AtsScoreResult;
};

export const saveMultipleAtsScoreResults = async (resultsData: Array<Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>>): Promise<AtsScoreResult[]> => {
    if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
    const userId = auth.currentUser.uid;
    const savedResults: AtsScoreResult[] = [];

    for (const result of resultsData) {
        const docRef = await addDoc(collection(db, "atsScoreResults"), {
            ...result,
            userId,
            createdAt: serverTimestamp(),
        });
        savedResults.push({ ...result, id: docRef.id, userId, createdAt: Timestamp.now() } as AtsScoreResult);
    }
    return savedResults;
};

export const getAtsScoreResults = async (): Promise<AtsScoreResult[]> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "atsScoreResults"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AtsScoreResult));
};

// --- InterviewQuestionsSet Functions ---

export const saveInterviewQuestionsSet = async (setData: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'>): Promise<InterviewQuestionsSet> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;

  // Check if a question set for this roleTitle already exists for this user
  const q = query(
    collection(db, "interviewQuestionsSets"),
    where("userId", "==", userId),
    where("roleTitle", "==", setData.roleTitle),
    limit(1)
  );
  const existingDocs = await getDocs(q);

  if (!existingDocs.empty) {
    const docToUpdate = existingDocs.docs[0];
    await setDoc(doc(db, "interviewQuestionsSets", docToUpdate.id), {
      ...setData,
      userId,
      createdAt: serverTimestamp(), // or update an 'updatedAt' field
    }, { merge: true });
    return { ...setData, id: docToUpdate.id, userId, createdAt: Timestamp.now() } as InterviewQuestionsSet;
  } else {
    const docRef = await addDoc(collection(db, "interviewQuestionsSets"), {
      ...setData,
      userId,
      createdAt: serverTimestamp(),
    });
    return { ...setData, id: docRef.id, userId, createdAt: Timestamp.now() } as InterviewQuestionsSet;
  }
};

export const getInterviewQuestionsSetByTitle = async (roleTitle: string): Promise<InterviewQuestionsSet | null> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(
    collection(db, "interviewQuestionsSets"), 
    where("userId", "==", userId), 
    where("roleTitle", "==", roleTitle),
    orderBy("createdAt", "desc"), 
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const docData = querySnapshot.docs[0].data();
  return { id: querySnapshot.docs[0].id, ...docData } as InterviewQuestionsSet;
};

// It might be useful to also have a function to get all sets for a user if you build a "history" view
export const getAllInterviewQuestionsSetsForUser = async (): Promise<InterviewQuestionsSet[]> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "interviewQuestionsSets"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterviewQuestionsSet));
};
