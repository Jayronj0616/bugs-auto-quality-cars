-- =============================================================================
-- BUGS Auto Quality Cars - DEVELOPMENT SEED DATA
-- =============================================================================
-- Everything in this file is demonstration data. It is loaded by
-- `supabase db reset` for local development and by `npm run db:seed`; it is
-- NOT part of the migration chain and must never be run against production.
--
--   * Vehicles, photography, videos and specifications are samples so the UI
--     can be exercised end to end. The photographs are generic stock images,
--     not the dealership's own inventory.
--   * Financing providers and rates are ILLUSTRATIVE. They are not the
--     dealership's actual financing partners or negotiated rates.
--   * Dealership contact details are intentionally left unset - they are
--     configured by an administrator under /admin/settings.
-- =============================================================================

begin;

-- Idempotent: wipe previous demo rows (children cascade) before reinserting.
delete from public.activity_logs       where metadata ->> 'seed' = 'true';
delete from public.admin_notes         where author_name = 'Seed Data';
delete from public.inquiries           where reference like 'INQ-DEMO%';
delete from public.test_drive_requests where reference like 'TD-DEMO%';
delete from public.financing_rates     where provider_id in (select id from public.financing_providers);
delete from public.financing_providers where slug in ('bdo', 'bpi', 'rcbc', 'metrobank', 'security-bank');
delete from public.vehicles            where id in (
  '5ee1a001-0000-4000-8000-000000000001','5ee1a001-0000-4000-8000-000000000002',
  '5ee1a001-0000-4000-8000-000000000003','5ee1a001-0000-4000-8000-000000000004',
  '5ee1a001-0000-4000-8000-000000000005','5ee1a001-0000-4000-8000-000000000006',
  '5ee1a001-0000-4000-8000-000000000007','5ee1a001-0000-4000-8000-000000000008',
  '5ee1a001-0000-4000-8000-000000000009','5ee1a001-0000-4000-8000-00000000000a'
);

-- -----------------------------------------------------------------------------
-- Vehicles
-- -----------------------------------------------------------------------------
insert into public.vehicles (
  id, brand, model, variant, slug, year, condition, body_type, fuel_type,
  transmission, drive_type, seating_capacity, mileage, exterior_color,
  interior_color, engine, power_hp, torque_nm, description, features,
  srp, selling_price, promo_price, promo_label,
  default_down_payment_percent, default_term_months,
  status, is_featured, is_promoted, published_at
) values
(
  '5ee1a001-0000-4000-8000-000000000001', 'BYD', 'Seal 5 DM-i', 'Dynamic',
  'byd-seal-5-dm-i-dynamic-2026', 2026, 'brand_new', 'sedan', 'plug_in_hybrid',
  'automatic', 'fwd', 5, 0, 'Atlantis Grey', 'Black',
  '1.5L Xiaoyun Plug-in Hybrid', 197, 300,
  'The Seal 5 DM-i pairs a 1.5-litre plug-in hybrid drivetrain with a usable battery-only range, so daily commuting runs on electricity while longer provincial trips stay refuelling-free. Generous rear legroom, a rotating central display and a full ADAS suite make it one of the strongest value sedans in its class.',
  array['Rotating 12.8" touchscreen','Wireless Apple CarPlay & Android Auto','360° camera','Adaptive cruise control','Lane keep assist','Blind spot monitoring','Vehicle-to-load (V2L) power output','LED projector headlamps'],
  998000, 948000, null, null, 20, 60,
  'published', true, false, now() - interval '3 days'
),
(
  '5ee1a001-0000-4000-8000-000000000002', 'Toyota', 'Camry', '2.5 V HEV',
  'toyota-camry-2-5-v-hev-2026', 2026, 'brand_new', 'sedan', 'hybrid',
  'cvt', 'fwd', 5, 0, 'Platinum White Pearl', 'Beige',
  '2.5L Dynamic Force Hybrid', 227, 221,
  'A full-size executive sedan built around refinement. The fifth-generation hybrid system is quieter and more efficient than the outgoing car, and the cabin adds ventilated front seats, a 12.3-inch display and Toyota Safety Sense 3.0 as standard.',
  array['Toyota Safety Sense 3.0','Ventilated front seats','12.3" digital cluster','JBL premium audio','Wireless charging','Panoramic view monitor','Power rear sunshade'],
  2465000, 2395000, null, null, 20, 60,
  'published', true, false, now() - interval '9 days'
),
(
  '5ee1a001-0000-4000-8000-000000000003', 'Honda', 'Civic', '1.5 RS Turbo CVT',
  'honda-civic-1-5-rs-turbo-2025', 2025, 'brand_new', 'sedan', 'gasoline',
  'cvt', 'fwd', 5, 0, 'Ignite Red Metallic', 'Black',
  '1.5L VTEC Turbo', 178, 240,
  'The RS Turbo remains the enthusiast pick of the compact class: a genuinely quick 1.5-litre turbo, sharp steering and a low-slung driving position, without giving up the practicality of a full four-door.',
  array['Honda SENSING','Remote engine start','8" advanced display audio','LED headlights with auto high beam','Leather seats','Walk-away auto lock'],
  1850000, 1790000, 1698000, 'Year-end promo',
  20, 60,
  'published', true, true, now() - interval '1 day'
),
(
  '5ee1a001-0000-4000-8000-000000000004', 'Mitsubishi', 'Montero Sport', 'GT 4x2 AT',
  'mitsubishi-montero-sport-gt-4x2-2025', 2025, 'brand_new', 'suv', 'diesel',
  'automatic', 'rwd', 7, 0, 'Graphite Grey', 'Black',
  '2.4L MIVEC Turbo Diesel', 181, 430,
  'Seven seats, a torquey 2.4-litre turbodiesel and a ladder frame underneath make the Montero Sport GT the default family SUV for long provincial drives and rough surfaces alike.',
  array['Forward collision mitigation','Blind spot warning','Power tailgate','Around view monitor','Dual-zone climate control','Paddle shifters','8-speed automatic'],
  2228000, 2148000, null, null, 20, 60,
  'published', false, false, now() - interval '15 days'
),
(
  '5ee1a001-0000-4000-8000-000000000005', 'Toyota', 'Vios', '1.3 XLE CVT',
  'toyota-vios-1-3-xle-2024', 2024, 'used', 'sedan', 'gasoline',
  'cvt', 'fwd', 5, 18450, 'Silver Metallic', 'Grey',
  '1.3L Dual VVT-i', 98, 123,
  'A single-owner XLE with complete casa service records and low mileage. Still the most sensible entry into a brand-new-feeling sedan: cheap to run, easy to resell and effortless in traffic.',
  array['Casa maintained','Complete service records','Reverse camera','7" touchscreen','Keyless entry','Push start'],
  null, 885000, 859000, 'Pre-owned deal',
  20, 48,
  'published', false, true, now() - interval '6 days'
),
(
  '5ee1a001-0000-4000-8000-000000000006', 'Ford', 'Ranger', 'Wildtrak 2.0 Bi-Turbo 4x4',
  'ford-ranger-wildtrak-4x4-2025', 2025, 'brand_new', 'pickup', 'diesel',
  'automatic', '4wd', 5, 0, 'Command Grey', 'Ebony',
  '2.0L Bi-Turbo Diesel', 207, 500,
  'Ten-speed automatic, 500 Nm of torque and a genuinely car-like cabin. The Wildtrak is as comfortable on a Friday-night mall run as it is on a work site on Monday.',
  array['12" portrait SYNC 4A touchscreen','360° camera','Adaptive cruise control','Electronic locking rear differential','Zone lighting','Tow bar with trailer sway control','Flexible rack system'],
  2298000, 2198000, null, null, 25, 60,
  'published', false, true, now() - interval '2 days'
),
(
  '5ee1a001-0000-4000-8000-000000000007', 'BYD', 'Atto 3', 'Premium',
  'byd-atto-3-premium-2026', 2026, 'brand_new', 'crossover', 'electric',
  'automatic', 'fwd', 5, 0, 'Surf Blue', 'Grey',
  'Permanent magnet synchronous motor', 201, 310,
  'A fully electric compact crossover built on BYD''s e-Platform 3.0 with the Blade battery. Charges to 80% in well under an hour on DC, and the vehicle-to-load outlet turns it into a mobile power source.',
  array['Blade battery (LFP)','DC fast charging','Vehicle-to-load (V2L)','Rotating 12.8" display','Panoramic sunroof','Heat pump','NFC card key'],
  1698000, 1598000, null, null, 20, 60,
  'published', true, false, now() - interval '5 days'
),
(
  '5ee1a001-0000-4000-8000-000000000008', 'Nissan', 'Navara', 'VL 4x2 AT',
  'nissan-navara-vl-4x2-2024', 2024, 'brand_new', 'pickup', 'diesel',
  'automatic', 'rwd', 5, 0, 'Black Star', 'Black',
  '2.5L Turbo Diesel', 187, 450,
  'Multi-link rear suspension gives the Navara a noticeably calmer ride than most of its leaf-sprung rivals, without losing the payload that makes a pickup worth owning.',
  array['Intelligent around view monitor','Multi-link rear suspension','Apple CarPlay','Leather seats','LED headlamps','Hill start assist'],
  1749000, 1689000, null, null, 25, 60,
  'reserved', false, false, now() - interval '20 days'
),
(
  '5ee1a001-0000-4000-8000-000000000009', 'Suzuki', 'Ertiga', 'GL AT',
  'suzuki-ertiga-gl-at-2023', 2023, 'used', 'mpv', 'gasoline',
  'automatic', 'fwd', 7, 32100, 'Pearl Metallic Magma Grey', 'Beige',
  '1.5L K15B', 103, 138,
  'Seven seats in a footprint that still fits a tight subdivision garage, with running costs closer to a hatchback than an MPV.',
  array['Seven seats','Casa maintained','Reverse camera','Roof-mounted rear aircon','Keyless entry'],
  null, 938000, null, null, 20, 48,
  'sold', false, false, now() - interval '45 days'
),
(
  '5ee1a001-0000-4000-8000-00000000000a', 'Geely', 'Coolray', 'Sport',
  'geely-coolray-sport-2026', 2026, 'brand_new', 'crossover', 'gasoline',
  'dct', 'fwd', 5, 0, 'Cosmos Blue', 'Black/Red',
  '1.5L Turbo GDI', 174, 255,
  'Draft listing - pending final pricing and photography.',
  array['Panoramic sunroof','360° camera','Wireless charging'],
  1288000, 1258000, null, null, 20, 60,
  'draft', false, false, null
);

-- -----------------------------------------------------------------------------
-- Vehicle images (stock photography - replace with real inventory photos)
-- -----------------------------------------------------------------------------
insert into public.vehicle_images (vehicle_id, url, alt_text, category, sort_order, is_primary)
values
-- BYD Seal 5 DM-i
('5ee1a001-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1800&q=80','2026 BYD Seal 5 DM-i Dynamic front three-quarter view','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=80','2026 BYD Seal 5 DM-i Dynamic rear three-quarter view','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1800&q=80','BYD Seal 5 DM-i dashboard and rotating touchscreen','dashboard',2,false),
('5ee1a001-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1800&q=80','BYD Seal 5 DM-i front seats and cabin trim','interior',3,false),
-- Toyota Camry
('5ee1a001-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=1800&q=80','2026 Toyota Camry 2.5 V Hybrid exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1800&q=80','Toyota Camry side profile','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1800&q=80','Toyota Camry interior and centre console','interior',2,false),
-- Honda Civic
('5ee1a001-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1567818735868-e71b99932e29?auto=format&fit=crop&w=1800&q=80','2025 Honda Civic RS Turbo in Ignite Red','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1800&q=80','Honda Civic RS Turbo rear quarter','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1800&q=80','Honda Civic RS Turbo cockpit','dashboard',2,false),
('5ee1a001-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=1800&q=80','Honda Civic RS Turbo engine bay','engine',3,false),
-- Montero Sport
('5ee1a001-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1800&q=80','2025 Mitsubishi Montero Sport GT exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1800&q=80','Mitsubishi Montero Sport GT rear view','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1800&q=80','Montero Sport third row and cabin','interior',2,false),
-- Vios
('5ee1a001-0000-4000-8000-000000000005','https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1800&q=80','2024 Toyota Vios XLE exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000005','https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?auto=format&fit=crop&w=1800&q=80','Toyota Vios XLE interior','interior',1,false),
-- Ranger
('5ee1a001-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1800&q=80','2025 Ford Ranger Wildtrak 4x4 exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1800&q=80','Ford Ranger Wildtrak rear bed','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1610768764270-790fbec18178?auto=format&fit=crop&w=1800&q=80','Ford Ranger Wildtrak SYNC 4A display','dashboard',2,false),
-- Atto 3
('5ee1a001-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1800&q=80','2026 BYD Atto 3 Premium exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1800&q=80','BYD Atto 3 side profile','exterior',1,false),
('5ee1a001-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1800&q=80','BYD Atto 3 cabin','interior',2,false),
-- Navara
('5ee1a001-0000-4000-8000-000000000008','https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1800&q=80','2024 Nissan Navara VL exterior','exterior',0,true),
('5ee1a001-0000-4000-8000-000000000008','https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1800&q=80','Nissan Navara VL rear quarter','exterior',1,false),
-- Ertiga
('5ee1a001-0000-4000-8000-000000000009','https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1800&q=80','2023 Suzuki Ertiga GL exterior','exterior',0,true),
-- Coolray (draft)
('5ee1a001-0000-4000-8000-00000000000a','https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1800&q=80','2026 Geely Coolray Sport exterior','exterior',0,true);

-- -----------------------------------------------------------------------------
-- Vehicle videos
-- -----------------------------------------------------------------------------
insert into public.vehicle_videos (vehicle_id, title, video_url, provider, external_id, video_type, sort_order)
values
('5ee1a001-0000-4000-8000-000000000001','Seal 5 DM-i full walkaround','https://www.youtube.com/watch?v=aqz-KE-bpKQ','youtube','aqz-KE-bpKQ','walkaround',0),
('5ee1a001-0000-4000-8000-000000000001','Interior and technology tour','https://www.youtube.com/watch?v=ScMzIvxBSi4','youtube','ScMzIvxBSi4','interior',1),
('5ee1a001-0000-4000-8000-000000000003','Civic RS Turbo on the road','https://www.youtube.com/watch?v=aqz-KE-bpKQ','youtube','aqz-KE-bpKQ','driving',0),
('5ee1a001-0000-4000-8000-000000000006','Ranger Wildtrak off-road feature demo','https://www.youtube.com/watch?v=ScMzIvxBSi4','youtube','ScMzIvxBSi4','features',0),
('5ee1a001-0000-4000-8000-000000000007','Atto 3 electric walkaround','https://www.youtube.com/watch?v=aqz-KE-bpKQ','youtube','aqz-KE-bpKQ','walkaround',0);

-- -----------------------------------------------------------------------------
-- Additional specifications (beyond the structured columns)
-- -----------------------------------------------------------------------------
insert into public.vehicle_specifications (vehicle_id, group_name, name, value, sort_order)
values
('5ee1a001-0000-4000-8000-000000000001','Performance','Electric-only range','~80 km (NEDC)',0),
('5ee1a001-0000-4000-8000-000000000001','Performance','0-100 km/h','8.1 s',1),
('5ee1a001-0000-4000-8000-000000000001','Dimensions','Length','4,780 mm',2),
('5ee1a001-0000-4000-8000-000000000001','Dimensions','Wheelbase','2,718 mm',3),
('5ee1a001-0000-4000-8000-000000000001','Dimensions','Ground clearance','130 mm',4),
('5ee1a001-0000-4000-8000-000000000001','Capacity','Fuel tank','65 L',5),
('5ee1a001-0000-4000-8000-000000000002','Performance','Combined output','227 hp',0),
('5ee1a001-0000-4000-8000-000000000002','Dimensions','Length','4,920 mm',1),
('5ee1a001-0000-4000-8000-000000000002','Capacity','Boot space','493 L',2),
('5ee1a001-0000-4000-8000-000000000003','Performance','0-100 km/h','8.2 s',0),
('5ee1a001-0000-4000-8000-000000000003','Dimensions','Ground clearance','133 mm',1),
('5ee1a001-0000-4000-8000-000000000004','Capacity','Towing capacity','3,100 kg',0),
('5ee1a001-0000-4000-8000-000000000004','Dimensions','Ground clearance','218 mm',1),
('5ee1a001-0000-4000-8000-000000000006','Capacity','Payload','1,000 kg',0),
('5ee1a001-0000-4000-8000-000000000006','Capacity','Wading depth','800 mm',1),
('5ee1a001-0000-4000-8000-000000000007','Battery','Battery capacity','60.48 kWh Blade (LFP)',0),
('5ee1a001-0000-4000-8000-000000000007','Battery','Range','~480 km (NEDC)',1),
('5ee1a001-0000-4000-8000-000000000007','Battery','DC fast charge','30-80% in ~30 min',2);

-- -----------------------------------------------------------------------------
-- Financing providers and ILLUSTRATIVE rates.
-- Replace under /admin/financing with the dealership's real partners.
-- -----------------------------------------------------------------------------
insert into public.financing_providers (id, name, slug, description, is_active, sort_order)
values
('f1a0c1a1-0000-4000-8000-000000000001','BDO','bdo','Sample provider configuration - replace with the dealership''s actual partner terms.',true,0),
('f1a0c1a1-0000-4000-8000-000000000002','BPI','bpi','Sample provider configuration - replace with the dealership''s actual partner terms.',true,1),
('f1a0c1a1-0000-4000-8000-000000000003','RCBC','rcbc','Sample provider configuration - replace with the dealership''s actual partner terms.',true,2),
('f1a0c1a1-0000-4000-8000-000000000004','Metrobank','metrobank','Sample provider configuration - replace with the dealership''s actual partner terms.',true,3),
('f1a0c1a1-0000-4000-8000-000000000005','Security Bank','security-bank','Sample provider configuration - replace with the dealership''s actual partner terms.',true,4);

-- One rate row per provider x term. Rates step up gently with the term, which
-- is the usual shape of an auto loan sheet.
insert into public.financing_rates (provider_id, term_months, interest_rate, minimum_down_payment_percent)
select p.id, t.term_months, t.base_rate + p.offset_rate, t.min_dp
from (values
  (12, 5.50, 20.00),
  (24, 6.00, 20.00),
  (36, 6.50, 20.00),
  (48, 7.00, 20.00),
  (60, 7.50, 20.00),
  (72, 8.25, 30.00)
) as t(term_months, base_rate, min_dp)
cross join (values
  ('f1a0c1a1-0000-4000-8000-000000000001'::uuid, 0.00),
  ('f1a0c1a1-0000-4000-8000-000000000002'::uuid, 0.25),
  ('f1a0c1a1-0000-4000-8000-000000000003'::uuid, -0.25),
  ('f1a0c1a1-0000-4000-8000-000000000004'::uuid, 0.15),
  ('f1a0c1a1-0000-4000-8000-000000000005'::uuid, 0.35)
) as p(id, offset_rate);

-- -----------------------------------------------------------------------------
-- A few customer submissions so the admin dashboard is not empty.
-- -----------------------------------------------------------------------------
insert into public.inquiries (
  reference, customer_name, customer_email, customer_phone, vehicle_id, vehicle_label,
  inquiry_type, message, preferred_contact_method,
  vehicle_price_at_inquiry, down_payment_amount, down_payment_percent,
  loan_term_months, interest_rate, estimated_monthly_payment, financing_provider_id,
  status, source_path, created_at
) values
(
  'INQ-DEMO01','Marisol Ventura','marisol.ventura@example.com','+63 917 555 0142',
  '5ee1a001-0000-4000-8000-000000000001','2026 BYD Seal 5 DM-i Dynamic',
  'installment','Good day! I am interested in the Seal 5 DM-i. Is the 20% down payment negotiable, and do you have a unit in white available this month?',
  'phone', 948000, 189600, 20, 60, 7.50, 15196.78,
  'f1a0c1a1-0000-4000-8000-000000000001','new','/cars/byd-seal-5-dm-i-dynamic-2026', now() - interval '4 hours'
),
(
  'INQ-DEMO02','Rafael Domingo','rafael.d@example.com','+63 918 555 0198',
  '5ee1a001-0000-4000-8000-000000000006','2025 Ford Ranger Wildtrak 2.0 Bi-Turbo 4x4',
  'cash_purchase','Please send me your best cash price for the Wildtrak including LTO registration. Ready to close this week.',
  'email', 2198000, null, null, null, null, null, null,
  'contacted','/cars/ford-ranger-wildtrak-4x4-2025', now() - interval '2 days'
),
(
  'INQ-DEMO03','Chelsea Ang','chelsea.ang@example.com','+63 995 555 0177',
  '5ee1a001-0000-4000-8000-000000000003','2025 Honda Civic 1.5 RS Turbo CVT',
  'vehicle','Is the promo price still good until the end of the month? Also, does the unit come with tint and floor mats?',
  'messenger', 1698000, null, null, null, null, null, null,
  'qualified','/cars/honda-civic-1-5-rs-turbo-2025', now() - interval '5 days'
),
(
  'INQ-DEMO04','Noel Bautista',null,'+63 920 555 0011',
  null,null,
  'general','Do you accept trade-ins? I have a 2019 Mirage G4 that I would like to trade against a used sedan.',
  'phone', null, null, null, null, null, null, null,
  'new','/contact', now() - interval '1 day'
);

insert into public.test_drive_requests (
  reference, vehicle_id, vehicle_label, customer_name, customer_email, customer_phone,
  preferred_date, preferred_time, message, status, created_at
) values
(
  'TD-DEMO01','5ee1a001-0000-4000-8000-000000000001','2026 BYD Seal 5 DM-i Dynamic',
  'Marisol Ventura','marisol.ventura@example.com','+63 917 555 0142',
  (current_date + 3), '10:00', 'Weekday mornings work best for me.', 'pending', now() - interval '3 hours'
),
(
  'TD-DEMO02','5ee1a001-0000-4000-8000-000000000007','2026 BYD Atto 3 Premium',
  'Jomar Sicat','jomar.sicat@example.com','+63 927 555 0233',
  (current_date + 5), '14:00', 'Would like to try the DC fast charging demo if possible.', 'confirmed', now() - interval '2 days'
),
(
  'TD-DEMO03','5ee1a001-0000-4000-8000-000000000004','2025 Mitsubishi Montero Sport GT 4x2 AT',
  'Lorna Reyes','lorna.reyes@example.com','+63 916 555 0304',
  (current_date + 1), '09:00', null, 'contacted', now() - interval '6 days'
);

insert into public.admin_notes (inquiry_id, author_name, note, created_at)
select id, 'Seed Data', 'Called the customer - asked us to follow up after payday on the 15th.', now() - interval '1 day'
from public.inquiries where reference = 'INQ-DEMO02';

commit;
