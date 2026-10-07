// Swiggy App — the content, straight from the source design. Images and fonts live in public/anim/swiggy-home.
export const A = "/anim/swiggy-home"
export const u = (id: string) => `${A}/img/${id}.jpg`
export const FOOD_ICON = `${A}/service-food-v2.png`

export const SECTIONS = [{ label: "Food" }, { label: "Instamart", badge: "10 mins" }, { label: "Dineout" }, { label: "Scenes" }]
export const CATEGORIES = ["ALL", "STORE", "OFFERS", "BOLT", "EATRIGHT"]
/** What the search bar suggests, one after another. */
export const HINTS = ["Pizza", "Biryani", "Cake", "Dosa"]

export const RESTAURANTS = [
  { name: "Theobroma", rating: 4.4, cat: "Bakery", offer: "ITEMS\nAT ₹37", ad: true, img: `${A}/img/pralines.jpg` },
  { name: "Kanti Sweets", rating: 4.7, cat: "Sweets", offer: "", ad: false, img: `${A}/img/kaju-katli.jpg` },
  { name: "Salad Days", rating: 4.4, cat: "Salads", offer: "ITEMS\nAT ₹129", ad: true, img: u("photo-1512621776951-a57141f2eefd") },
  { name: "Natural Ice", rating: 4.6, cat: "Desserts", offer: "", ad: false, img: u("photo-1497034825429-c343d7c6a68f") },
]
export type Restaurant = (typeof RESTAURANTS)[number]

export const DISHES = ["Idli", "Dosa", "Vada", "Bath", "Tea", "Biryani"].map((name) => ({ name, img: `${A}/img/dishes/${name.toLowerCase()}-cutout.png` }))

export const STORE99 = [
  { n: "Masala Dosa", old: 110, p: 99, r: "4.0 (3.5K+)", s: "Udupi Thindies", img: u("photo-1694849789325-914b71ab4075") },
  { n: "Masala Dosa", old: 150, p: 59, r: "4.3 (440)", s: "Udupi Kitchen", img: u("photo-1668236543090-82eba5ee5976") },
  { n: "Steaming Idlis (2 Pcs)", old: 102, p: 89, r: "4.5 (955)", s: "The Filter Coffee", img: u("photo-1589301760014-d929f3979dbc") },
  { n: "Set Dosa", old: 110, p: 99, r: "4.0 (1.1K+)", s: "Udupi Thindies", img: u("photo-1694849789325-914b71ab4075") },
]
export type Store99Item = (typeof STORE99)[number]

export const FEATURED = [
  {
    name: "Theobroma",
    tag: "best",
    offer: "Items at ₹37",
    time: "15-20 MINS",
    meta: "4.4 (4.7K+) • Sanjay Nagar, 4.0 km",
    cuisine: "Bakery, Desserts • ₹400 for two",
    img: u("photo-1578985545062-69928b1d9587"),
  },
  {
    name: "Sri Manjunatha Grand",
    tag: "veg",
    offer: "₹20 off above ₹449",
    time: "20-25 MINS",
    meta: "4.3 (2.6K+) • RT Nagar, 1.4 km",
    cuisine: "South Indian • ₹150 for two",
    img: u("photo-1742281257687-092746ad6021"),
  },
  {
    name: "Udupi Thindies",
    tag: "veg",
    offer: "Items at ₹59",
    time: "25-30 MINS",
    meta: "4.0 (3.5K+) • Hebbal, 2.2 km",
    cuisine: "South Indian, Chaats • ₹200 for two",
    img: u("photo-1668236543090-82eba5ee5976"),
  },
]
export type Featured = (typeof FEATURED)[number]

export const NAV = [{ l: "Food" }, { l: "Bolt", b: "15 MIN" }, { l: "99 store" }, { l: "EatRight", b: "NEW" }, { l: "Reorder" }]
