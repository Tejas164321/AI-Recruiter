export interface JobDescription {
  content: string; 
}

export interface ResumeFile {
  id: string;
  file: File;
  dataUri: string;
}

export interface RankedCandidate {
  id: string; 
  name: string;
  score: number;
  keySkills: string;
  feedback: string;
  originalResumeName: string; 
}

export interface Filters {
  scoreRange: [number, number];
  skillKeyword: string;
}
