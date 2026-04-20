-- Data export (current state as of 2026-04-20)
-- Updated: scene_image column on checkpoints cleared; is_backdrop flag used on photos instead

INSERT INTO checkpoints (id, location_name, lat, lng, description, scene_image, created_at) VALUES (1, 'Surabaya', -7.2575, 112.7521, 'Start dari Surabaya pagi-pagi buta. Kota masih sepi, jalanan basah habis hujan semalam. Gas pertama ke selatan.', NULL, '2026-04-11 05:30:00');
INSERT INTO checkpoints (id, location_name, lat, lng, description, scene_image, created_at) VALUES (3, 'jombang', -7.546, 112.2199, NULL, NULL, '2026-04-15 10:51:49');
INSERT INTO checkpoints (id, location_name, lat, lng, description, scene_image, created_at) VALUES (4, 'nganjuk', -7.6048, 111.9015, NULL, NULL, '2026-04-15 10:51:56');
INSERT INTO checkpoints (id, location_name, lat, lng, description, scene_image, created_at) VALUES (5, 'telomoyo', -7.3695, 110.4381, NULL, NULL, '2026-04-15 10:52:07');
INSERT INTO checkpoints (id, location_name, lat, lng, description, scene_image, created_at) VALUES (6, 'purwokerto ', -7.4245, 109.2302, 'Tiba di Purwokerto sore hari. Udara sejuk kota pensiunan ini, disambut hangatnya mendoan dan kopi hitam. Baturraden memanggil dari kejauhan.', NULL, '2026-04-15 10:52:16');
-- NOTE: scene_image is NULL — the backdrop is derived from any photo with is_backdrop=1 in this checkpoint

-- Photos (is_backdrop column added 2026-04-20)
INSERT INTO photos (id, checkpoint_id, photo_url, caption, "order", is_backdrop, created_at) VALUES (1, 1, '/uploads/seed/sby-1.jpg', 'Gate keberangkatan. Motor udah siap, carrier penuh, GPS nyala.', 0, 0, '2026-04-12 11:51:48');
INSERT INTO photos (id, checkpoint_id, photo_url, caption, "order", is_backdrop, created_at) VALUES (2, 1, '/uploads/seed/sby-2.jpg', 'Jembatan Suramadu dari kejauhan sebelum aku belok selatan. Pamit dulu sama laut.', 1, 0, '2026-04-12 11:51:48');
