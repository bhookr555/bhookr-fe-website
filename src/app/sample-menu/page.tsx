"use client";

import { useState } from "react";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { FoodLabel, type FoodType } from "@/components/shared/food-label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

interface SubscriptionMenuItem {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  breakfastProtein: string;
  lunchProtein: string;
  dinnerProtein: string;
}

const nonVegMenu: SubscriptionMenuItem[] = [
  {
    day: "Day 1",
    breakfast: "Egg White Omelette with Spinach and Whole-Wheat Toast",
    lunch: "Chicken Millet Biryani",
    dinner: "Grilled Fish/Chicken Steamed Vegetables",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
  {
    day: "Day 2",
    breakfast: "Boiled Eggs Avocado and Multigrain Crackers",
    lunch: "Chicken Curry with Brown Rice",
    dinner: "Chicken Wheat Wraps",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
  {
    day: "Day 3",
    breakfast: "Millet Egg Dosa Peanut Chutney",
    lunch: "Chicken Burrito Bowl",
    dinner: "Chicken Salad Bowl",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
  {
    day: "Day 4",
    breakfast: "Boiled Egg Millet Sandwich",
    lunch: "Chicken Chinese Rice with Brown Rice",
    dinner: "Grilled Spinach Chicken Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
  {
    day: "Day 5",
    breakfast: "Egg and Vegetable Frittata",
    lunch: "Chicken Tikka Bowl",
    dinner: "Alfredo Chicken Pastha",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
  {
    day: "Day 6",
    breakfast: "Oats Pepeprs Omlette",
    lunch: "Donne Chicken Pulav (Single Brown)",
    dinner: "Lemonide Chicken Salad Bowl",
    breakfastProtein: "15-18gm",
    lunchProtein: "30-35gm",
    dinnerProtein: "30-35gm",
  },
];

const vegMenu: SubscriptionMenuItem[] = [
  {
    day: "Day 1",
    breakfast: "Quinoa Upma",
    lunch: "Rajma Millet Bowl",
    dinner: "Panner Stir-Fry with Vegetables",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 2",
    breakfast: "Millet Idly, Peanut Chutney",
    lunch: "Vegetable Paneer Pulav",
    dinner: "Panner Multi Grain Wrap",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 3",
    breakfast: "Fermented Curd Rice",
    lunch: "Veg Protein Burrito Bowl",
    dinner: "Grilled Panner/Tofu Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 4",
    breakfast: "Panner Bhurji Toast",
    lunch: "Palak Mattar Panner, Phulka/Br.Rice",
    dinner: "Mixed Beans Protein Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 5",
    breakfast: "Multi Grain Parata Yogurt",
    lunch: "Rajma Chickpea Curry Garlic Ragi Phulka",
    dinner: "Vegetable Burrito Bowl",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 6",
    breakfast: "Ragi Porridge with Nuts",
    lunch: "Vegetable Kofta Curry Millet Roti",
    dinner: "Zucchini Noodles with Lentil Sauce",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
];

const veganMenu: SubscriptionMenuItem[] = [
  {
    day: "Day 1",
    breakfast: "Quinoa Upma",
    lunch: "Rajma Millet Bowl",
    dinner: "Tofuu Stir-Fry with Vegetables",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 2",
    breakfast: "Millet Idly, Peanut Chutney",
    lunch: "Vegetable Tofu Pulav",
    dinner: "Chickpeas Beetroot Tacos",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 3",
    breakfast: "Sprouted Chena, Moong Meal",
    lunch: "Veg Protein Burrito Bowl",
    dinner: "Grilled Panner/Tofu Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 4",
    breakfast: "Tofu Bhurji Toast",
    lunch: "Palak Mattar Soya, Phulka/Br.Rice",
    dinner: "Mixed Beans Protein Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 5",
    breakfast: "Multi Grain Parata Tomato Pickle",
    lunch: "Rajma Chickpea Curry Garlic Ragi Phulka",
    dinner: "Vegetable Burrito Bowl, Sauted Soya",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 6",
    breakfast: "Oat Meal(Non Dairy)",
    lunch: "Vegetable Kofta Curry Millet Roti",
    dinner: "Zucchini Noodles with Tofu Lentil Sauce",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
];

const eggeterianMenu: SubscriptionMenuItem[] = [
  {
    day: "Day 1",
    breakfast: "Egg White Upma",
    lunch: "Boiled Egg Curry with Brown Rice",
    dinner: "Egg Salad Bowl",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 2",
    breakfast: "Millet Egg Dosa",
    lunch: "Egg Pulav, Raitha",
    dinner: "Egg Stir-Fry with Steamed Broccoli",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 3",
    breakfast: "Raghi Pan Cakes",
    lunch: "Egg Protein Burrito Bowl",
    dinner: "Garlic Egg Salad Roll",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 4",
    breakfast: "Egg and Avocado Toast",
    lunch: "Herbed Egg Bowl with Grilled Vegetables",
    dinner: "Egg and Chickpea Salad",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 5",
    breakfast: "Egg Paratha Roll(Wheat)",
    lunch: "Egg Tikka with Vegetable Pulao",
    dinner: "Egg and Lentil Soup",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
  {
    day: "Day 6",
    breakfast: "Omelette with Indian Masala and Whole-Wheat Roti",
    lunch: "Egg Curry with Red Rice",
    dinner: "Egg Peppers Wrap with Cheese",
    breakfastProtein: "15-18gm",
    lunchProtein: "25-30gm",
    dinnerProtein: "25-30gm",
  },
];

const menuData = {
  nonveg: { title: "Non-Veg", menu: nonVegMenu, foodType: "non-veg" as FoodType },
  veg: { title: "Veg", menu: vegMenu, foodType: "veg" as FoodType },
  vegan: { title: "Vegan", menu: veganMenu, foodType: "vegan" as FoodType },
  eggeterian: { title: "Eggeterian", menu: eggeterianMenu, foodType: "egg" as FoodType },
};

export default function SubscriptionMenuPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "nonveg") as keyof typeof menuData;
  const [selectedMenuType, setSelectedMenuType] = useState<keyof typeof menuData>(type);

  const currentMenu = menuData[selectedMenuType];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12 md:px-6 md:py-16 lg:py-20 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 sm:mb-6 md:mb-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                Sample <span className="text-gradient-red">Subscription Menu</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-6 px-2 sm:px-4">
                Here&apos;s a sample weekly menu for {currentMenu.title} subscribers. Actual menus may vary based on availability and seasonality.
              </p>
            </div>
          </div>
        </section>

        {/* Menu Type Selector */}
        <section className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:py-6 md:py-8 md:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
              {Object.entries(menuData).map(([key, data]) => (
                <Button
                  key={key}
                  variant={selectedMenuType === key ? "default" : "outline"}
                  className={`touch-manipulation px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base lg:text-lg font-semibold ${
                    selectedMenuType === key
                      ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                      : "hover:bg-red-50 dark:hover:bg-gray-800 active:bg-red-100"
                  }`}
                  onClick={() => setSelectedMenuType(key as keyof typeof menuData)}
                >
                  <FoodLabel type={data.foodType} size="sm" />
                  <span className="hidden xs:inline ml-1.5">{data.title}</span>
                  <span className="xs:hidden">{data.title.split(' ')[0]}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Weekly Menu */}
        <section className="w-full bg-white dark:bg-gray-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12 md:px-6 md:py-16 lg:py-20 lg:px-8">
            <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {currentMenu.menu.map((dayMenu, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 sm:p-5 md:p-6">
                    <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold">
                      {dayMenu.day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-1 sm:mb-1.5">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          🌅 BREAKFAST
                        </h3>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {dayMenu.breakfastProtein} Protein
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm md:text-base text-gray-900 dark:text-white font-medium uppercase">
                        {dayMenu.breakfast}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-1 sm:mb-1.5">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          🍱 LUNCH
                        </h3>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {dayMenu.lunchProtein} Protein
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm md:text-base text-gray-900 dark:text-white font-medium uppercase">
                        {dayMenu.lunch}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-1 sm:mb-1.5">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          🌙 DINNER
                        </h3>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {dayMenu.dinnerProtein} Protein
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm md:text-base text-gray-900 dark:text-white font-medium uppercase">
                        {dayMenu.dinner}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Call to Action */}
            <div className="mt-10 sm:mt-12 md:mt-16 lg:mt-20 text-center">
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 max-w-2xl mx-auto">
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 md:mb-6 text-gray-900 dark:text-white">
                  Ready to Start Your Journey?
                </h3>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 md:mb-8 px-2 sm:px-4">
                  Subscribe to BHOOKR and enjoy fresh, healthy meals delivered daily. All meals are customizable based on your preferences and dietary requirements.
                </p>
                <Button 
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white touch-manipulation px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold"
                  asChild
                >
                  <a href="/subscribe">Subscribe Now</a>
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
