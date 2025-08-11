BEGIN;

INSERT INTO subsidies_structured (
  title, description, eligibility, deadline, agency, url,
  sector, region, funding_type, fingerprint
)
VALUES (
  'Test grant – do not keep',
  'Temporary insert to validate trigger.',
  'Any farm',
  NULL,
  'APIA',
  'https://apia.org.ro/test',
  ARRAY['crops'],
  ARRAY['RO'],
  'grant',
  'fp_test_rollback_1'
)
RETURNING id;

ROLLBACK;