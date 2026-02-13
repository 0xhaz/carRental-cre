// Asset paths (files in /public/assets/)
const logo = "/assets/logo.svg";
const gmail_logo = "/assets/gmail_logo.svg";
const facebook_logo = "/assets/facebook_logo.svg";
const instagram_logo = "/assets/instagram_logo.svg";
const twitter_logo = "/assets/twitter_logo.svg";
const menu_icon = "/assets/menu_icon.svg";
const search_icon = "/assets/search_icon.svg";
const close_icon = "/assets/close_icon.svg";
const users_icon = "/assets/users_icon.svg";
const car_icon = "/assets/car_icon.svg";
const location_icon = "/assets/location_icon.svg";
const fuel_icon = "/assets/fuel_icon.svg";
const addIcon = "/assets/addIcon.svg";
const carIcon = "/assets/carIcon.svg";
const carIconColored = "/assets/carIconColored.svg";
const dashboardIcon = "/assets/dashboardIcon.svg";
const dashboardIconColored = "/assets/dashboardIconColored.svg";
const addIconColored = "/assets/addIconColored.svg";
const listIcon = "/assets/listIcon.svg";
const listIconColored = "/assets/listIconColored.svg";
const cautionIconColored = "/assets/cautionIconColored.svg";
const arrow_icon = "/assets/arrow_icon.svg";
const star_icon = "/assets/star_icon.svg";
const check_icon = "/assets/check_icon.svg";
const tick_icon = "/assets/tick_icon.svg";
const delete_icon = "/assets/delete_icon.svg";
const eye_icon = "/assets/eye_icon.svg";
const eye_close_icon = "/assets/eye_close_icon.svg";
const filter_icon = "/assets/filter_icon.svg";
const edit_icon = "/assets/edit_icon.svg";
const calendar_icon_colored = "/assets/calendar_icon_colored.svg";
const location_icon_colored = "/assets/location_icon_colored.svg";
const testimonial_image_1 = "/assets/testimonial_image_1.png";
const testimonial_image_2 = "/assets/testimonial_image_2.png";
const main_car = "/assets/main_car.png";
const banner_car_image = "/assets/banner_car_image.png";
const user_profile = "/assets/user_profile.png";
const upload_icon = "/assets/upload_icon.svg";
const car_image1 = "/assets/car_image1.png";
const car_image2 = "/assets/car_image2.png";
const car_image3 = "/assets/car_image3.png";
const car_image4 = "/assets/car_image4.png";

export const cityList = ["New York", "Los Angeles", "Houston", "Chicago"];

export const assets = {
  logo,
  gmail_logo,
  facebook_logo,
  instagram_logo,
  twitter_logo,
  menu_icon,
  search_icon,
  close_icon,
  users_icon,
  edit_icon,
  car_icon,
  location_icon,
  fuel_icon,
  addIcon,
  carIcon,
  carIconColored,
  dashboardIcon,
  dashboardIconColored,
  addIconColored,
  listIcon,
  listIconColored,
  cautionIconColored,
  calendar_icon_colored,
  location_icon_colored,
  arrow_icon,
  star_icon,
  check_icon,
  tick_icon,
  delete_icon,
  eye_icon,
  eye_close_icon,
  filter_icon,
  testimonial_image_1,
  testimonial_image_2,
  main_car,
  banner_car_image,
  car_image1,
  upload_icon,
  user_profile,
  car_image2,
  car_image3,
  car_image4,
};

export const menuLinks = [
  { name: "Home", path: "/" },
  { name: "Browse Cars", path: "/renter/browse" },
  { name: "Invest", path: "/investor/marketplace" },
];

export const ownerMenuLinks = [
  {
    name: "Dashboard",
    path: "",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "Add car",
    path: "/add-car",
    icon: addIcon,
    coloredIcon: addIconColored,
  },
  {
    name: "Manage Cars",
    path: "/manage-cars",
    icon: carIcon,
    coloredIcon: carIconColored,
  },
  {
    name: "Manage Bookings",
    path: "/manage-bookings",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
];

// Investor Portal Menu Links
export const investorMenuLinks = [
  {
    name: "Home",
    path: "/",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "Dashboard",
    path: "/investor/dashboard",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "Marketplace",
    path: "/investor/marketplace",
    icon: carIcon,
    coloredIcon: carIconColored,
  },
  {
    name: "My Portfolio",
    path: "/investor/portfolio",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
];

// Rentor Portal Menu Links
export const rentorMenuLinks = [
  {
    name: "Home",
    path: "/",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "Dashboard",
    path: "/rentor/dashboard",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "My Vehicles",
    path: "/rentor/vehicles",
    icon: carIcon,
    coloredIcon: carIconColored,
  },
  {
    name: "Fundraising",
    path: "/rentor/fundraising",
    icon: addIcon,
    coloredIcon: addIconColored,
  },
  {
    name: "Bookings",
    path: "/rentor/bookings",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
  {
    name: "Analytics",
    path: "/rentor/analytics",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
];

// Renter Portal Menu Links
export const renterMenuLinks = [
  {
    name: "Home",
    path: "/",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
  {
    name: "Browse Cars",
    path: "/renter/browse",
    icon: carIcon,
    coloredIcon: carIconColored,
  },
  {
    name: "Active Rental",
    path: "/renter/active",
    icon: cautionIconColored,
    coloredIcon: cautionIconColored,
  },
  {
    name: "My Bookings",
    path: "/renter/bookings",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
];

// Admin Portal Menu Links
export const adminMenuLinks = [
  {
    name: "Admin",
    path: "/admin",
    icon: dashboardIcon,
    coloredIcon: dashboardIconColored,
  },
];

export const dummyUserData = {
  _id: "6847f7cab3d8daecdb517095",
  name: "GreatStack",
  email: "admin@example.com",
  role: "owner",
  image: user_profile,
};

export const dummyCarData = [
  {
    _id: "67ff5bc069c03d4e45f30b77",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    brand: "BMW",
    model: "X5",
    image: car_image1,
    year: 2006,
    category: "SUV",
    seating_capacity: 4,
    fuel_type: "Hybrid",
    transmission: "Semi-Automatic",
    pricePerDay: 300,
    location: "New York",
    description:
      "The BMW X5 is a mid-size luxury SUV produced by BMW. The X5 made its debut in 1999 as the first SUV ever produced by BMW.",
    isAvailable: true,
    createdAt: "2025-04-16T07:26:56.215Z",
  },
  {
    _id: "67ff6b758f1b3684286a2a65",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    brand: "Toyota",
    model: "Corolla",
    image: car_image2,
    year: 2021,
    category: "Sedan",
    seating_capacity: 4,
    fuel_type: "Diesel",
    transmission: "Manual",
    pricePerDay: 130,
    location: "Chicago",
    description:
      "The Toyota Corolla is a mid-size luxury sedan produced by Toyota. The Corolla made its debut in 2008 as the first sedan ever produced by Toyota.",
    isAvailable: true,
    createdAt: "2025-04-16T08:33:57.993Z",
  },
  {
    _id: "67ff6b9f8f1b3684286a2a68",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    brand: "Jeep ",
    model: "Wrangler",
    image: car_image3,
    year: 2023,
    category: "SUV",
    seating_capacity: 4,
    fuel_type: "Hybrid",
    transmission: "Automatic",
    pricePerDay: 200,
    location: "Los Angeles",
    description:
      "The Jeep Wrangler is a mid-size luxury SUV produced by Jeep. The Wrangler made its debut in 2003 as the first SUV ever produced by Jeep.",
    isAvailable: true,
    createdAt: "2025-04-16T08:34:39.592Z",
  },
  {
    _id: "68009c93a3f5fc6338ea7e34",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    brand: "Ford",
    model: "Neo 6",
    image: car_image4,
    year: 2022,
    category: "Sedan",
    seating_capacity: 2,
    fuel_type: "Diesel",
    transmission: "Semi-Automatic",
    pricePerDay: 209,
    location: "Houston",
    description:
      "This is a mid-size luxury sedan produced by Toyota. The Corolla made its debut in 2008 as the first sedan ever produced by Toyota.",
    isAvailable: true,
    createdAt: "2025-04-17T06:15:47.318Z",
  },
];

export const dummyMyBookingsData = [
  {
    _id: "68482bcc98eb9722b7751f70",
    car: dummyCarData[0],
    user: "6847f7cab3d8daecdb517095",
    owner: "6847f7cab3d8daecdb517095",
    pickupDate: "2025-06-13T00:00:00.000Z",
    returnDate: "2025-06-14T00:00:00.000Z",
    status: "confirmed",
    price: 440,
    createdAt: "2025-06-10T12:57:48.244Z",
  },
  {
    _id: "68482bb598eb9722b7751f60",
    car: dummyCarData[1],
    user: "6847f7cab3d8daecdb517095",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    pickupDate: "2025-06-12T00:00:00.000Z",
    returnDate: "2025-06-12T00:00:00.000Z",
    status: "pending",
    price: 130,
    createdAt: "2025-06-10T12:57:25.613Z",
  },
  {
    _id: "684800fa0fb481c5cfd92e56",
    car: dummyCarData[2],
    user: "6847f7cab3d8daecdb517095",
    owner: "67fe3467ed8a8fe17d0ba6e2",
    pickupDate: "2025-06-11T00:00:00.000Z",
    returnDate: "2025-06-12T00:00:00.000Z",
    status: "pending",
    price: 600,
    createdAt: "2025-06-10T09:55:06.379Z",
  },
  {
    _id: "6847fe790fb481c5cfd92d94",
    car: dummyCarData[3],
    user: "6847f7cab3d8daecdb517095",
    owner: "6847f7cab3d8daecdb517095",
    pickupDate: "2025-06-11T00:00:00.000Z",
    returnDate: "2025-06-12T00:00:00.000Z",
    status: "confirmed",
    price: 440,
    createdAt: "2025-06-10T09:44:25.410Z",
  },
];

export const dummyDashboardData = {
  totalCars: 4,
  totalBookings: 2,
  pendingBookings: 0,
  completedBookings: 2,
  recentBookings: [dummyMyBookingsData[0], dummyMyBookingsData[1]],
  monthlyRevenue: 840,
};
