import { Metadata } from "next";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
                Privacy <span className="text-gradient-red">Policy</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Your privacy is a priority. Learn how we collect, use, and protect your information.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl">

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Information We Collect</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We collect the following information to provide you with the best service:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Personal information (name, email, phone number, address)</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Payment details to process transactions securely</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Browsing data to enhance your user experience</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Delivery preferences and dietary requirements</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Order history and meal preferences</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">How We Use Your Information</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Your information is used for the following purposes:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>To deliver your meals and manage subscriptions</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>To improve our services and customize your experience</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>To communicate updates, offers, and support</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>To process payments securely</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>To respond to your inquiries and provide customer support</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Data Sharing</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                We do not sell your personal information. Information is shared only with trusted partners for delivery, payment processing, or legal compliance when required by law.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Data Security</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Your data is protected with encryption and secure servers. We regularly update our systems to safeguard your information against unauthorized access, alteration, or disclosure.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Your Choices</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Access, update, or delete your personal data by contacting us</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Opt out of promotional communications at any time</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Request a copy of your data in a portable format</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Withdraw consent for data processing where applicable</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Cookies</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Cookies are used to enhance website functionality and analyze site usage. You can manage cookie preferences through your browser settings. Disabling cookies may affect your experience on our website.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Policy Updates</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Changes to this policy will be posted on this page. We will notify you of significant changes via email or website notification. Continued use of our website signifies your acceptance of any updates.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Children&apos;s Privacy</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Our services are intended for users aged 18 and above. We do not knowingly collect personal information from children under 18 years of age.
              </p>

              <h2 className="mb-6 mt-12 text-3xl font-bold md:text-4xl">Contact Us</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                For questions or concerns about our privacy practices, please contact us at:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mt-6 mb-12">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Email:</strong> <a href="mailto:Bhookr555@gmail.com" className="hover:text-[#E31E24] transition-colors">Bhookr555@gmail.com</a>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Phone:</strong> <a href="tel:+919542762906" className="hover:text-[#E31E24] transition-colors">+91 95427 62906</a>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Address:</strong> Hyderabad, Telangana
                  </div>
                </li>
              </ul>

              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed text-center font-semibold">
                Thank you for trusting BHOOKR!
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
