ALTER TABLE jobs
    MODIFY deadline DATETIME NULL;

UPDATE jobs
SET deadline = TIMESTAMP(DATE(deadline), '23:59:59')
WHERE deadline IS NOT NULL
  AND TIME(deadline) = '00:00:00';
