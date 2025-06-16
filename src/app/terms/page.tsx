
// src/app/terms/page.tsx
"use client";

export default function TermsPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 font-headline">Terms of Service</h1>
      
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Welcome to ResumeRank AI! These terms and conditions outline the rules and regulations for the use of ResumeRank AI&apos;s Website, located at [Your Website URL].</p>

      <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use ResumeRank AI if you do not agree to take all of the terms and conditions stated on this page.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Cookies</h2>
      <p>We employ the use of cookies. By accessing ResumeRank AI, you agreed to use cookies in agreement with the ResumeRank AI&apos;s Privacy Policy.</p>
      <p>Most interactive websites use cookies to let us retrieve the user’s details for each visit. Cookies are used by our website to enable the functionality of certain areas to make it easier for people visiting our website. Some of our affiliate/advertising partners may also use cookies.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">License</h2>
      <p>Unless otherwise stated, ResumeRank AI and/or its licensors own the intellectual property rights for all material on ResumeRank AI. All intellectual property rights are reserved. You may access this from ResumeRank AI for your own personal use subjected to restrictions set in these terms and conditions.</p>
      <p>You must not:</p>
      <ul>
        <li>Republish material from ResumeRank AI</li>
        <li>Sell, rent or sub-license material from ResumeRank AI</li>
        <li>Reproduce, duplicate or copy material from ResumeRank AI</li>
        <li>Redistribute content from ResumeRank AI</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">User Comments</h2>
      <p>This Agreement shall begin on the date hereof.</p>
      <p>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. ResumeRank AI does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of ResumeRank AI, its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions.</p>
      {/* Add more sections as needed */}

      <h2 className="text-2xl font-semibold mt-6 mb-3">Disclaimer</h2>
      <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
      <ul>
        <li>limit or exclude our or your liability for death or personal injury;</li>
        <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
        <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
        <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
      </ul>
      <p>The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.</p>
      <p>As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.</p>

      <p className="mt-8">This is a placeholder Terms of Service. Please replace this with your own comprehensive terms.</p>
    </div>
  );
}
