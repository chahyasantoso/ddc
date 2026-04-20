-- Seed data: 4 checkpoints (Surabaya → Mojokerto → Malang → Purwokerto)
-- Rute Selatan via motor
-- Updated: is_backdrop flag added to photos table

INSERT INTO checkpoints (location_name, lat, lng, description, scene_image, created_at) VALUES
  ('Surabaya',   -7.2575, 112.7521, 'Start dari Surabaya pagi-pagi buta. Kota masih sepi, jalanan basah habis hujan semalam. Gas pertama ke selatan.', NULL, '2026-04-11 05:30:00'),
  ('Mojokerto',  -7.4700, 112.4333, 'Berhenti sejenak di Mojokerto. Mampir sarapan nasi pecel pinggir jalan, sambelnya nendang banget. Dari sini mulai naik ke arah gunung.', NULL, '2026-04-11 07:15:00'),
  ('Malang',     -7.9797, 112.6304, 'Malang sudah keliatan dingin dari jauh. Kabut turun dari Semeru. Istirahat dulu di sini sebelum lanjut ke barat.', NULL, '2026-04-11 10:00:00'),
  ('Purwokerto', -7.4245, 109.2302, 'Tiba di Purwokerto sore hari. Udara sejuk kota pensiunan ini, disambut hangatnya mendoan dan kopi hitam. Baturraden memanggil dari kejauhan.', NULL, '2026-04-12 16:00:00');
-- NOTE: scene_image is now NULL for all checkpoints — it's derived from photos with is_backdrop=1

-- Photos for Surabaya (checkpoint 1) — no backdrop
INSERT INTO photos (checkpoint_id, photo_url, caption, "order", is_backdrop) VALUES
  (1, '/uploads/seed/sby-1.jpg', 'Gate keberangkatan. Motor udah siap, carrier penuh, GPS nyala.', 0, 0),
  (1, '/uploads/seed/sby-2.jpg', 'Jembatan Suramadu dari kejauhan sebelum aku belok selatan. Pamit dulu sama laut.', 1, 0);

-- Photos for Mojokerto (checkpoint 2)
INSERT INTO photos (checkpoint_id, photo_url, caption, "order", is_backdrop) VALUES
  (2, '/uploads/seed/mojo-1.jpg', 'Warung pecel Bu Sari. Nasi pecel + tempe goreng = Rp 8.000. Surga harga.', 0, 0),
  (2, '/uploads/seed/mojo-2.jpg', 'Candi Trowulan keliatan dari jalan raya. Sejarah terhampar di pinggir aspal.', 1, 1),
  (2, '/uploads/seed/mojo-3.jpg', 'Motor diparkir di bawah pohon rindang. Bensin full, semangat juga full.', 2, 0);

-- Photos for Malang (checkpoint 3) — no backdrop
INSERT INTO photos (checkpoint_id, photo_url, caption, "order", is_backdrop) VALUES
  (3, '/uploads/seed/malang-1.jpg', 'Masuk Malang lewat jalur belakang. Kabut turun, suhu turun 10 derajat langsung.', 0, 0),
  (3, '/uploads/seed/malang-2.jpg', 'Kafe kecil di jalan Ijen. Kopi susu Malang beda—ada manis-manis tersendiri.', 1, 0),
  (3, '/uploads/seed/malang-3.jpg', 'View Gunung Semeru dari ketinggian. Ini yang bikin capek perjalanan terbayar lunas.', 2, 0);
-- ↑ is_backdrop=1: malang-3.jpg becomes the cinematic backdrop for Malang

-- Photos for Purwokerto (checkpoint 4)
-- purwokerto-3.png (Baturraden) is flagged as backdrop → replaces scene_image column
INSERT INTO photos (checkpoint_id, photo_url, caption, "order", is_backdrop) VALUES
  (4, '/uploads/seed/purwokerto-1.png', 'Gapura selamat datang kota Purwokerto. Perjalanan panjang dari Jatim terbayar sudah.', 0, 0),
  (4, '/uploads/seed/purwokerto-2.png', 'Wajib mampir warung pinggir jalan. Mendoan panas dan kopi hitam, comfort food paling juara.', 1, 1),
  (4, '/uploads/seed/purwokerto-3.png', 'Masuk ke kawasan Baturraden. Hijau, sejuk, dan suara air terjun dimana-mana.', 2, 0),
-- ↑ is_backdrop=1: purwokerto-3.png becomes the cinematic backdrop for Purwokerto
  (4, '/uploads/seed/purwokerto-4.png', 'Alun-alun Purwokerto waktu sore. Rame orang jalan-jalan, suasana sore yang menyenangkan.', 3, 1),
  (4, '/uploads/seed/purwokerto-5.png', 'Parkir motor di pinggir sawah, di bawah bayang-bayang Gunung Slamet yang megah.', 4, 0);
