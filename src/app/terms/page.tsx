import { Metadata } from "next";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
                Terms & <span className="text-gradient-red">Conditions</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Please review the following terms carefully before subscribing to our services.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Advance Intimation for Pausing Meals</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Pausing or rescheduling meals requires at least one day&apos;s notice. Requests made on the same day will not be accommodated, and the meal will be counted.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Delivery Timings</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Meals will only be delivered within the slot timings specified by BHOOKR. Customized delivery timings are not available. For flexibility, you may choose to pick up your meal from our outlet during operating hours.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Meal Modifications</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Changes to diet plans, delivery addresses, or preferences must be communicated one day in advance.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">No Refund Policy</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                BHOOKR operates under a strict no refund policy for all subscriptions.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Meal Preparation Guidelines</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Our meals are curated by professional chefs and nutritionists. While we consider your likes and dislikes, personalized cooking preferences are not accommodated.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Quantity Adjustments</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Any changes to the quantity of meals may incur additional charges.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Fitness Responsibility Disclaimer</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Fitness transformations depend on multiple factors, including diet, workouts, sleep, and lifestyle habits. BHOOKR is not responsible if your desired fitness results are not achieved. We do not promise specific weight loss or gain but are committed to helping you achieve a healthier lifestyle.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Spot Cancellations</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Spot cancellations of meals are not permitted and will result in the meal being counted.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Meal Replacement</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Missed meals due to non-communication or late requests will not be replaced or refunded.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Allergen Responsibility</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                It is the client&apos;s responsibility to notify BHOOKR of any food allergies before subscribing. While we take utmost care, cross-contamination cannot be guaranteed.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Subscription Duration Commitment</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Subscriptions must be used within the specified time frame. Extensions will not be granted unless explicitly agreed upon.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Payment Terms</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Full payment must be made before the start of the subscription. Partial payments are not accepted.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Non-Transferability</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Subscriptions are non-transferable and cannot be shared with others.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Client Communication</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Official communication will be made through WhatsApp, email, or calls. It is the client&apos;s responsibility to check for updates.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Damaged Deliveries</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                In the rare event of meal damage during delivery, it must be reported within 2 hours for resolution.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Dietary Changes</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Significant diet modifications may require consultation with BHOOKR&apos;s nutritionist and may incur additional charges.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Cancellation Policy</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                Subscriptions cannot be canceled. However, meals can be paused and resumed at a later date, provided one day&apos;s notice is given.
              </p>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Shipping Policy</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We deliver freshly prepared meals everyday according to your subscription plan, ensuring timely delivery for breakfast (morning), lunch (afternoon), and dinner (evening).
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Please note that for same-day delivery, orders must be placed in advance to ensure timely preparation and delivery of breakfast, lunch, and dinner on the same day.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                We value your cooperation in adhering to these guidelines to help us provide exceptional service.
              </p>

              <h2 className="mb-6 mt-12 text-3xl font-bold md:text-4xl">Contact Us</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                For any questions or clarifications regarding these terms, please contact us at:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mt-6">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Phone:</strong> <a href="tel:+919542762906" className="hover:text-[#E31E24] transition-colors">+91 95427 62906</a>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Email:</strong> <a href="mailto:Bhookr555@gmail.com" className="hover:text-[#E31E24] transition-colors">Bhookr555@gmail.com</a>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Address:</strong> Hyderabad, Telangana
                  </div>
                </li>
              </ul>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mt-12 text-center font-semibold">
                Thank you for trusting BHOOKR for your health and nutrition needs!
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
