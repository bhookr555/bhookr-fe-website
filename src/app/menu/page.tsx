"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { FoodLabel } from "@/components/shared/food-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, ShoppingCart, Plus, Minus, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import type { MealPlan } from "@/types";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  protein?: string;
  carbs?: string;
  calories: string;
  fibreRich?: boolean;
  image?: string;
}

const menuItems: MenuItem[] = [
  // Promotional Special
  {
    id: "promo-1",
    name: "BHOOKR'S CHICKEN BURRITO BOWL ",
    description: "A bold and hearty bowl packed with tender grilled chicken, seasoned rice, black beans, fresh pico de gallo, creamy guacamole, and a drizzle of our smoky chipotle sauce — all stacked together for a wholesome, high-protein meal that hits every flavor note. Built for the hungry, made for the healthy.",
    price: 1,
    category: "BHOOKR Special",
    calories: "420k",
    image: "/menucard/BHOOKR SPECIALS/Steam Chicken Bowl.avif",
  },
  // Indian
  {
    id: "indian-1",
    name: "BHOOKR's Chicken Pulav (Spinach Flavour)",
    description: "Tender chicken breast slow-cooked with fragrant rice, minimal oil, and mild spices—clean, comforting, and protein-rich. A light yet satisfying meal crafted for everyday fitness and guilt-free indulgence.",
    price: 279,
    category: "Indian",
    protein: "40g",
    carbs: "55g",
    calories: "800k+",
    fibreRich: true,
    image: "/menucard/indian/BHOOKR's Chicken Pulav (Spinach Flavour).avif",
  },
  {
    id: "indian-2",
    name: "BHOOKR's Paneer Pulav (Spinach Flavour)",
    description: "Soft, protein-rich paneer tossed with aromatic rice, subtle spices, and low oil—light on the stomach, rich in flavor, and perfectly balanced for a clean, wholesome meal.",
    price: 259,
    category: "Indian",
    protein: "29g",
    carbs: "54g",
    calories: "850k+",
    fibreRich: true,
    image: "/menucard/indian/Paneer Pulav (Spinach Flavour).avif",
  },
  {
    id: "indian-3",
    name: "Karepaku Chicken Meal",
    description: "Our signature favorite—succulent chicken cooked with fresh curry leaves, gentle spices, and low oil for an authentic South Indian aroma and clean taste. Comforting, protein-packed, and truly BHOOKR at heart.",
    price: 279,
    category: "Indian",
    protein: "35g+",
    carbs: "35g",
    calories: "850k+",
    image: "/menucard/indian/karepaku chicken meal.avif",
  },
  {
    id: "indian-4",
    name: "Garlic Chicken Fusion Bowl",
    description: "Crazy-sautéed garlic chicken paired with vegetable-loaded rice and a generous dose of fiber. Bold flavors, high protein, and clean carbs—built to fuel your day without the heaviness.",
    price: 279,
    category: "Indian",
    protein: "40g",
    carbs: "40g",
    calories: "800k",
    image: "/menucard/indian/Garlic Chicken Fusion Bowl.avif",
  },
  {
    id: "indian-5",
    name: "Raju Gari Kodi Pulav (Fusion Meal)",
    description: "A classic Andhra favorite reimagined—succulent chicken cooked in Raju Gari style with brown rice, low oil, and balanced spices. All the bold tradition, made clean, light, and fitness-friendly.",
    price: 299,
    category: "Indian",
    protein: "35g+",
    carbs: "45g",
    calories: "900k",
    fibreRich: true,
    image: "/menucard/indian/Raju Gari Kodi Pulav (Fusion Meal).avif",
  },
  {
    id: "indian-6",
    name: "Palak Paneer Curry with Multigrain Garlic Phulka",
    description: "Creamy spinach-based curry with soft paneer, cooked light and clean, served alongside soft multigrain phulkas. A wholesome blend of protein, fiber, and comfort—balanced for everyday fitness.",
    price: 259,
    category: "Indian",
    protein: "28g",
    carbs: "48g",
    calories: "810k",
    image: "/menucard/indian/Palak Paneer Curry with Multigrain Garlic Phulka.avif",
  },
  // Continental
  {
    id: "continental-1",
    name: "White Sauce Chicken Pasta (Fusion)",
    description: "Creamy white sauce crafted purely from vegetables—no corn starch, no heaviness—tossed with perfectly cooked pasta. Comforting, clean, and guilt-free, made the BHOOKR healthy way.",
    price: 319,
    category: "Continental",
    protein: "40g",
    carbs: "58g",
    calories: "950k+",
    fibreRich: true,
    image: "/menucard/Continental/White Sauce Chicken Pasta.avif",
  },
  {
    id: "continental-2",
    name: "White Sauce Cottage Cheese Pasta (Fusion)",
    description: "Creamy white sauce made purely from vegetables—no corn starch—tossed with pasta and protein-rich cottage cheese. Smooth, satisfying, and completely guilt-free, crafted the healthy BHOOKR way.",
    price: 299,
    category: "Continental",
    protein: "28g",
    carbs: "54g",
    calories: "900k",
    fibreRich: true,
    image: "/menucard/Continental/White Sauce Cottage Cheese Pasta.avif",
  },
  {
    id: "continental-3",
    name: "Multigrain Chicken Pizza (Fusion)",
    description: "A wholesome multigrain base topped with lean chicken, fresh vegetables, and balanced seasoning—light, protein-packed, and satisfying without the guilt.",
    price: 369,
    category: "Continental",
    protein: "47g",
    carbs: "39g",
    calories: "600k",
    image: "/menucard/Continental/Multigrain Chicken Pizza.avif",
  },
  {
    id: "continental-4",
    name: "Multigrain Paneer Pizza (Fusion)",
    description: "A wholesome multigrain base topped with protein-rich cottage cheese, fresh vegetables, and light seasoning—crisp, flavorful, and guilt-free.",
    price: 349,
    category: "Continental",
    protein: "35g",
    carbs: "39g",
    calories: "600k",
    image: "/menucard/Continental/Multigrain Paneer Pizza.avif",
  },
  {
    id: "continental-5",
    name: "Grilled Chicken Salad",
    description: "Juicy grilled chicken with fresh, crunchy vegetables—made with zero oil and packed with lean protein and fiber. Light, clean, and perfectly satisfying.",
    price: 289,
    category: "Continental",
    protein: "45g",
    calories: "420k",
    fibreRich: true,
    image: "/menucard/Continental/grilled chicken salad.avif",
  },
  {
    id: "continental-6",
    name: "Grilled Paneer Salad",
    description: "Perfectly grilled cottage cheese with fresh, crunchy vegetables—made with zero oil and loaded with protein and fiber. Light, clean, and refreshing.",
    price: 269,
    category: "Continental",
    protein: "27g",
    calories: "450k",
    fibreRich: true,
    image: "/menucard/Continental/Grilled panner salad.avif",
  },
  {
    id: "continental-7",
    name: "BHOOKR's Chicken Salad",
    description: "Made with our authentic in-house chicken marination, grilled to perfection and tossed with fresh vegetables. Clean, protein-rich, and unmistakably BHOOKR in every bite.",
    price: 279,
    category: "Continental",
    protein: "40g",
    calories: "420k",
    fibreRich: true,
    image: "/menucard/Continental/BHOOKR's Chicken Salad.avif",
  },
  {
    id: "continental-8",
    name: "BHOOKR's Grilled Fish Salad",
    description: "Fresh fish grilled to perfection and paired with crisp vegetables—light, clean, and rich in lean protein. A refreshing, wholesome bowl made the BHOOKR way.",
    price: 299,
    category: "Continental",
    protein: "40g",
    calories: "400k",
    fibreRich: true,
    image: "/menucard/Continental/BHOOKR's Grilled Fish Salad.avif",
  },
  // Millet Friendly
  {
    id: "millet-1",
    name: "Millet Chicken Pulav",
    description: "Flavorful chicken cooked with little millet, mild spices, and minimal oil—light, wholesome, and surprisingly delicious. Clean carbs, high protein, and great taste in every bite.",
    price: 299,
    category: "Millet Friendly",
    protein: "41g",
    carbs: "40g",
    calories: "790k",
    fibreRich: true,
    image: "/menucard/Millet friendly/Millet chicken pulav.avif",
  },
  {
    id: "millet-2",
    name: "Millet Paneer Pulav",
    description: "Flavorful paneer cooked with little millet, mild spices, and minimal oil—light, wholesome, and surprisingly delicious. Clean carbs, high protein, and great taste in every bite.",
    price: 279,
    category: "Millet Friendly",
    protein: "28g",
    carbs: "40g",
    calories: "760k",
    fibreRich: true,
    image: "/menucard/Millet friendly/millet panner pulav.avif",
  },
  {
    id: "millet-3",
    name: "Ragi Sankati, Methi Chicken Curry",
    description: "Traditional ragi sankati paired with slow-cooked methi chicken curry—rich in fiber, high in protein, and cooked light with balanced spices. Rustic, nourishing, and deeply satisfying.",
    price: 299,
    category: "Millet Friendly",
    protein: "35g",
    carbs: "30g",
    calories: "620k",
    image: "/menucard/Millet friendly/Ragi Sankati, Methi Chicken Curry.avif",
  },
  {
    id: "millet-4",
    name: "Millet Chicken Wrap",
    description: "Tender chicken and fresh veggies wrapped in a wholesome millet roti—low on oil, high on protein, and perfect for a healthy, on-the-go meal.",
    price: 219,
    category: "Millet Friendly",
    protein: "40g",
    carbs: "30g",
    calories: "480k",
    fibreRich: true,
    image: "/menucard/Millet friendly/Millet Chicken Wrap.avif",
  },
  {
    id: "millet-5",
    name: "Millet Paneer Wrap",
    description: "Soft paneer and fresh veggies wrapped in a wholesome millet roti—low on oil, high on protein, and perfect for a healthy, on-the-go meal.",
    price: 199,
    category: "Millet Friendly",
    protein: "27g",
    carbs: "30g",
    calories: "480k",
    fibreRich: true,
    image: "/menucard/Millet friendly/millet panner wrap.avif",
  },
  // BHOOKR Special
  {
    id: "special-1",
    name: "Fermented Choco Oats Bowl",
    description: "Rich, creamy oats naturally fermented and blended with chocolate goodness—high in fiber, gut-friendly, and a guilt-free treat to kickstart your day.",
    price: 219,
    category: "BHOOKR Special",
    protein: "20g+",
    carbs: "45g+",
    calories: "490k",
    image: "/menucard/BHOOKR SPECIALS/Fermented Choco Oats Bowl.avif",
  },
  {
    id: "special-2",
    name: "Fermented Hazelnut Oats Dessert",
    description: "Creamy, indulgent oats blended with rich hazelnuts—naturally wholesome, fiber-packed, and a guilt-free dessert that feels like a treat.",
    price: 229,
    category: "BHOOKR Special",
    protein: "24g",
    carbs: "46g",
    calories: "470k",
    image: "/menucard/BHOOKR SPECIALS/Fermented Hazelnut Oats Dessert.avif",
  },
  {
    id: "special-3",
    name: "Fermented Dry Fruits Oats Bowl",
    description: "Naturally fermented oats mixed with crunchy, nutrient-rich dry fruits—high in fiber, gut-friendly, and a wholesome, energizing start to your day.",
    price: 249,
    category: "BHOOKR Special",
    protein: "27g",
    carbs: "46g",
    calories: "500k",
    image: "/menucard/BHOOKR SPECIALS/Fermented Dry Fruits Oats Bowl.avif",
  },
  {
    id: "special-4",
    name: "Detox Pickle Water (NEW) Combo",
    description: "Three refreshing jars of goodness—vegetable pickle water, cinnamon detox, and mint-lemon chia with dry fruits. Soaked overnight and served fresh in the morning, each sip aids detoxification and kickstarts your day naturally.",
    price: 339,
    category: "BHOOKR Special",
    calories: "Varies",
    image: "/menucard/BHOOKR SPECIALS/Detox Pickle Water (NEW) Combo.avif",
  },
  {
    id: "special-5",
    name: "Steam Chicken Bowl",
    description: "Our best-selling chicken, marinated in BHOOKR's signature spices, served with high-fiber, wholesome carbs—completely zero-oil, clean, and protein-packed.",
    price: 259,
    category: "BHOOKR Special",
    protein: "42g",
    carbs: "40g",
    calories: "600k",
    fibreRich: true,
    image: "/menucard/BHOOKR SPECIALS/Steam Chicken Bowl.avif",
  },
  {
    id: "special-6",
    name: "Lemonide Chicken Bowl",
    description: "Tender chicken marinated in BHOOKR's zesty, unique blend, steamed to perfection with zero oil—high in protein, lean, and perfect for building muscle while keeping it light and clean.",
    price: 259,
    category: "BHOOKR Special",
    protein: "41g",
    carbs: "40g",
    calories: "600k",
    fibreRich: true,
    image: "/menucard/BHOOKR SPECIALS/Lemonide Chicken Bowl.avif",
  },
];

const categories = [
  { id: "all", label: "All" },
  { id: "Indian", label: "Indian" },
  { id: "Continental", label: "Continental" },
  { id: "Millet Friendly", label: "Millet Friendly" },
  { id: "BHOOKR Special", label: "BHOOKR Special" },
];

export default function MenuPage() {
  const router = useRouter();
  const { items: cartItems, addItem, removeItem, updateQuantity } = useCartStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Get quantity of item in cart
  const getItemQuantity = (itemId: string) => {
    const cartItem = cartItems.find(item => item.planId === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Convert MenuItem to MealPlan for cart
  const convertToMealPlan = (item: MenuItem): MealPlan => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      duration: "one-time",
      features: [
        `${item.calories} calories`,
        item.protein ? `Protein: ${item.protein}` : "",
        item.carbs ? `Carbs: ${item.carbs}` : "",
        item.fibreRich ? "Fibre Rich" : ""
      ].filter(Boolean),
      image: item.image,
    };
  };

  // Handle add to cart
  const handleAddToCart = (item: MenuItem) => {
    const mealPlan = convertToMealPlan(item);
    addItem(mealPlan);
    toast.success(`${item.name} added to cart!`);
  };

  // Handle quantity change
  const handleQuantityChange = (item: MenuItem, change: number) => {
    const currentQty = getItemQuantity(item.id);
    const newQty = currentQty + change;
    
    if (newQty <= 0) {
      removeItem(item.id);
      toast.success(`${item.name} removed from cart`);
      return;
    }
    
    updateQuantity(item.id, newQty);
  };

  // Handle go to cart
  const handleGoToCart = () => {
    router.push("/cart");
  };

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const displayedItems = showAll ? filteredItems : filteredItems.slice(0, 9);
  const hasMore = filteredItems.length > 9;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden bg-linear-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container-responsive py-6 sm:py-8 md:py-10 lg:py-12 xl:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-tight wrap-break-word">
                Explore Our <span className="text-gradient-red">Menu</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-5 sm:mb-6 md:mb-7 lg:mb-8 leading-relaxed px-2">
                Experience BHOOKR&apos;s commitment to health, taste, and quality. Every meal is crafted with minimal oil, 
                balanced nutrition, and authentic flavors—designed to fuel your fitness goals without compromising on taste.
              </p>
              
              {/* Pre-Order Banner - Touch optimized */}
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-0">
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-white text-center wrap-break-word">
                    Get these tomorrow - Pre-Order now!
                  </h2>
                  <button
                    onClick={() => setShowInfoDialog(true)}
                    className="touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full p-1"
                    aria-label="Show pre-ordering information"
                  >
                    <Info className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-600 dark:text-red-400 cursor-pointer hover:text-red-700 active:text-red-800 transition-colors" />
                  </button>
                </div>
              </div>

              {/* Pre-Order Info Dialog */}
              <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
                <DialogContent className="max-w-[90vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      Pre-Ordering Terms & Conditions
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Information about pre-ordering requirements and conditions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    <div className="flex gap-2 sm:gap-3">
                      <span className="text-red-600 font-bold shrink-0">1.</span>
                      <p>Pre-Ordering is available only between 9:00 AM - 5:00 PM</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="text-red-600 font-bold shrink-0">2.</span>
                      <p>These are special and most selling items in BHOOKR. To experience more dishes, please subscribe to BHOOKR</p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <span className="text-red-600 font-bold shrink-0">3.</span>
                      <p>A fixed delivery cost of ₹99/- is applicable</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Menu Section */}
        <section className="w-full overflow-hidden bg-white dark:bg-gray-900">
          <div className="container-responsive section-padding-sm">
            {/* Categories - Touch optimized */}
            <div className="mb-6 sm:mb-7 md:mb-8 lg:mb-10 flex flex-wrap justify-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="cursor-pointer touch-manipulation px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium hover:bg-red-600 hover:text-white transition-all active:scale-95 min-h-[44px] flex items-center justify-center"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowAll(false);
                  }}
                >
                  {category.label}
                </Badge>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid-responsive-3 mb-8 sm:mb-10 md:mb-12 lg:mb-14">
              {displayedItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col border-2 hover:border-[#E31E24]/30">
                  <div className="relative h-48 sm:h-52 md:h-56 lg:h-60 xl:h-64 w-full overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        priority={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl">🍽️</span>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl leading-snug flex-1">{item.name}</CardTitle>
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-600 whitespace-nowrap shrink-0">
                        ₹{item.price}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 pt-0 flex flex-col flex-grow space-y-3 sm:space-y-4">
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="space-y-2.5 sm:space-y-3 flex-grow">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {item.protein && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5">
                            Protein: {item.protein}
                          </Badge>
                        )}
                        {item.carbs && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5">
                            Carbs: {item.carbs}
                          </Badge>
                        )}
                        {item.fibreRich && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs md:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5">
                            Fibre Rich
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300">
                        {item.calories} calories
                      </p>
                    </div>
                    {getItemQuantity(item.id) > 0 ? (
                      <div className="flex items-center gap-2 mt-auto">
                        <div className="flex items-center border-2 border-red-600 rounded-lg flex-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-red-600 hover:bg-red-50"
                            onClick={() => handleQuantityChange(item, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="flex-1 text-center font-bold text-base">
                            {getItemQuantity(item.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-red-600 hover:bg-red-50"
                            onClick={() => handleQuantityChange(item, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={handleGoToCart}
                          className="h-11 bg-green-600 hover:bg-green-700 px-4"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 mt-auto touch-manipulation min-h-[44px] text-sm sm:text-base" 
                        size="default"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Add to Cart
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Show More / Show Less Button */}
            {hasMore && (
              <div className="flex justify-center mb-12 sm:mb-14 md:mb-16 lg:mb-18">
                <Button
                  onClick={() => setShowAll(!showAll)}
                  variant="outline"
                  size="lg"
                  className="px-8 sm:px-10 md:px-12 lg:px-14 py-5 sm:py-6 md:py-7 text-base sm:text-lg md:text-xl font-semibold border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white active:bg-red-700 transition-all touch-manipulation min-h-[52px]"
                >
                  {showAll ? "Show Less" : `Show More (${filteredItems.length - 9} more items)`}
                </Button>
              </div>
            )}

            {/* Subscription Menu Buttons */}
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 sm:pt-8 md:pt-10 lg:pt-12">
              <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-3 sm:mb-4 md:mb-6 break-words">
                View Our <span className="text-red-600">Subscription Menus (Samples)</span>
              </h2>
              <p className="text-center text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto">
                Subscribe to BHOOKR and enjoy a rotating menu of healthy, delicious meals tailored to your dietary preferences
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-5xl mx-auto">
                <Button 
                  className="h-auto py-5 sm:py-6 md:py-7 px-4 sm:px-5 md:px-6 bg-gradient-to-br from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:from-red-800 active:to-orange-800 text-white font-semibold text-sm sm:text-base touch-manipulation"
                  asChild
                >
                  <Link href="/sample-menu?type=nonveg">
                    <div className="flex flex-col items-center justify-center">
                      <FoodLabel type="non-veg" size="lg" />
                      <div className="text-xs sm:text-sm md:text-base mt-3">VIEW SAMPLE<br/>NON-VEG MENU</div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  className="h-auto py-5 sm:py-6 md:py-7 px-4 sm:px-5 md:px-6 bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:from-green-800 active:to-emerald-800 text-white font-semibold text-sm sm:text-base touch-manipulation"
                  asChild
                >
                  <Link href="/sample-menu?type=veg">
                    <div className="flex flex-col items-center justify-center">
                      <FoodLabel type="veg" size="lg" />
                      <div className="text-xs sm:text-sm md:text-base mt-3">VIEW SAMPLE<br/>VEG MENU</div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  className="h-auto py-5 sm:py-6 md:py-7 px-4 sm:px-5 md:px-6 bg-gradient-to-br from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 active:from-lime-800 active:to-green-800 text-white font-semibold text-sm sm:text-base touch-manipulation"
                  asChild
                >
                  <Link href="/sample-menu?type=vegan">
                    <div className="flex flex-col items-center justify-center">
                      <FoodLabel type="vegan" size="lg" />
                      <div className="text-xs sm:text-sm md:text-base mt-3">VIEW SAMPLE<br/>VEGAN MENU</div>
                    </div>
                  </Link>
                </Button>
                <Button 
                  className="h-auto py-5 sm:py-6 md:py-7 px-4 sm:px-5 md:px-6 bg-gradient-to-br from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 active:from-yellow-800 active:to-amber-800 text-white font-semibold text-sm sm:text-base touch-manipulation"
                  asChild
                >
                  <Link href="/sample-menu?type=eggeterian">
                    <div className="flex flex-col items-center justify-center">
                      <FoodLabel type="egg" size="lg" />
                      <div className="text-xs sm:text-sm md:text-base mt-3">VIEW SAMPLE<br/>EGGETERIAN MENU</div>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
