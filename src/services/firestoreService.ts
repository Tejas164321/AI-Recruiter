
// src/services/firestoreService.ts
import { db, auth } from '@/lib/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  setDoc,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';

import type { JobScreeningResult, AtsScoreResult, InterviewQuestionsSet } from '@/lib/types';

if (!db) {
  console.warn("Firestore service (db) is not available. Firestore operations will fail.");
}

// --- JobScreeningResult Functions ---

export const saveJobScreeningResult = async (resultData: Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>): Promise<JobScreeningResult> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const HISTORY_LIMIT = 10;

  // 1. Query for existing history for this specific job role, ordered oldest to newest.
  const historyQuery = query(
    collection(db, "jobScreeningResults"),
    where("userId", "==", userId),
    where("jobDescriptionId", "==", resultData.jobDescriptionId),
    orderBy("createdAt", "asc")
  );

  const querySnapshot = await getDocs(historyQuery);

  // 2. If the history limit is reached or exceeded, delete the oldest entries to make space.
  if (querySnapshot.size >= HISTORY_LIMIT) {
    const batch = writeBatch(db);
    // Calculate how many documents to delete. +1 because we're about to add a new one.
    const numToDelete = querySnapshot.size - HISTORY_LIMIT + 1;
    const docsToDelete = querySnapshot.docs.slice(0, numToDelete);
    
    docsToDelete.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
  }
  
  // 3. Add the new screening result document.
  const docRef = await addDoc(collection(db, "jobScreeningResults"), {
    ...resultData,
    userId,
    createdAt: serverTimestamp(),
  });

  // 4. Return the new result object for immediate use in the UI.
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

export const deleteAtsScoreResult = async (resultId: string): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const docRef = doc(db, "atsScoreResults", resultId);
  // Security is handled by Firestore rules, but you could add a check here to ensure the user owns this doc if needed.
  await deleteDoc(docRef);
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
