-- A reservation can be confirmed or released after local midnight. Keep its
-- original daily window so all quota transitions update the same bucket.
ALTER TABLE "raw_notifications"
  ADD COLUMN "quota_window_start" TIMESTAMPTZ(6);
