-- Script to empty all data from the database without deleting the tables
DELETE FROM photos;
DELETE FROM checkpoints;

-- Reset autoincrement sequences
DELETE FROM sqlite_sequence WHERE name IN ('photos', 'checkpoints');
