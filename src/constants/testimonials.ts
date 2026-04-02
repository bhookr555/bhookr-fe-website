/**
 * Testimonials Configuration
 */

export interface Testimonial {
  name: string;
  profession: string;
  city: string;
  locality: string;
  plan: string;
  image: string;
  rating: number;
  feedback: string;
  usp: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Vamshi Kurapati",
    profession: "Entrepreneur, YouTuber",
    city: "Hyderabad",
    locality: "Madhapur",
    plan: "BHOOKR ELITE PLAN",
    image: "/testimonials/vamshi.avif",
    rating: 5,
    feedback: "Tried BHOOKR and honestly super happy with it. The steamed chicken is my all-time favorite—clean, lean, and a really good protein source. Meals feel practical and easy to stick to, not fancy stuff you can't follow daily. Service is top-notch too. Would definitely recommend BHOOKR to anyone trying to live healthier.",
    usp: "Clean Protein & Practical Meals"
  },
  {
    name: "Dharsana",
    profession: "Yoga Practitioner",
    city: "Hyderabad",
    locality: "Gachibowli",
    plan: "BHOOKR STANDARD PLAN",
    image: "/testimonials/girl.avif",
    rating: 5,
    feedback: "Right place for those who prefer nutritious and balanced diet and look forward to get a healthy and fit body.",
    usp: "Nutritious & Balanced Diet"
  },
  {
    name: "Tarun Raidu",
    profession: "IT Employee",
    city: "Hyderabad",
    locality: "Banjara Hills",
    plan: "BHOOKR ELITE PLAN",
    image: "/testimonials/boy.avif",
    rating: 5,
    feedback: "A dream cloud kitchen I was looking forward. Where health meets with taste and hygiene meets with quality. Impressed by BHOOKR and the team. Kudos!!",
    usp: "Health, Taste & Hygiene"
  },
  {
    name: "Bhavana Reddy",
    profession: "Pediatrician",
    city: "Hyderabad",
    locality: "HITEC City",
    plan: "BHOOKR STANDARD PLAN",
    image: "/testimonials/bhavana.jpeg",
    rating: 5,
    feedback: "I'm a pediatrician from Kerala, and finding food that matches my requirements in Hyderabad was not easy. BHOOKR understood my needs perfectly and customized everything exactly the way I wanted. I'm completely satisfied with the meals and really impressed by the team's attention—even the smallest details are taken care of. Truly happy with the service.",
    usp: "Customized Meals & Attention to Detail"
  },
  {
    name: "Radhika",
    profession: "Advocate",
    city: "Hyderabad",
    locality: "Kukatpally",
    plan: "BHOOKR ELITE PLAN",
    image: "/testimonials/radhika.avif",
    rating: 5,
    feedback: "BHOOKR always understands and satisfies my needs. They're very flexible and keep things simple—no complex food, just clean and good eating. I'm really happy with the service and would recommend it to anyone looking to eat healthy.",
    usp: "Flexible & Simple Clean Eating"
  },
  {
    name: "Bhimesh",
    profession: "Powerlifter",
    city: "Hyderabad",
    locality: "Jubilee Hills",
    plan: "BHOOKR LITE PLAN",
    image: "/testimonials/bhimesh.jpeg",
    rating: 5,
    feedback: "I was on a strict diet and needed heavy protein, and BHOOKR handled it really well. The meals were clean, on point, and exactly what I needed for my nutrition. Choosing BHOOKR for my diet was a good decision, and I definitely recommend it to all my friends and fitness lovers.",
    usp: "High Protein & Clean Nutrition"
  }
];
