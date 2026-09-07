-- Restore the original catalogue bundled with the last pre-decoupling backup.
-- Safe to run more than once: businesses are matched by slug and links by
-- business/platform/url, while IDs remain stable once created in this project.

insert into public.businesses (
  slug, name, name_ar, category, city, city_ar, district, district_ar,
  address, address_ar, lat, lng, phone, instagram, website,
  description, description_ar, products, products_ar, hours, verified,
  published, plan
)
values
  ('green-oak', 'Green Oak Kitchen', 'مطبخ جرين أوك', 'restaurant', 'Riyadh', 'الرياض', 'Al Olaya', 'العليا', 'Prince Turki Rd, Al Olaya, Riyadh 12333', 'طريق الأمير تركي، العليا، الرياض 12333', 24.6929, 46.6857, '+966112001122', 'greenoak.sa', 'https://greenoak.example.com', 'A fully gluten-free kitchen serving Mediterranean plates with dedicated prep stations to prevent cross-contact.', 'مطبخ خالٍ تماماً من الغلوتين يقدّم أطباقاً متوسطية مع محطات تحضير مخصّصة لتجنّب التلوث.', 'Gluten-free pasta, grilled mains, salads', 'معكرونة خالية من الغلوتين، مشاوي، سلطات', '{"sun":"10:00 AM – 11:00 PM","mon":"10:00 AM – 11:00 PM","tue":"10:00 AM – 11:00 PM","wed":"10:00 AM – 11:00 PM","thu":"10:00 AM – 12:00 AM","fri":"1:00 PM – 12:00 AM","sat":"10:00 AM – 11:00 PM"}'::jsonb, true, true, 'free'),
  ('cedar-and-sage', 'Cedar & Sage', 'سيدر آند سيج', 'restaurant', 'Jeddah', 'جدة', 'Al Rawdah', 'الروضة', 'Al Rawdah District, Jeddah 23434', 'حي الروضة، جدة 23434', 21.5810, 39.1653, '+966126604455', 'cedarandsage', 'https://cedarandsage.example.com', 'Modern Levantine dining with a certified gluten-free menu and celiac-safe kitchen protocols.', 'مطعم شامي عصري بقائمة معتمدة خالية من الغلوتين وبروتوكولات مطبخ آمنة لمرضى السيلياك.', 'Levantine mains, gluten-free bread basket', 'أطباق شامية، سلة خبز خالية من الغلوتين', '{"sun":"10:00 AM – 11:00 PM","mon":"10:00 AM – 11:00 PM","tue":"10:00 AM – 11:00 PM","wed":"10:00 AM – 11:00 PM","thu":"10:00 AM – 12:00 AM","fri":"1:00 PM – 12:00 AM","sat":"10:00 AM – 11:00 PM"}'::jsonb, true, true, 'free'),
  ('harvest-table', 'Harvest Table', 'هارفست تيبل', 'restaurant', 'Khobar', 'الخبر', 'Corniche', 'الكورنيش', 'Corniche Rd, Al Khobar 34413', 'طريق الكورنيش، الخبر 34413', 26.2794, 50.2083, '+966138873300', 'harvest.table', 'https://harvesttable.example.com', 'Seasonal farm-to-table menu with clearly labeled gluten-free options and separate utensils.', 'قائمة موسمية من المزرعة إلى المائدة مع خيارات خالية من الغلوتين موضّحة وأدوات منفصلة.', 'Bowls, wraps, roasted plates', 'بولز، رابس، أطباق مشوية', '{"sun":"10:00 AM – 11:00 PM","mon":"10:00 AM – 11:00 PM","tue":"10:00 AM – 11:00 PM","wed":"10:00 AM – 11:00 PM","thu":"10:00 AM – 12:00 AM","fri":"1:00 PM – 12:00 AM","sat":"10:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('olive-branch', 'Olive Branch Bistro', 'بيسترو غصن الزيتون', 'restaurant', 'Riyadh', 'الرياض', 'Al Nakheel', 'النخيل', 'Al Nakheel District, Riyadh 12385', 'حي النخيل، الرياض 12385', 24.7616, 46.6412, '+966114558899', 'olivebranch.ksa', 'https://olivebranch.example.com', 'Authentic Italian with a dedicated gluten-free pizza oven and pasta line.', 'مطبخ إيطالي أصيل مع فرن بيتزا وخط معكرونة مخصّصين للخالي من الغلوتين.', 'Italian mains, gluten-free pizza', 'أطباق إيطالية، بيتزا خالية من الغلوتين', '{"sun":"10:00 AM – 11:00 PM","mon":"10:00 AM – 11:00 PM","tue":"10:00 AM – 11:00 PM","wed":"10:00 AM – 11:00 PM","thu":"10:00 AM – 12:00 AM","fri":"1:00 PM – 12:00 AM","sat":"10:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('matcha-lane', 'Matcha Lane', 'ماتشا لين', 'cafe', 'Riyadh', 'الرياض', 'Hittin', 'حطين', 'Hittin District, Riyadh 13512', 'حي حطين، الرياض 13512', 24.7742, 46.6023, '+966115007788', 'matchalane', null, 'Minimalist cafe with an entirely gluten-free pastry case and specialty matcha menu.', 'مقهى بسيط بواجهة معجّنات خالية بالكامل من الغلوتين وقائمة ماتشا متخصّصة.', 'Matcha, gluten-free pastries, breakfast bowls', 'ماتشا، معجّنات خالية من الغلوتين، أطباق إفطار', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, true, true, 'free'),
  ('slow-pour', 'Slow Pour Coffee', 'سلو بور كوفي', 'cafe', 'Jeddah', 'جدة', 'Al Zahra', 'الزهراء', 'Al Zahra District, Jeddah 23523', 'حي الزهراء، جدة 23523', 21.5555, 39.1852, '+966122334400', 'slowpour.jed', 'https://slowpour.example.com', 'Third-wave coffee shop offering a curated selection of certified gluten-free treats.', 'مقهى مختصّ يقدّم مجموعة منتقاة من الحلويات المعتمدة الخالية من الغلوتين.', 'Specialty coffee, GF cookies and cakes', 'قهوة مختصة، كوكيز وكيك خالية من الغلوتين', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('morning-fold', 'Morning Fold', 'مورنينغ فولد', 'cafe', 'Dammam', 'الدمام', null, null, 'King Fahd Rd, Dammam 32241', 'طريق الملك فهد، الدمام 32241', 26.4207, 50.0888, '+966138126677', 'morningfold', 'https://morningfold.example.com', 'All-day breakfast cafe with gluten-free sourdough baked in-house every morning.', 'مقهى إفطار طوال اليوم يخبز الساوردو الخالي من الغلوتين داخلياً كل صباح.', 'Breakfast, sandwiches on GF bread', 'إفطار وسندويشات بخبز خالٍ من الغلوتين', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('seed-stone', 'Seed & Stone Bakery', 'مخبز البذور والحجر', 'bakery', 'Riyadh', 'الرياض', 'Al Malqa', 'الملقا', 'Al Malqa District, Riyadh 13521', 'حي الملقا، الرياض 13521', 24.7929, 46.6247, '+966112443311', 'seedandstone', 'https://seedandstone.example.com', 'A fully dedicated gluten-free bakery — no wheat has ever entered the building.', 'مخبز مخصّص بالكامل للخالي من الغلوتين — لم يدخل القمح المكان أبداً.', 'Sourdough, cakes, cookies — 100% gluten-free', 'ساوردو، كيك، كوكيز — 100% خالٍ من الغلوتين', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, true, true, 'free'),
  ('little-loaf', 'Little Loaf', 'ليتل لوف', 'bakery', 'Jeddah', 'جدة', 'Al Salamah', 'السلامة', 'Al Salamah District, Jeddah 23525', 'حي السلامة، جدة 23525', 21.6031, 39.1350, '+966126229911', 'littleloaf.jed', null, 'Family-run bakery specializing in soft gluten-free breads and pizza bases for home delivery.', 'مخبز عائلي متخصّص في الخبز الطري وعجينة البيتزا الخالية من الغلوتين مع التوصيل.', 'Breads, buns, pizza bases', 'خبز، أرغفة، عجينة بيتزا', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('crumb-and-honey', 'Crumb & Honey', 'كرَمب آند هني', 'bakery', 'Riyadh', 'الرياض', 'Al Yasmin', 'الياسمين', 'Al Yasmin District, Riyadh 13322', 'حي الياسمين، الرياض 13322', 24.8341, 46.6410, '+966113668822', 'crumbandhoney', 'https://crumbandhoney.example.com', 'Custom celebration cakes made entirely gluten-free in a dedicated kitchen.', 'كيكات مناسبات مخصّصة تُصنع بالكامل خالية من الغلوتين في مطبخ مخصّص.', 'Cakes, cupcakes, celebration desserts', 'كيك، كب كيك، حلويات المناسبات', '{"sun":"7:00 AM – 11:00 PM","mon":"7:00 AM – 11:00 PM","tue":"7:00 AM – 11:00 PM","wed":"7:00 AM – 11:00 PM","thu":"7:00 AM – 12:00 AM","fri":"8:00 AM – 12:00 AM","sat":"7:00 AM – 11:00 PM"}'::jsonb, false, true, 'free'),
  ('noor-kitchen', 'Noor''s Home Kitchen', 'مطبخ نور المنزلي', 'home', 'Riyadh', 'الرياض', null, null, 'Home-based, delivery across Riyadh', 'مشروع منزلي، توصيل داخل الرياض', 24.7136, 46.6753, '+966551112233', 'noor.kitchen', null, 'Home chef preparing weekly gluten-free meal boxes tailored for celiac families.', 'طاهية منزلية تُعدّ صناديق وجبات أسبوعية خالية من الغلوتين مخصّصة لعائلات السيلياك.', 'Homemade meals, freezer packs', 'وجبات منزلية، وجبات مجمّدة', '{"sun":"By order","mon":"By order","tue":"By order","wed":"By order","thu":"By order","fri":"Closed","sat":"By order"}'::jsonb, true, true, 'free'),
  ('date-and-oat', 'Date & Oat', 'تمر وشوفان', 'home', 'Jeddah', 'جدة', null, null, 'Home-based, delivery across Jeddah', 'مشروع منزلي، توصيل داخل جدة', 21.4858, 39.1925, '+966564002020', 'date.and.oat', null, 'Small-batch gluten-free granola and snacks made in a home kitchen with certified oats.', 'غرانولا وسناكات خالية من الغلوتين بكميات صغيرة تُصنع في مطبخ منزلي بشوفان معتمد.', 'Granola, energy bites, breakfast jars', 'غرانولا، كرات طاقة، برطمانات إفطار', '{"sun":"By order","mon":"By order","tue":"By order","wed":"By order","thu":"By order","fri":"Closed","sat":"By order"}'::jsonb, false, true, 'free'),
  ('layla-sweets', 'Layla Sweets', 'حلويات ليلى', 'home', 'Khobar', 'الخبر', null, null, 'Home-based, delivery across Khobar', 'مشروع منزلي، توصيل داخل الخبر', 26.2172, 50.1971, '+966537008181', 'layla.sweets', null, 'Handmade gluten-free desserts delivered fresh, popular for gifting and events.', 'حلويات يدوية خالية من الغلوتين تُوصَّل طازجة، مثالية للهدايا والمناسبات.', 'Cookies, brownies, dessert boxes', 'كوكيز، براوني، صناديق حلويات', '{"sun":"By order","mon":"By order","tue":"By order","wed":"By order","thu":"By order","fri":"Closed","sat":"By order"}'::jsonb, false, true, 'free')
on conflict (slug) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  category = excluded.category,
  city = excluded.city,
  city_ar = excluded.city_ar,
  district = excluded.district,
  district_ar = excluded.district_ar,
  address = excluded.address,
  address_ar = excluded.address_ar,
  lat = excluded.lat,
  lng = excluded.lng,
  phone = excluded.phone,
  instagram = excluded.instagram,
  website = excluded.website,
  description = excluded.description,
  description_ar = excluded.description_ar,
  products = excluded.products,
  products_ar = excluded.products_ar,
  hours = excluded.hours,
  verified = excluded.verified,
  published = excluded.published;

with restored_links(slug, platform, url, sort_order) as (
  values
    ('green-oak', 'hungerstation', 'https://hungerstation.com', 1),
    ('green-oak', 'jahez', 'https://jahez.net', 2),
    ('green-oak', 'website', 'https://greenoak.example.com', 3),
    ('cedar-and-sage', 'jahez', 'https://jahez.net', 1),
    ('cedar-and-sage', 'thechefz', 'https://thechefz.co', 2),
    ('cedar-and-sage', 'website', 'https://cedarandsage.example.com', 3),
    ('harvest-table', 'hungerstation', 'https://hungerstation.com', 1),
    ('harvest-table', 'website', 'https://harvesttable.example.com', 2),
    ('olive-branch', 'hungerstation', 'https://hungerstation.com', 1),
    ('olive-branch', 'thechefz', 'https://thechefz.co', 2),
    ('matcha-lane', 'jahez', 'https://jahez.net', 1),
    ('matcha-lane', 'hungerstation', 'https://hungerstation.com', 2),
    ('slow-pour', 'hungerstation', 'https://hungerstation.com', 1),
    ('slow-pour', 'website', 'https://slowpour.example.com', 2),
    ('morning-fold', 'website', 'https://morningfold.example.com', 1),
    ('morning-fold', 'jahez', 'https://jahez.net', 2),
    ('seed-stone', 'hungerstation', 'https://hungerstation.com', 1),
    ('seed-stone', 'jahez', 'https://jahez.net', 2),
    ('seed-stone', 'website', 'https://seedandstone.example.com', 3),
    ('little-loaf', 'jahez', 'https://jahez.net', 1),
    ('little-loaf', 'thechefz', 'https://thechefz.co', 2),
    ('crumb-and-honey', 'website', 'https://crumbandhoney.example.com', 1),
    ('crumb-and-honey', 'hungerstation', 'https://hungerstation.com', 2),
    ('noor-kitchen', 'website', 'https://wa.me/966551112233', 1),
    ('date-and-oat', 'jahez', 'https://jahez.net', 1),
    ('date-and-oat', 'website', 'https://wa.me/966564002020', 2),
    ('layla-sweets', 'hungerstation', 'https://hungerstation.com', 1),
    ('layla-sweets', 'website', 'https://wa.me/966537008181', 2)
)
insert into public.business_links (business_id, platform, url, sort_order)
select b.id, r.platform, r.url, r.sort_order
from restored_links r
join public.businesses b on b.slug = r.slug
where not exists (
  select 1
  from public.business_links existing
  where existing.business_id = b.id
    and existing.platform = r.platform
    and existing.url = r.url
);
