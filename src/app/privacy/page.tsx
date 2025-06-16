
// src/app/privacy/page.tsx
"use client";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 font-headline">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Your privacy is important to us. It is ResumeRank AI&apos;s policy to respect your privacy regarding any information we may collect from you across our website, [Your Website URL], and other sites we own and operate.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
      <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
      
      <h3 className="text-xl font-medium mt-4 mb-2">Log Data</h3>
      <p>When you visit our website, our servers may automatically log the standard data provided by your web browser. This data is considered &ldquo;non-identifying information,&rdquo; as it does not personally identify you on its own. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details about your visit.</p>

      <h3 className="text-xl font-medium mt-4 mb-2">Personal Information</h3>
      <p>We may ask for personal information — for example, when you register an account or when you contact us — which may include one or more of the following:</p>
      <ul>
        <li>Name</li>
        <li>Email</li>
        {/* Add other types of personal information you might collect, e.g., payment information if applicable */}
      </ul>
      <p>This data is considered &ldquo;identifying information,&rdquo; as it can personally identify you. We only request personal information relevant to providing you with a service, and only use it to help provide or improve this service.</p>
      
      <h3 className="text-xl font-medium mt-4 mb-2">Uploaded Documents (Job Descriptions & Resumes)</h3>
      <p>When you use our services, such as the AI Resume Ranker, you may upload documents including job descriptions and resumes. These documents may contain personal and sensitive information. We collect and process these documents solely for the purpose of providing the requested AI analysis and ranking services. We treat these documents with a high degree of care and confidentiality.</p>


      <h2 className="text-2xl font-semibold mt-6 mb-3">2. How We Use Information</h2>
      <p>We use a combination of identifying and non-identifying information to understand who our visitors are, how they use our services, and how we may improve their experience of our website in the future. We do not publicly disclose the specifics of this information, but may share aggregated and anonymized versions of this information, for example, in website usage trend reports.</p>
      <p>We may use your personal information to:</p>
      <ul>
        <li>Provide you with our app’s core features and services.</li>
        <li>Respond to your inquiries and provide customer support.</li>
        <li>Communicate with you about your account and our services.</li>
        <li>Improve our website and services based on your usage and feedback.</li>
        {/* Add other specific uses if applicable */}
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-3">3. Data Processing and Storage</h2>
      <p>The personal information and documents we collect are stored and processed in [Specify Your Data Storage Location, e.g., United States, or the region of your cloud provider]. We only transfer data within jurisdictions subject to data protection laws that reflect our commitment to protecting the privacy of our users.</p>
      <p>We only retain personal information and uploaded documents for as long as necessary to provide a service, or to improve our services in the future. While we retain this data, we will protect it within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use, or modification. We will outline specific retention periods for uploaded documents if they differ from general personal information.</p>
      <p>You can request the deletion of your account and associated data, including uploaded documents, subject to any legal obligations we may have to retain certain information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">4. Disclosure of Information to Third Parties</h2>
      <p>We may disclose personal information to:</p>
      <ul>
        <li>Third-party service providers for the purpose of enabling them to provide their services, including (without limitation) IT service providers, data storage, hosting and server providers, ad networks, analytics, error loggers, debt collectors, maintenance or problem-solving providers, marketing or advertising providers, professional advisors, and payment systems operators. (e.g., Google for Genkit AI services).</li>
        <li>Our employees, contractors, and/or related entities.</li>
        <li>Courts, tribunals, regulatory authorities, and law enforcement officers, as required by law, in connection with any actual or prospective legal proceedings, or in order to establish, exercise, or defend our legal rights.</li>
      </ul>
      <p>We do not sell or rent your personal information or uploaded documents to third parties for marketing purposes.</p>


      <h2 className="text-2xl font-semibold mt-6 mb-3">5. Security of Your Information</h2>
      <p>We take the security of your personal information and uploaded documents seriously and use commercially acceptable means to protect it. However, we cannot guarantee the absolute security of any information you transmit to us or store on our services, as no electronic transmission or storage method is 100% secure.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">6. Cookies</h2>
      <p>We use &ldquo;cookies&rdquo; to collect information about you and your activity across our site. A cookie is a small piece of data that our website stores on your computer, and accesses each time you visit, so we can understand how you use our site. This helps us serve you content based on preferences you have specified. Refer to our [Link to Cookie Policy if separate, otherwise integrate here] for more information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">7. Links to Other Sites</h2>
      <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and policies of those sites, and cannot accept responsibility or liability for their respective privacy practices.</p>
      
      <h2 className="text-2xl font-semibold mt-6 mb-3">8. Children&apos;s Privacy</h2>
      <p>Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">9. Your Rights and Controlling Your Information</h2>
      <p>You always retain the right to withhold personal information from us, with the understanding that your experience of our website may be affected. We will not discriminate against you for exercising any of your rights over your personal information. If you do provide us with personal information you understand that we will collect, hold, use and disclose it in accordance with this privacy policy. You retain the right to request details of any personal information we hold about you.</p>
      <p>If you believe that any information we hold about you is inaccurate, out of date, incomplete, irrelevant, or misleading, please contact us using the details below. We will take reasonable steps to correct any information found to be inaccurate, incomplete, misleading, or out of date.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">10. Changes to our Privacy Policy</h2>
      <p>At our discretion, we may change our privacy policy to reflect updates to our business processes, current acceptable practices, or legislative or regulatory changes. If we decide to change this privacy policy, we will post the changes here at the same link by which you are accessing this privacy policy.</p>
      <p>If required by law, we will get your permission or give you the opportunity to opt in to or opt out of, as applicable, any new uses of your personal information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">11. Contact Us</h2>
      <p>For any questions or concerns regarding your privacy, you may contact us using the following details: [Your Contact Email or Link to Contact Form]</p>

      <p className="mt-8"><strong>Please Note:</strong> This is a placeholder Privacy Policy. You must replace this with your own comprehensive policy tailored to your specific services, data handling practices, and legal/regulatory requirements. It is strongly recommended to consult with a legal professional.</p>
    </div>
  );
}
