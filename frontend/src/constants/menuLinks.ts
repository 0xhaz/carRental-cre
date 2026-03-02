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
    name: "Verification",
    path: "/verification?role=renter",
    icon: listIcon,
    coloredIcon: listIconColored,
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
  {
    name: "Refunds",
    path: "/admin/refunds",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
  {
    name: "Escrows",
    path: "/admin/escrows",
    icon: listIcon,
    coloredIcon: listIconColored,
  },
  {
    name: "Token Compliance",
    path: "/admin/token-compliance",
    icon: cautionIconColored,
    coloredIcon: cautionIconColored,
  },
];

