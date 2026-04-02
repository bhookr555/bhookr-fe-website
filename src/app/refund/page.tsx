import { Metadata } from "next";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
                Refund <span className="text-gradient-red">Policy</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Understanding our no-refund policy and subscription flexibility options.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl">

              <div className="mb-12 p-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-[#E31E24] rounded-r-lg">
                <h2 className="text-3xl font-bold md:text-4xl text-[#E31E24] mt-0 mb-4">No Refund Policy</h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-0 leading-relaxed">
                  BHOOKR follows a strict no-refund policy for all subscription plans. Once a subscription is purchased, it cannot be canceled or refunded under any circumstances.
                </p>
              </div>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Why We Have This Policy</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                This policy ensures operational efficiency and helps us maintain the highest standards of service and quality for our customers. Our meal preparation involves:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Advance procurement of fresh ingredients</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Professional chef preparation and planning</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Nutritionist consultation and meal design</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Coordination with delivery logistics</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">What You Can Do Instead</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                While we cannot offer refunds, we provide flexible alternatives:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div><strong className="text-gray-900 dark:text-white">Pause Your Subscription:</strong> You can pause your meals and resume at a later date with one day&apos;s notice</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div><strong className="text-gray-900 dark:text-white">Modify Your Plan:</strong> Change your diet plan, delivery address, or preferences with advance notice</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div><strong className="text-gray-900 dark:text-white">Adjust Delivery Schedule:</strong> Reschedule deliveries to suit your convenience</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Before You Subscribe</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We encourage you to carefully review the subscription details before making a purchase to ensure it aligns with your needs. Consider:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Your dietary preferences and requirements</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>The subscription duration and meal frequency</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Delivery timings and locations</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Your commitment to the subscription period</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Quality Guarantee</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                While we maintain a no-refund policy, we are committed to quality:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>If meals are damaged during delivery, report within 2 hours for resolution</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>We address quality concerns promptly through meal replacement when applicable</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Our team works to ensure your satisfaction with every delivery</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Subscription Management</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Remember these key points about your subscription:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mb-8">
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Subscriptions are non-transferable</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Must be used within the specified timeframe</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Pausing requires one day&apos;s advance notice</div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1 text-[#E31E24]">✓</span>
                  <div>Same-day meal cancellations are not permitted</div>
                </li>
              </ul>

              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Need Help?</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                For any assistance or clarification before subscribing, our support team is available to help address your queries. We want to ensure you make an informed decision that&apos;s right for you.
              </p>

              <h2 className="mb-6 mt-12 text-3xl font-bold md:text-4xl">Contact Our Support Team</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Have any doubts? Talk to us before subscribing:
              </p>
              <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300 mt-6 mb-12">
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

              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed text-center font-semibold p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                We appreciate your understanding and look forward to serving you with healthy, delicious meals!
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
