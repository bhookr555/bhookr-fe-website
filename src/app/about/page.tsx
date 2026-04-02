import { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about BHOOKR and our mission",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container-responsive py-10 sm:py-12 md:py-14 lg:py-16 xl:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-5 sm:mb-6 md:mb-7 lg:mb-8 leading-tight">
                About <span className="text-gradient-red">BHOOKR</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed px-2 sm:px-4">
                Welcome to BHOOKR, where we believe healthy eating should be
                convenient, delicious, and accessible to everyone.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section with Image */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="container-responsive section-padding">
            {/* Revolutionary Tagline */}
            <div className="text-center mb-10 sm:mb-14 md:mb-16">
              <div className="inline-block bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 px-6 py-3 sm:px-8 sm:py-4 rounded-full border-2 border-[#E31E24]/30 shadow-md">
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[#E31E24] tracking-wide">
                  A REVOLUTIONARY <span className="text-gradient-red">"FRESH"</span> HEALTHY MEAL DELIVERY SERVICE
                </p>
              </div>
            </div>

            {/* Two Equal Columns Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 mb-16 sm:mb-20">
              {/* Left Column: Story, Mission, Vision */}
              <div className="space-y-12 sm:space-y-14 lg:space-y-16">
                {/* Our Story */}
                <div>
                  <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-7">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-2xl sm:text-3xl md:text-4xl">📖</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">Our Story</h2>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed">
                    Founded in 2022, BHOOKR started with a simple mission: to make
                    nutritious, chef-prepared meals available to busy professionals
                    and health-conscious individuals who don't have time to cook.
                  </p>
                </div>

                {/* Our Mission */}
                <div>
                  <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-7">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-2xl sm:text-3xl md:text-4xl">🎯</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed">
                    We make sure that, at least there will be one consumer of BHOOKR in every household (Metropolitan Cities).
                  </p>
                </div>

                {/* Our Vision */}
                <div>
                  <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-7">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-2xl sm:text-3xl md:text-4xl">🚀</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                    Our Vision is to become India's Most trusted Protein meal delivery company and to be a part of everyone's life.
                  </p>
                </div>
              </div>

              {/* Right Column: Full Vertical Image */}
              <div className="relative w-full h-[500px] lg:h-[700px] xl:h-[800px] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/aboutus.avif"
                  alt="BHOOKR Team Member"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* What Makes Us Different - Enhanced Cards */}
            <div className="mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white text-center mb-10 sm:mb-12">
                What Makes Us Different
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Fresh Daily</h3>
                      <p className="text-gray-600 dark:text-gray-400">All meals are prepared fresh every morning</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Quality Ingredients</h3>
                      <p className="text-gray-600 dark:text-gray-400">We source from local farms and trusted suppliers</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nutritionist Approved</h3>
                      <p className="text-gray-600 dark:text-gray-400">Every meal is designed by nutrition experts</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Flexible Plans</h3>
                      <p className="text-gray-600 dark:text-gray-400">No long-term commitments, pause or cancel anytime</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sustainable</h3>
                      <p className="text-gray-600 dark:text-gray-400">Eco-friendly packaging and minimal food waste</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Protein Rich</h3>
                      <p className="text-gray-600 dark:text-gray-400">High-protein meals for fitness enthusiasts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
