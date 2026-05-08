import { Link } from "react-router-dom";

function PrivacyPolicyPage() {
  return (
    <main className="wh-privacy-page">
      <div className="privacy-container">
        <Link to="/" className="back-btn">
          <i className="fa-solid fa-arrow-left" /> Back to Home
        </Link>

        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>

        <p>Welcome to WallpaperCave. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we handle your personal data when you visit our website.</p>

        <h2>1. Information We Collect</h2>
        <p>We may collect, use, store and transfer different kinds of personal data about you:</p>
        <ul>
          <li><strong>Identity Data:</strong> Name, username, or similar identifier</li>
          <li><strong>Contact Data:</strong> Email address</li>
          <li><strong>Technical Data:</strong> IP address, browser type and version, device information</li>
          <li><strong>Usage Data:</strong> Information about how you use our website, products and services</li>
          <li><strong>Content Data:</strong> Wallpapers you upload, likes, downloads, and comments</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your personal data to register your account, provide the service, process uploads, track likes and downloads, communicate updates, improve the website, and prevent abuse.</p>

        <h2>3. Data Storage and Security</h2>
        <ul>
          <li>Your password is encrypted using industry-standard hashing algorithms</li>
          <li>Uploaded wallpapers are stored securely</li>
          <li>We use secure connections to protect data in transit</li>
          <li>Access to personal data is restricted to authorized personnel only</li>
        </ul>

        <h2>4. Cookies and Tracking</h2>
        <p>Cookies help maintain your login session, remember preferences, analyze traffic, and improve website functionality. You can control cookies through your browser settings.</p>

        <h2>5. Third-Party Services</h2>
        <ul>
          <li><strong>GitHub or Supabase Storage:</strong> Wallpaper image storage and hosting</li>
          <li><strong>Social platforms:</strong> Sharing integrations for wallpapers</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You can request access, correction, deletion, data portability, or object to processing of your personal data.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your personal data only as long as necessary to fulfill the purposes outlined in this policy. When you delete your account, we delete or anonymize personal data unless retention is legally required.</p>

        <h2>8. Children's Privacy</h2>
        <p>Our service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children.</p>

        <h2>9. Changes to This Privacy Policy</h2>
        <p>We may update this policy from time to time by posting the new version on this page and updating the date above.</p>

        <h2>10. Contact Us</h2>
        <ul>
          <li>Email: privacy@wallpapercave.com</li>
          <li>Website: {window.location.origin}</li>
        </ul>

        <div className="mt-5">
          <Link to="/" className="back-btn">
            <i className="fa-solid fa-arrow-left" /> Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default PrivacyPolicyPage;
