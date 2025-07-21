-- Delete all test subsidies to prepare for live data validation
DELETE FROM subsidies WHERE 
    agency IN ('European Union - DG AGRI', 'Ministère de l''Agriculture (France)', 'EU Rural Development Fund', 'Horizon Europe', 'Common Agricultural Policy (CAP)')
    OR source_url IN ('https://ec.europa.eu/agriculture/organic', 'https://agriculture.gouv.fr/jeunes-agriculteurs', 'https://ec.europa.eu/agriculture/rural-development-2014-2020/leader', 'https://ec.europa.eu/programmes/horizon2020/', 'https://ec.europa.eu/agriculture/cap-overview');

-- Verify subsidies table is empty
SELECT COUNT(*) as remaining_subsidies FROM subsidies;