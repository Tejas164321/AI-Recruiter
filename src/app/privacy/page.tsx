
// src/app/privacy/page.tsx
"use client";

/**
 * Privacy Policy Page.
 * This is a static content page displaying the privacy policy.
 * NOTE: The content is a template and must be replaced with a real, legally-sound privacy policy.
 */
export default function PrivacyPage() {
  return (
    // Uses the 'prose' class from tailwindcss-typography for nice text formatting.
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-4xl pt-8">
      <h1 className="text-3xl font-bold mb-6 font-headline">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Your privacy is important to us. It is AI Recruiter&apos;s policy to respect your privacy regarding any information we may collect from you across our website and other sites we own and operate.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
      <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
      
      <h3 className="text-xl font-medium mt-4 mb-2">Log Data</h3>
      <p>When you visit our website, our servers may automatically log standard data provided by your web browser, such as IP address, browser type, pages visited, and timestamps.</p>

      <h3 className="text-xl font-medium mt-4 mb-2">Personal Information</h3>
      <p>We may ask for personal information, such as your name and email, when you register for an account.</p>
      
      <h3 className="text-xl font-medium mt-4 mb-2">Uploaded Documents (Job Descriptions & Resumes)</h3>
      <p>When you use our services, you upload documents like job descriptions and resumes. We collect and process these documents solely to provide the requested AI analysis and ranking services.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">2. How We Use Information</h2>
      <p>We use information to understand our visitors, improve our services, and provide core functionality. We do not publicly disclose specifics but may share aggregated, anonymized data.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">3. Data Processing and Storage</h2>
      <p>Collected data is stored and processed securely. We retain information only as long as necessary to provide our services and protect it with commercially acceptable means.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">4. Disclosure of Information to Third Parties</h2>
      <p>We may disclose information to third-party service providers (like Google for AI services) and legal authorities as required by law. We do not sell your personal data.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">5. Security of Your Information</h2>
      <p>We take security seriously but cannot guarantee absolute security as no electronic method is 100% secure.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">6. Cookies</h2>
      <p>We use cookies to collect information about your activity on our site to improve your experience.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">7. Links to Other Sites</h2>
      <p>Our website may link to external sites. We have no control over their content and policies.</p>
      
      <h2 className="text-2xl font-semibold mt-6 mb-3">8. Children&apos;s Privacy</h2>
      <p>Our services are not for individuals under 13. We do not knowingly collect information from children.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">9. Your Rights and Controlling Your Information</h2>
      <p>You have the right to withhold personal information and request details about the data we hold about you.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">10. Changes to our Privacy Policy</h2>
      <p>We may change our privacy policy and will post updates on this page.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">11. Contact Us</h2>
      <p>For any privacy concerns, please contact us.</p>

      <p className="mt-8"><strong>Please Note:</strong> This is a placeholder Privacy Policy. You must replace this with your own comprehensive policy tailored to your specific services and legal requirements.</p>
    </div>
  );
}
