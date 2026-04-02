import { Metadata } from "next";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { ContactFormComponent } from "@/components/forms/contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with BHOOKR",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-linear-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container-responsive py-10 sm:py-12 md:py-14 lg:py-16 xl:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 sm:mb-5 md:mb-6 lg:mb-7 leading-tight">Contact <span className="text-gradient-red">Us</span></h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300">
                We&apos;d love to hear from you!
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="container-responsive section-padding">
            <div className="grid gap-6 sm:gap-8 md:gap-10 lg:gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <div>
              <ContactFormComponent />
            </div>

            {/* Contact Information */}
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href="mailto:bhookr555@gmail.com"
                    className="text-primary hover:underline"
                  >
                    bhookr555@gmail.com
                  </a>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We typically respond within 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Phone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href="tel:+919542762906"
                    className="text-primary hover:underline"
                  >
                    +91 95427 62906
                  </a>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mon-Sat: 9:00 AM - 6:00 PM IST
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <address className="not-italic">
                    BHOOKR CLOUD KITCHEN PRIVATE LIMITED
                    <br />
                    Hyderabad, Telangana
                    <br />
                    Telangana, India
                  </address>
                </CardContent>
              </Card>
            </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
