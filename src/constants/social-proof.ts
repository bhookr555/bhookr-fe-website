/**
 * Client Transformations Configuration
 */

export interface ClientTransformation {
  beforeImage: string;
  afterImage: string;
  clientName: string;
  clientRole: string;
  weightLoss: string;
  days: string;
  rating: string;
  testimonial: string;
}

export const CLIENT_TRANSFORMATIONS: ClientTransformation[] = [
  {
    beforeImage: "/transformations/before1.avif",
    afterImage: "/transformations/after1.avif",
    clientName: "Pranay Kumar",
    clientRole: "Business Owner, Hyderabad",
    weightLoss: "-20kg",
    days: "120",
    rating: "5★",
    testimonial: `I've lost <strong class="text-[#E31E24] font-black">almost 20 kgs</strong> with BHOOKR, and honestly it never felt like a <strong class="text-[#E31E24] font-black">'diet'</strong>. 
      The meals were always <strong class="text-[#E31E24] font-black">fresh, tasty, and customized</strong> exactly for my weight-loss needs. 
      I didn't have to think about cooking or what to eat every day — everything was <strong class="text-[#E31E24] font-black">handled smoothly</strong>.
      Because of BHOOKR, I could <strong class="text-[#E31E24] font-black">focus completely on my business</strong> without worrying about my food. 
      The team is very friendly, supportive, and always responsive. If you're serious about losing weight and want something practical that <strong class="text-[#E31E24] font-black">actually works in real life</strong>, BHOOKR is a great choice.`,
  },
  {
    beforeImage: "/transformations/before2.avif",
    afterImage: "/transformations/after2.avif",
    clientName: "Shivaraju",
    clientRole: "Accountant, Hyderabad",
    weightLoss: "-15kg",
    days: "90",
    rating: "5★",
    testimonial: `I'm Shivaraju, an <strong class="text-[#E31E24] font-black">accountant and a bachelor</strong> living away from home. 
      Because I couldn't cook, I was mostly eating junk food and ended up <strong class="text-[#E31E24] font-black">gaining a lot of weight</strong>. 
      After starting with BHOOKR, things <strong class="text-[#E31E24] font-black">changed completely</strong>.
      They made <strong class="text-[#E31E24] font-black">healthy eating very easy and convenient</strong> for me. 
      The meals are tasty, <strong class="text-[#E31E24] font-black">oil-free, and well-balanced</strong>, which helped me manage my weight properly and stay consistent. 
      Thanks to BHOOKR, I'm now able to <strong class="text-[#E31E24] font-black">focus on my work</strong> without worrying about my food every day.`,
  },
];

/**
 * Trust Badges Configuration
 */
export interface TrustBadge {
  value: string;
  label: string;
}

export const TRUST_BADGES: TrustBadge[] = [
  { value: "500+", label: "Transformations" },
  { value: "4.9★", label: "Rating" },
  { value: "100%", label: "Natural" }
];
