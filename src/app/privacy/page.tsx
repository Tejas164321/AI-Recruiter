
// src/app/privacy/page.tsx
"use client";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 prose dark:prose-invert max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 font-headline">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <p>Your privacy is important to us. It is ResumeRank AI&apos;s policy to respect your privacy regarding any information we may collect from you across our website, [Your Website URL], and other sites we own and operate.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Information We Collect</h2>
      <p>Log data: When you visit our website, our servers may automatically log the standard data provided by your web browser. This data is considered &ldquo;non-identifying information,&rdquo; as it does not personally identify you on its own. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.</p>
      <p>Personal information: We may ask for personal information, such as your name and email address. This data is considered &ldquo;identifying information,&rdquo; as it can personally identify you. We only request personal information relevant to providing you with a service, and only use it to help provide or improve this service.</p>
      
      <h2 className="text-2xl font-semibold mt-6 mb-3">How We Collect Information</h2>
      <p>We collect information by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used. You are free to refuse our request for this information, with the understanding that we may be unable to provide you with some of your desired services without it.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Use of Information</h2>
      <p>We may use a combination of identifying and non-identifying information to understand who our visitors are, how they use our services, and how we may improve their experience of our website in future. We do not publicly disclose the specifics of this information, but may share aggregated and anonymized versions of this information, for example, in website usage trend reports.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Data Processing and Storage</h2>
      <p>The personal information we collect is stored and processed where we or our partners, affiliates, and third-party providers maintain facilities. We only transfer data within jurisdictions subject to data protection laws that reflect our commitment to protecting the privacy of our users.</p>
      <p>We only retain personal information for as long as necessary to provide a service, or to improve our services in future. While we retain this data, we will protect it within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use, or modification.</p>
      
      {/* Add more sections as needed: e.g., Cookies, Third-Party Access, Children's Privacy, Your Rights */}

      <h2 className="text-2xl font-semibold mt-6 mb-3">Links to Other Sites</h2>
      <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and policies of those sites, and cannot accept responsibility or liability for their respective privacy practices.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Changes to our Privacy Policy</h2>
      <p>At our discretion, we may change our privacy policy to reflect current acceptable practices. We will take reasonable steps to let users know about changes via our website. Your continued use of this site after any changes to this policy will be regarded as acceptance of our practices around privacy and personal information.</p>

      <h2 className="text-2xl font-semibold mt-6 mb-3">Contact Us</h2>
      <p>For any questions or concerns regarding your privacy, you may contact us using the following details: [Your Contact Email/Link]</p>

      <p className="mt-8">This is a placeholder Privacy Policy. Please replace this with your own comprehensive policy.</p>
    </div>
  );
}
