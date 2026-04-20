import { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about BHOOKR and our mission",
};

const DIFFERENTIATORS = [
  {
    title: "Fresh Daily",
    description:
      "Every meal is prepared fresh each morning — never frozen, never reheated. You taste the difference.",
  },
  {
    title: "Quality Ingredients",
    description:
      "We source premium, locally grown produce and high-grade proteins to keep your meals clean and wholesome.",
  },
  {
    title: "Nutritionist Approved",
    description:
      "Every recipe is reviewed by certified nutritionists to ensure the right macros for your health goals.",
  },
  {
    title: "Flexible Plans",
    description:
      "Daily, weekly, or monthly — choose what works for you. Pause or switch anytime, no questions asked.",
  },
  {
    title: "Sustainable",
    description:
      "Eco-friendly packaging, minimal food waste, and responsible sourcing — because the planet matters too.",
  },
  {
    title: "Protein Rich",
    description:
      "Every meal is engineered around high-quality protein to fuel your performance and keep you fuller longer.",
  },
];

const STATS = [
  { value: "50K+", label: "Meals Delivered" },
  { value: "12+", label: "Cities Served" },
  { value: "4.8★", label: "Average Rating" },
  { value: "2022", label: "Founded" },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative w-full overflow-hidden bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* subtle radial accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#E31E24]/10 blur-3xl"
          />
          <div className="container-responsive relative z-10 py-14 sm:py-16 md:py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-4 inline-block rounded-full bg-[#E31E24]/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-[#E31E24]">
                Our Story
              </span>
              <h1 className="mb-5 leading-tight sm:mb-6">
                About <span className="text-gradient-red">BHOOKR</span>
              </h1>
              <p className="px-2 text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:px-4 sm:text-lg md:text-xl lg:text-2xl">
                Welcome to BHOOKR, where we believe healthy eating should be
                convenient, delicious, and accessible to everyone.
              </p>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section className="w-full border-y border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="container-responsive grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="py-6 text-center">
                <p className="text-2xl font-bold text-[#E31E24] sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Story / Mission / Vision ── */}
        <section className="relative mb-16 w-full overflow-hidden sm:mb-20" style={{ background: "#ffffff" }}>
          <div className="container-responsive relative z-10 grid grid-cols-1 items-center gap-0 lg:min-h-[680px] lg:grid-cols-2">

            {/* Left — text content */}
            <div className="space-y-10 py-12 pr-0 lg:py-20 lg:pr-16">
              <div>
                <h2 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
                  Our Story
                </h2>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                  Founded in 2022, BHOOKR started with a simple mission: to
                  make nutritious, chef-prepared meals available to busy
                  professionals and health-conscious individuals who don't have
                  time to cook.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                  Our Mission
                </h2>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                  We make sure that at least there will be one consumer of
                  BHOOKR in every household across Metropolitan Cities.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                  Our Vision
                </h2>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                  To become India's most trusted protein meal delivery company
                  and be a meaningful part of everyone's daily life.
                </p>
              </div>
            </div>

            {/* Right — full founder image, visible on all screens */}
            <div className="relative flex h-[420px] items-end justify-center lg:h-[680px]" style={{ background: "#ffffff" }}>
              <Image
                src="/founder.jpg"
                alt="Founder of BHOOKR"
                width={520}
                height={680}
                className="relative z-10 h-full w-auto max-w-full object-contain object-bottom"
                priority
              />
              {/* Fade left edge */}
              <div className="absolute inset-y-0 left-0 z-20 w-16 lg:w-24" style={{ background: "linear-gradient(to right, #ffffff, transparent)" }} />
              {/* Fade bottom */}
              <div className="absolute inset-x-0 bottom-0 z-20 h-16" style={{ background: "linear-gradient(to top, #ffffff, transparent)" }} />
              {/* Fade top */}
              <div className="absolute inset-x-0 top-0 z-20 h-12" style={{ background: "linear-gradient(to bottom, #ffffff, transparent)" }} />
            </div>

          </div>
        </section>

        {/* ── What Makes Us Different ── */}
        <section className="w-full bg-gray-50 dark:bg-gray-950">
          <div className="container-responsive section-padding">

            <div className="mb-10 text-center sm:mb-12">
              <span className="mb-3 inline-block rounded-full bg-[#E31E24]/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-[#E31E24]">
                Why BHOOKR
              </span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl md:text-5xl">
                What Makes Us Different
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                We obsess over every detail so you can focus on what matters most.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {DIFFERENTIATORS.map(({ title, description }) => (
                <div
                  key={title}
                  className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E31E24] transition-transform duration-300 group-hover:scale-110">
                      {/* checkmark via SVG for crisp rendering */}
                      <svg
                        className="h-4 w-4 text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8l3.5 3.5L13 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                        {title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── CTA ── */}
        <section className="w-full bg-[#E31E24]">
          <div className="container-responsive py-12 text-center sm:py-16">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Ready to eat better, every day?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-base text-red-100 sm:text-lg">
              Join thousands of happy customers who've made BHOOKR a part of
              their daily routine.
            </p>
            <a
              href="/menu"
              className="inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-[#E31E24] transition-transform duration-200 hover:scale-105 hover:shadow-lg"
            >
              Explore Our Menu
            </a>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
