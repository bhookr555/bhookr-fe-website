/**
 * Sample lead rows. Mirrors the column structure of the BHOOKR Leads
 * Google Sheet so the UI can be developed end-to-end before the live
 * sheet is wired up. Replace with the real fetch once the Apps Script
 * doGet endpoint is deployed.
 */

export interface LeadRow {
  timestamp: string;
  name: string;
  email: string;
  phoneNumber: string;
  age: number | string;
  gender: string;
  height: number | string;
  weight: number | string;
  goal: string;
  diet: string;
  foodPreference: string;
  physicalState: string;
  subscriptionType: string;
  plan: string;
  subscriptionStartDate: string;
  status: string;
  lastStepCompleted: number | string;
  checkoutVisited: boolean | string;
}

export const SAMPLE_LEADS: LeadRow[] = [
  {
    timestamp: "2026-05-27T09:14:00Z",
    name: "Rahul Reddy",
    email: "rahul.reddy@example.com",
    phoneNumber: "+91 98480 12345",
    age: 28,
    gender: "Male",
    height: 178,
    weight: 82,
    goal: "Weight Loss",
    diet: "Non-Veg",
    foodPreference: "High Protein",
    physicalState: "Moderately Active",
    subscriptionType: "Standard",
    plan: "2 meals/day, 30 days",
    subscriptionStartDate: "2026-06-01",
    status: "lead",
    lastStepCompleted: 7,
    checkoutVisited: true,
  },
  {
    timestamp: "2026-05-27T11:42:00Z",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    phoneNumber: "+91 99220 87431",
    age: 31,
    gender: "Female",
    height: 162,
    weight: 58,
    goal: "Maintenance",
    diet: "Veg",
    foodPreference: "Balanced",
    physicalState: "Active",
    subscriptionType: "Lite",
    plan: "1 meal/day, 15 days",
    subscriptionStartDate: "2026-05-30",
    status: "hot",
    lastStepCompleted: 7,
    checkoutVisited: true,
  },
  {
    timestamp: "2026-05-26T17:08:00Z",
    name: "Akhil Sharma",
    email: "akhil.s@example.com",
    phoneNumber: "+91 70325 96214",
    age: 35,
    gender: "Male",
    height: 175,
    weight: 90,
    goal: "Muscle Gain",
    diet: "Non-Veg",
    foodPreference: "High Protein",
    physicalState: "Very Active",
    subscriptionType: "Elite",
    plan: "3 meals/day, 30 days",
    subscriptionStartDate: "2026-06-03",
    status: "contacted",
    lastStepCompleted: 7,
    checkoutVisited: false,
  },
  {
    timestamp: "2026-05-25T13:30:00Z",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phoneNumber: "+91 88456 21330",
    age: 26,
    gender: "Female",
    height: 158,
    weight: 65,
    goal: "Weight Loss",
    diet: "Veg",
    foodPreference: "Low Carb",
    physicalState: "Lightly Active",
    subscriptionType: "Standard",
    plan: "2 meals/day, 30 days",
    subscriptionStartDate: "2026-06-05",
    status: "lead",
    lastStepCompleted: 5,
    checkoutVisited: false,
  },
  {
    timestamp: "2026-05-24T08:55:00Z",
    name: "Vikram Sethi",
    email: "vikram.sethi@example.com",
    phoneNumber: "+91 90123 45678",
    age: 42,
    gender: "Male",
    height: 172,
    weight: 88,
    goal: "Diabetic Friendly",
    diet: "Veg",
    foodPreference: "Low Carb",
    physicalState: "Sedentary",
    subscriptionType: "Standard",
    plan: "2 meals/day, 30 days",
    subscriptionStartDate: "",
    status: "lost",
    lastStepCompleted: 4,
    checkoutVisited: false,
  },
  {
    timestamp: "2026-05-23T19:20:00Z",
    name: "Anjali Mehta",
    email: "anjali.m@example.com",
    phoneNumber: "+91 81231 87654",
    age: 29,
    gender: "Female",
    height: 165,
    weight: 60,
    goal: "Maintenance",
    diet: "Vegan",
    foodPreference: "Plant Based",
    physicalState: "Moderately Active",
    subscriptionType: "Lite",
    plan: "1 meal/day, 30 days",
    subscriptionStartDate: "2026-05-28",
    status: "converted",
    lastStepCompleted: 7,
    checkoutVisited: true,
  },
];

export const LEAD_COLUMNS: { key: keyof LeadRow; label: string; width?: string }[] = [
  { key: "timestamp", label: "Timestamp", width: "180px" },
  { key: "name", label: "Name", width: "160px" },
  { key: "email", label: "Email", width: "220px" },
  { key: "phoneNumber", label: "Phone", width: "160px" },
  { key: "age", label: "Age", width: "70px" },
  { key: "gender", label: "Gender", width: "100px" },
  { key: "height", label: "Height (cm)", width: "110px" },
  { key: "weight", label: "Weight (kg)", width: "110px" },
  { key: "goal", label: "Goal", width: "150px" },
  { key: "diet", label: "Diet", width: "100px" },
  { key: "foodPreference", label: "Food Pref.", width: "130px" },
  { key: "physicalState", label: "Activity", width: "150px" },
  { key: "subscriptionType", label: "Plan Type", width: "110px" },
  { key: "plan", label: "Plan", width: "180px" },
  { key: "subscriptionStartDate", label: "Start Date", width: "120px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "lastStepCompleted", label: "Step", width: "70px" },
  { key: "checkoutVisited", label: "Checkout", width: "100px" },
];
