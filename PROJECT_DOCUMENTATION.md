# AI-Powered Recruiter System - Technical Documentation

## 1. Executive Summary
The **AI-Powered Recruiter** is an intelligent automated hiring assistant designed to streamline the recruitment process. By leveraging Google's **Gemini 2.0 Flash** model via the **Genkit** framework, the system automates the analysis of job descriptions (JDs) and candidate resumes. It provides quantitative ranking (0-100 scores), qualitative feedback, and ATS (Applicant Tracking System) compatibility analysis, significantly reducing the manual workload for HR professionals.

## 2. High-Level Architecture

The system follows a modern **Serverless / Edge-ready** architecture powered by Next.js and Firebase.

```mermaid
graph TD
    subgraph Client_Layer ["🖥️ Client Layer (Browser)"]
        UI[("User Interface<br/>(React + Tailwind + ShadcnUI)")]
        Auth_Client[("Firebase Auth SDK")]
    end

    subgraph App_Layer ["⚡ Application Layer (Next.js)"]
        Next_Server["Next.js Server Actions"]
        
        subgraph AI_Core ["🧠 AI Orchestration (Genkit)"]
            Flow_Extract["Flow: Extract Job Roles"]
            Flow_Rank["Flow: Rank Candidates"]
            Flow_ATS["Flow: Calculate ATS Score"]
            Prompt_Eng["Prompt Engineering Engine"]
        end
        
        subgraph Utilities ["🛠️ Core Utilities"]
            Data_Validator["Data URI Validator"]
            Rate_Limiter["Rate Limiter & Retry Logic"]
            PDF_Parser["Document Parser"]
        end
    end

    subgraph Cloud_Services ["☁️ Cloud Services"]
        Gemini[("✨ Google Gemini 2.0 Flash<br/>(Generative AI Model)")]
        Firestore[("🔥 Firebase Firestore<br/>(NoSQL Database)")]
        Auth_Service[("🛡️ Firebase Authentication")]
    end

    %% Data Flow Connections
    UI -->|Upload Files| Next_Server
    UI -->|Auth Request| Auth_Client
    Auth_Client <--> Auth_Service
    
    Next_Server -->|Invoke Flow| AI_Core
    AI_Core -->|Generate Content| Gemini
    AI_Core -->|Store Results| Firestore
    
    Flow_Extract --> Utilities
    Flow_Rank --> Utilities
    
    Next_Server -->|Read/Write History| Firestore
    
    classDef client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef app fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef cloud fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef ai fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    
    class UI,Auth_Client client;
    class Next_Server,Utilities app;
    class AI_Core,Flow_Extract,Flow_Rank,Flow_ATS,Prompt_Eng ai;
    class Gemini,Firestore,Auth_Service cloud;
```

## 3. Core Features & Functions

### 3.1 📄 Intelligent Job Role Extraction
*   **Function**: Converts raw unstructured PDF/link JDs into structured data.
*   **Process**:
    1.  User uploads a Job Description (PDF/DOCX).
    2.  System converts file to Data URI.
    3.  **Genkit Flow** invokes Gemini to analyze text.
    4.  **AI Output**: Extracts Job Title, Key Requirements, and Technical Skills.
    5.  Result is stored as a "Job Role" session.

### 3.2 🏆 Bulk Resume Ranking & Screening
*   **Function**: Scores massive batches of resumes against a specific Job Role.
*   **Process**:
    1.  User selects a Job Role and uploads multiple resumes.
    2.  **Batch Processor** creates a queue (concurrency limited to 1 for Free Tier).
    3.  **AI Analysis**: Each resume is compared against the JD.
    4.  **Scoring**:
        *   **Match Score (0-100)**: Relevance to the role.
        *   **ATS Score (0-100)**: Formatting and keyword optimization.
    5.  **Output**: Structured JSON with Score, Email, Skills, and Feedback.
    6.  **Cost Optimization**: Uses Gemini Flash for low-cost, high-volume processing.

### 3.3 📊 Real-time Dashboard & Analytics
*   **Function**: Visualizes data for decision making.
*   **Key metrics**:
    *   Leaderboard of top candidates.
    *   Filter by score range or specific skills.
    *   Detailed "Why this score?" feedback modal.

### 3.4 📧 Automated Candidate Engagement
*   **Function**: One-click communication.
*   **Features**:
    *   "Email Filtered": Send emails to all candidates matching specific criteria (e.g., Score > 80).
    *   Template-based generation using candidate name and job title.

## 4. Technical Stack & Research

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Server Actions provide secure, direct backend execution without separate API routes. |
| **AI Framework** | **Google Genkit** | Native TypeScript integration for LLMs, specialized flows, and testing tools. |
| **AI Model** | **Gemini 2.0 Flash** | Best-in-class price/performance ratio. Low latency (Flash) is critical for bulk processing. |
| **Database** | **Firebase Firestore** | Real-time listeners enable live progress updates; flexible schema for varying resume formats. |
| **Styling** | **Tailwind CSS + ShadcnUI** | Rapid UI development with accessible, professional components. |

## 5. Operational Logic & Rate Limiting

The system includes sophisticated logic to handle API constraints, specifically designed for the **Gemini Free Tier**:

### Failure Handling Strategy
1.  **Rate Limiter**: Concurrency set to **1 request/user**.
2.  **Traffic Control**: **2000ms delay** applied between requests to stay under the ~15 RPM (Requests Per Minute) limit.
3.  **Circuit Breaker**: Detects 429 (Too Many Requests) errors and pauses execution to prevent cascading failures.
4.  **Graceful Degradation**: If AI fails for one resume, it is marked as "Extraction Error" without crashing the entire batch.

## 6. Data Flow Diagram (The "Screening" Process)

```mermaid
sequenceDiagram
    participant U as User (HR)
    participant FE as Frontend
    participant SA as Server Action
    participant AI as Gemini 2.0 Flash
    participant DB as Firestore

    U->>FE: Uploads 10 Resumes
    FE->>SA: invoke performBulkScreening()
    
    loop For Each Resume (Sequentially)
        SA->>SA: Wait 2000ms (Rate Limit Guard)
        SA->>AI: Prompt: "Compare [Resume] vs [JD]"
        activate AI
        AI-->>SA: JSON: { Score: 85, Skills: [...] }
        deactivate AI
        
        alt Success
            SA->>DB: Save Result
            SA-->>FE: Stream Progress (1/10 Done)
        else Rate Limit (429)
            SA->>SA: Pause & Retry
        end
    end
    
    SA-->>FE: Return Complete List
    FE->>U: Show Ranked Table
```

## 7. Future Scalability
*   **Vector Search**: Implement RAG (Retrieval Augmented Generation) to search internal candidate databases.
*   **Multi-Modal Analysis**: Analyze candidate portfolios/Github links.
*   **Queue System**: Move PDF processing to a background job queue (e.g., Redis/BullMQ) for handling 1000+ resumes.
