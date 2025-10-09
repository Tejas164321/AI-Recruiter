
// src/app/terms/page.tsx
"use client";

/**
 * Terms of Service Page.
 * This is a static content page displaying the terms of service.
 * NOTE: The content is a template and must be replaced with real, legally-sound terms.
 */
export default function TermsPage() {
  return (
    // Uses the 'prose' class from tailwindcss-typography for nice text formatting.
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-4xl pt-8">
      <h1 className="text-3xl font-bold mb-6 font-headline">Terms of Service</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Welcome to AI Recruiter! These terms and conditions outline the rules and regulations for the use of our website.</p>
      <p>By accessing this website, we assume you accept these terms. Do not continue to use AI Recruiter if you do not agree to all of the terms and conditions stated on this page.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Cookies</h2>
      <p>We employ the use of cookies. By accessing AI Recruiter, you agree to use cookies in agreement with our Privacy Policy.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">License</h2>
      <p>Unless otherwise stated, AI Recruiter and/or its licensors own the intellectual property rights for all material on AI Recruiter. All rights are reserved.</p>
      <p>You must not:</p>
      <ul>
        <li>Republish material from AI Recruiter</li>
        <li>Sell, rent or sub-license material from AI Recruiter</li>
        <li>Reproduce, duplicate or copy material from AI Recruiter</li>
        <li>Redistribute content from AI Recruiter</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">User-Generated Content</h2>
      <p>Parts of this website may offer an opportunity for users to upload content (e.g., resumes, job descriptions). We are not responsible for the content you upload.</p>
      <p>You warrant that your content does not invade any intellectual property right or contain any defamatory or unlawful material.</p>
      <p>We reserve the right to monitor and remove any content that we consider inappropriate or in breach of these Terms.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Disclaimer</h2>
      <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website.</p>
      <p>As long as the website and its services are provided free of charge, we will not be liable for any loss or damage of any nature.</p>

      <p className="mt-8"><strong>Please Note:</strong> This is a placeholder Terms of Service document. You should replace this with a comprehensive policy tailored to your specific services and legal requirements.</p>
    </div>
  );
}
