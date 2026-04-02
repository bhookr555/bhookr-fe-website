import { Metadata } from "next";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how BHOOKR meal subscription works",
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: 1,
      title: "Choose Your Plan",
      description:
        "Select a meal plan that fits your needs and schedule.",
    },
    {
      number: 2,
      title: "We Cook & Deliver",
      description:
        "Our chefs prepare your meals fresh every morning and deliver them to your doorstep.",
    },
    {
      number: 3,
      title: "Heat & Eat",
      description:
        "Enjoy delicious, healthy food in minutes—no prep, no mess!",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container-responsive py-10 sm:py-12 md:py-14 lg:py-16 xl:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 sm:mb-5 md:mb-6 lg:mb-7 leading-tight">How <span className="text-gradient-red">BHOOKR</span> Works</h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300">
                Experience the perfect blend of convenience, quality, and taste
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="container-responsive section-padding">
            <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">
            {steps.map((step) => (
              <Card key={step.number} className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-[#E31E24]/30">
                <CardContent className="flex items-start gap-4 sm:gap-5 md:gap-6 lg:gap-8 p-5 sm:p-6 md:p-7 lg:p-8">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-18 lg:w-18 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="mb-2 sm:mb-3 md:mb-4 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">{step.title}</h3>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="w-full bg-gray-50 dark:bg-gray-800">
          <div className="container-responsive section-padding">
            <h2 className="mb-8 sm:mb-10 md:mb-12 lg:mb-14 text-center leading-tight">
              Why Choose <span className="text-gradient-red">Us</span>?
            </h2>
            <div className="mx-auto grid max-w-4xl gap-4 sm:gap-5 md:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Fresh ingredients daily",
                "No commitment required",
                "Pause or skip anytime",
                "Nutritionist-approved meals",
                "Eco-friendly packaging",
                "24/7 customer support",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                  <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
                  <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
