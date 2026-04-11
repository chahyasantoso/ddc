-- Seed data: 3 checkpoints (Surabaya → Mojokerto → Malang)
-- Rute Selatan via motor

INSERT INTO checkpoints (location_name, lat, lng, description, created_at) VALUES
  ('Surabaya', -7.2575, 112.7521, 'Start dari Surabaya pagi-pagi buta. Kota masih sepi, jalanan basah habis hujan semalam. Gas pertama ke selatan.', '2026-04-11 05:30:00'),
  ('Mojokerto', -7.4700, 112.4333, 'Berhenti sejenak di Mojokerto. Mampir sarapan nasi pecel pinggir jalan, sambelnya nendang banget. Dari sini mulai naik ke arah gunung.', '2026-04-11 07:15:00'),
  ('Malang', -7.9797, 112.6304, 'Malang sudah keliatan dingin dari jauh. Kabut turun dari Semeru. Istirahat dulu di sini sebelum lanjut ke barat.', '2026-04-11 10:00:00');

-- Photos for Surabaya (checkpoint 1)
INSERT INTO photos (checkpoint_id, photo_url, caption, "order") VALUES
  (1, '/uploads/seed/sby-1.jpg', 'Gate keberangkatan. Motor udah siap, carrier penuh, GPS nyala.', 0),
  (1, '/uploads/seed/sby-2.jpg', 'Jembatan Suramadu dari kejauhan sebelum aku belok selatan. Pamit dulu sama laut.', 1);

-- Photos for Mojokerto (checkpoint 2)
INSERT INTO photos (checkpoint_id, photo_url, caption, "order") VALUES
  (2, '/uploads/seed/mojo-1.jpg', 'Warung pecel Bu Sari. Nasi pecel + tempe goreng = Rp 8.000. Surga harga.', 0),
  (2, '/uploads/seed/mojo-2.jpg', 'Candi Trowulan keliatan dari jalan raya. Sejarah terhampar di pinggir aspal.', 1),
  (2, '/uploads/seed/mojo-3.jpg', 'Motor diparkir di bawah pohon rindang. Bensin full, semangat juga full.', 2);

-- Photos for Malang (checkpoint 3)
INSERT INTO photos (checkpoint_id, photo_url, caption, "order") VALUES
  (3, '/uploads/seed/malang-1.jpg', 'Masuk Malang lewat jalur belakang. Kabut turun, suhu turun 10 derajat langsung.', 0),
  (3, '/uploads/seed/malang-2.jpg', 'Kafe kecil di jalan Ijen. Kopi susu Malang beda—ada manis-manis tersendiri.', 1),
  (3, '/uploads/seed/malang-3.jpg', 'View Gunung Semeru dari ketinggian. Ini yang bikin capek perjalanan terbayar lunas.', 2);
