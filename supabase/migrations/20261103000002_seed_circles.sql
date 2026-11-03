-- Launch circles. City circles are joined automatically from a member's profile.
insert into public.circles (slug, name, kind, city) values
  ('dublin', 'Dublin', 'city', 'Dublin'),
  ('london', 'London', 'city', 'London'),
  ('tech', 'Tech professionals', 'profession', null),
  ('health', 'Doctors, nurses and pharmacists', 'profession', null),
  ('finance', 'Finance and accounting', 'profession', null),
  ('iit-alumni', 'IIT alumni', 'alma_mater', null),
  ('students', 'Students', 'life_stage', null),
  ('parents', 'Parents', 'life_stage', null),
  ('from-kerala', 'From Kerala', 'home_state', null)
on conflict (slug) do nothing;
