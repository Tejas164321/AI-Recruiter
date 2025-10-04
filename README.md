# AI Recruiter 🚀

An AI-powered suite designed to streamline and revolutionize your recruitment workflow.

![AI Recruiter Hero](./public/hero-hologram.png)

## 📝 Overview

AI Recruiter is a modern, full-stack web application built to help recruiters and hiring managers make smarter, faster, and data-driven hiring decisions. By leveraging the power of Google's Gemini AI through Genkit, this platform automates the tedious tasks of resume screening, candidate ranking, and interview preparation, allowing you to focus on what truly matters: finding the best talent.

This project is built with a production-ready stack and serves as a comprehensive example of integrating modern web technologies with cutting-edge AI capabilities.

---

## ✨ Key Features

-   **🧠 AI Resume Ranker**: Upload multiple job descriptions and resumes to intelligently rank candidates. The AI provides a match score, ATS compatibility score, and detailed feedback for each candidate.
-   **📊 ATS Score Finder**: Analyze individual resumes for Applicant Tracking System (ATS) compatibility. Get actionable suggestions to optimize resumes for automated screening processes.
-   **❓ AI Interview Question Generator**: Automatically generate a comprehensive set of technical, behavioral, situational, and role-specific interview questions by simply uploading a job description.
-   **🔐 Secure Authentication & Data Storage**: Built-in user authentication (Sign Up/Login) powered by Firebase Authentication. All user data, including uploaded roles and screening results, is securely stored in Firestore and tied to the user's account.
-   **📱 Fully Responsive Design**: A sleek and modern UI built with ShadCN and Tailwind CSS, ensuring a seamless experience on both desktop and mobile devices.
-   **🎨 Light & Dark Mode**: A beautiful, themeable interface that respects user preferences.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (React)
-   **Generative AI**: [Google AI (Gemini) via Genkit](https://firebase.google.com/docs/genkit)
-   **Backend & DB**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Deployment**: Ready for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Firebase](https://firebase.google.com/) project.
-   A [Google AI API Key](https://aistudio.google.com/app/apikey).

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/resumerank-ai.git
cd resumerank-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

You'll need to provide your secret keys for Firebase and Google AI. Create a file named `.env.local` in the root of the project by copying the example file:

```bash
cp .env.example .env.local
```

Now, open `.env.local` and fill in the required values.

#### **How to get your Firebase credentials:**

1.  Go to your [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (or select an existing one).
3.  In your project, go to **Project Settings** (the gear icon).
4.  Under the "General" tab, scroll down to "Your apps".
5.  Click the **Web** icon (`</>`) to create a new web app.
6.  Give it a nickname and register the app.
7.  Firebase will provide you with a `firebaseConfig` object. Copy the values from this object into the corresponding `NEXT_PUBLIC_FIREBASE_*` variables in your `.env.local` file.
8.  Enable **Authentication** (with Email/Password provider) and **Firestore Database** in the Firebase console.

#### **How to get your Google AI API key:**

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click "Create API key in new project".
3.  Copy the generated API key and paste it as the `GOOGLE_API_KEY` value in your `.env.local` file.

### 4. Run the Development Server

Once your environment variables are set, you can run the application:

```bash
npm run dev
```

The application should now be running on [http://localhost:3000](http://localhost:3000).

---

## 📁 Folder Structure

The project follows a standard Next.js App Router structure with some key directories:

```
/
├── src/
│   ├── app/                # Main application pages and layouts
│   ├── ai/                 # Genkit AI flows and configuration
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (Auth, Loading)
│   ├── hooks/              # Custom React hooks (useToast)
│   ├── lib/                # Libraries, utilities, and type definitions
│   └── services/           # Firestore service functions
├── public/                 # Static assets (images, fonts)
└── .env.local              # Your secret environment variables (ignored by Git)
```
---

## 📞 Contact

Created by [Your Name] - feel free to reach out!

---
## Previous Color Theme

For reference, here is the previous color theme that was being used:

**Dark Theme:**
```css
--background: 220 17% 5%;
--foreground: 0 0% 98%;
--card: 220 16% 8%;
--primary: 215 100% 60%;
--accent: 163 70% 45%;
```

**Light Theme:**
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 215 100% 55%;
--accent: 163 70% 38%;
```
