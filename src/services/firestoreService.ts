
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

// A warning is logged if Firestore was not initialized correctly.
if (!db) {
  console.warn("Firestore service (db) is not available. Firestore operations will fail.");
}

// --- JobScreeningResult Functions ---

/**
 * Saves a new job screening result to Firestore and manages history limits.
 * It ensures that only the most recent 10 screening sessions per job role are kept.
 * @param {Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>} resultData - The data for the new screening result.
 * @returns {Promise<JobScreeningResult>} A promise that resolves with the newly created and saved result object.
 */
export const saveJobScreeningResult = async (resultData: Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>): Promise<JobScreeningResult> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const HISTORY_LIMIT = 20;

  // 1. Query for existing history for this specific job role, ordered oldest to newest.
  const historyQuery = query(
    collection(db, "jobScreeningResults"),
    where("userId", "==", userId),
    where("jobDescriptionId", "==", resultData.jobDescriptionId),
    orderBy("createdAt", "asc")
  );
  const querySnapshot = await getDocs(historyQuery);

  // 2. If the history limit is reached, delete the oldest entries to make space for the new one.
  if (querySnapshot.size >= HISTORY_LIMIT) {
    const batch = writeBatch(db);
    const numToDelete = querySnapshot.size - HISTORY_LIMIT + 1;
    const docsToDelete = querySnapshot.docs.slice(0, numToDelete);
    docsToDelete.forEach(docSnapshot => batch.delete(docSnapshot.ref));
    await batch.commit();
  }
  
  // 3. Add the new screening result document.
  const docRef = await addDoc(collection(db, "jobScreeningResults"), {
    ...resultData,
    userId,
    createdAt: serverTimestamp(), // Use server timestamp for consistency.
  });

  // 4. Return the new result object for immediate use in the UI.
  return { ...resultData, id: docRef.id, userId, createdAt: Timestamp.now() } as JobScreeningResult;
};

/**
 * Fetches all job screening results for the currently logged-in user.
 * @returns {Promise<JobScreeningResult[]>} A promise that resolves with an array of screening results.
 */
export const getAllJobScreeningResultsForUser = async (): Promise<JobScreeningResult[]> => {
  if (!db || !auth?.currentUser) {
    console.error("getAllJobScreeningResultsForUser: Firestore or Auth not available/User not logged in.");
    return [];
  };
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "jobScreeningResults"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobScreeningResult));
};

/**
 * Deletes a specific job screening result from Firestore.
 * @param {string} resultId - The ID of the document to delete.
 */
export const deleteJobScreeningResult = async (resultId: string): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const docRef = doc(db, "jobScreeningResults", resultId);
  await deleteDoc(docRef);
};


/**
 * Deletes all job screening results for the currently logged-in user.
 * This operation is performed in batches to handle large numbers of documents safely.
 */
export const deleteAllJobScreeningResults = async (): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "jobScreeningResults"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return; // Nothing to delete.

  const batches = [];
  let currentBatch = writeBatch(db);
  let operationCount = 0;

  for (const docSnapshot of querySnapshot.docs) {
    currentBatch.delete(docSnapshot.ref);
    operationCount++;
    if (operationCount === 500) {
      batches.push(currentBatch);
      currentBatch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  await Promise.all(batches.map(batch => batch.commit()));
};


// --- AtsScoreResult Functions ---

/**
 * Saves a single ATS score result to Firestore.
 * @param {Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>} resultData - The data for the new ATS score result.
 * @returns {Promise<AtsScoreResult>} The newly created and saved ATS result object.
 */
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

/**
 * Saves multiple ATS score results to Firestore in a loop.
 * @param {Array<Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>>} resultsData - An array of ATS results to save.
 * @returns {Promise<AtsScoreResult[]>} A promise that resolves with an array of the newly saved result objects.
 */
export const saveMultipleAtsScoreResults = async (resultsData: Array<Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>>): Promise<AtsScoreResult[]> => {
    if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
    const userId = auth.currentUser.uid;
    const savedResults: AtsScoreResult[] = [];
    for (const result of resultsData) {
        const docRef = await addDoc(collection(db, "atsScoreResults"), { ...result, userId, createdAt: serverTimestamp() });
        savedResults.push({ ...result, id: docRef.id, userId, createdAt: Timestamp.now() } as AtsScoreResult);
    }
    return savedResults;
};

/**
 * Fetches all ATS score results for the currently logged-in user.
 * @returns {Promise<AtsScoreResult[]>} An array of saved ATS score results.
 */
export const getAtsScoreResults = async (): Promise<AtsScoreResult[]> => {
  if (!db || !auth?.currentUser) {
    console.error("getAtsScoreResults: Firestore or Auth not available/User not logged in.");
    return [];
  };
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "atsScoreResults"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AtsScoreResult));
};

/**
 * Deletes a specific ATS score result from Firestore.
 * @param {string} resultId - The ID of the document to delete.
 */
export const deleteAtsScoreResult = async (resultId: string): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const docRef = doc(db, "atsScoreResults", resultId);
  await deleteDoc(docRef);
};

/**
 * Deletes all ATS score results for the currently logged-in user.
 * This operation is performed in batches to handle large numbers of documents safely.
 */
export const deleteAllAtsScoreResults = async (): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "atsScoreResults"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return; // Nothing to delete.

  // Firestore allows a maximum of 500 operations per batch.
  const batches = [];
  let currentBatch = writeBatch(db);
  let operationCount = 0;

  for (const docSnapshot of querySnapshot.docs) {
    currentBatch.delete(docSnapshot.ref);
    operationCount++;
    if (operationCount === 500) {
      batches.push(currentBatch);
      currentBatch = writeBatch(db);
      operationCount = 0;
    }
  }

  // Add the last batch if it has any operations.
  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches concurrently.
  await Promise.all(batches.map(batch => batch.commit()));
};

// --- InterviewQuestionsSet Functions ---

/**
 * Saves a new set of interview questions to Firestore.
 * @param {Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'>} setData - The question set data to save.
 * @returns {Promise<InterviewQuestionsSet>} The newly created and saved question set object.
 */
export const saveInterviewQuestionSet = async (setData: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'>): Promise<InterviewQuestionsSet> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const userId = auth.currentUser.uid;
  
  const docRef = await addDoc(collection(db, "interviewQuestionSets"), {
    ...setData,
    userId,
    createdAt: serverTimestamp(),
  });

  return { ...setData, id: docRef.id, userId, createdAt: Timestamp.now() } as InterviewQuestionsSet;
};

/**
 * Fetches all saved interview question sets for the currently logged-in user.
 * @returns {Promise<InterviewQuestionsSet[]>} An array of saved interview question sets.
 */
export const getInterviewQuestionSets = async (): Promise<InterviewQuestionsSet[]> => {
  if (!db || !auth?.currentUser) {
    console.error("getInterviewQuestionSets: Firestore or Auth not available/User not logged in.");
    return [];
  };
  const userId = auth.currentUser.uid;
  const q = query(collection(db, "interviewQuestionSets"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterviewQuestionsSet));
};

/**
 * Deletes a specific interview question set from Firestore.
 * @param {string} setId - The ID of the document to delete.
 */
export const deleteInterviewQuestionSet = async (setId: string): Promise<void> => {
  if (!db || !auth?.currentUser) throw new Error("Firestore or Auth not available/User not logged in.");
  const docRef = doc(db, "interviewQuestionSets", setId);
  await deleteDoc(docRef);
};
