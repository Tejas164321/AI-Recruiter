
'use server'; // Although functions are called from client, good practice if they were ever server-invoked directly.
              // For client-side calls, this directive isn't strictly necessary for firebase-js-sdk.

import { db } from '@/lib/firebase/config';
import type {
  ExtractedJobRole,
  JobScreeningResult,
  AtsScoreResult,
  InterviewQuestionsSet,
} from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

if (!db) {
  console.warn(
    'Firestore service: Firestore (db) is not initialized. Operations will likely fail. Ensure Firebase is configured correctly.'
  );
}

// --- ExtractedJobRole Services ---

export async function addExtractedJobRole(
  userId: string,
  jobRoleData: Omit<ExtractedJobRole, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('User ID is required to add a job role.');
  try {
    const docRef = await addDoc(collection(db, 'extractedJobRoles'), {
      ...jobRoleData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding extracted job role:', error);
    throw new Error('Failed to save job role.');
  }
}

export async function getExtractedJobRolesForUser(userId: string): Promise<ExtractedJobRole[]> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) return [];
  const q = query(
    collection(db, 'extractedJobRoles'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ExtractedJobRole, 'id'>),
  }));
}

export async function deleteExtractedJobRole(jobRoleId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  try {
    await deleteDoc(doc(db, 'extractedJobRoles', jobRoleId));
    // Optionally, delete associated screening results and interview questions
    const screeningResultsQuery = query(collection(db, 'jobScreeningResults'), where('jobDescriptionId', '==', jobRoleId));
    const screeningResultsSnapshot = await getDocs(screeningResultsQuery);
    screeningResultsSnapshot.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, 'jobScreeningResults', docSnapshot.id));
    });
  } catch (error) {
    console.error('Error deleting job role:', error);
    throw new Error('Failed to delete job role.');
  }
}


// --- JobScreeningResult Services ---

export async function addOrUpdateJobScreeningResult(
  userId: string,
  screeningResultData: Omit<JobScreeningResult, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('User ID is required to save a screening result.');
  
  // Check if a result for this jobDescriptionId already exists for the user
  const q = query(
    collection(db, 'jobScreeningResults'),
    where('userId', '==', userId),
    where('jobDescriptionId', '==', screeningResultData.jobDescriptionId)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Update existing document
    const docId = querySnapshot.docs[0].id;
    await setDoc(doc(db, 'jobScreeningResults', docId), {
      ...screeningResultData,
      userId,
      createdAt: serverTimestamp(), // Or use querySnapshot.docs[0].data().createdAt to keep original
    }, { merge: true });
    return docId;
  } else {
    // Add new document
    const docRef = await addDoc(collection(db, 'jobScreeningResults'), {
      ...screeningResultData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
}

export async function getJobScreeningResultForJob(
  userId: string,
  jobDescriptionId: string
): Promise<JobScreeningResult | null> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !jobDescriptionId) return null;
  const q = query(
    collection(db, 'jobScreeningResults'),
    where('userId', '==', userId),
    where('jobDescriptionId', '==', jobDescriptionId),
    orderBy('createdAt', 'desc') // Get the latest if multiple somehow exist
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const docData = querySnapshot.docs[0];
  return {
    id: docData.id,
    ...(docData.data() as Omit<JobScreeningResult, 'id'>),
  };
}

export async function getAllJobScreeningResultsForUser(userId: string): Promise<JobScreeningResult[]> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) return [];
  const q = query(
    collection(db, 'jobScreeningResults'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<JobScreeningResult, 'id'>),
  }));
}


// --- AtsScoreResult Services ---

export async function addAtsScoreResult(
  userId: string,
  atsResultData: Omit<AtsScoreResult, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('User ID is required to add an ATS result.');
  const docRef = await addDoc(collection(db, 'atsScoreResults'), {
    ...atsResultData,
    userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAtsScoreResultsForUser(userId: string): Promise<AtsScoreResult[]> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) return [];
  const q = query(
    collection(db, 'atsScoreResults'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AtsScoreResult, 'id'>),
  }));
}

// --- InterviewQuestionsSet Services ---

export async function addInterviewQuestionsSet(
  userId: string,
  questionsData: Omit<InterviewQuestionsSet, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('User ID is required to add interview questions.');
  const docRef = await addDoc(collection(db, 'interviewQuestionsSets'), {
    ...questionsData,
    userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getInterviewQuestionsSetForRole(
  userId: string,
  roleTitle: string
): Promise<InterviewQuestionsSet | null> {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !roleTitle) return null;
  const q = query(
    collection(db, 'interviewQuestionsSets'),
    where('userId', '==', userId),
    where('roleTitle', '==', roleTitle),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const docData = querySnapshot.docs[0];
  return {
    id: docData.id,
    ...(docData.data() as Omit<InterviewQuestionsSet, 'id'>),
  };
}

// Utility to convert Firestore Timestamps to Date objects if needed, or to work with them.
// For now, types expect Timestamp. Components might need to format these.
