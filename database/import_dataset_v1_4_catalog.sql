-- Explicit catalog import, separate from EF schema migrations and HTTP startup.
-- Source: dataset v1.4 manifest, SHA-256 52d95e178700ad29faa64dd3c5095fe9029dd68f0f71ff833c9cf375b858b87e.
-- Indices use Python sorted(compound_label), as in ai/data/dataset.py.
-- Keep label spelling/case, legacy IDs, predictions and snapshots intact.
BEGIN;
LOCK TABLE plants, diseases, plant_diseases IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE dataset_catalog (
    class_index integer PRIMARY KEY,
    class_name text UNIQUE NOT NULL,
    plant_key text NOT NULL,
    condition_key text NOT NULL
) ON COMMIT DROP;
INSERT INTO dataset_catalog VALUES
(0, 'Ca_chua___Chay_la_som', 'Ca_chua', 'Chay_la_som'),
(1, 'Ca_chua___Dom_la_Septoria', 'Ca_chua', 'Dom_la_Septoria'),
(2, 'Ca_chua___Dom_muc_tieu', 'Ca_chua', 'Dom_muc_tieu'),
(3, 'Ca_chua___Dom_vi_khuan', 'Ca_chua', 'Dom_vi_khuan'),
(4, 'Ca_chua___Khoe_manh', 'Ca_chua', 'Khoe_manh'),
(5, 'Ca_chua___Moc_la', 'Ca_chua', 'Moc_la'),
(6, 'Ca_chua___Moc_suong', 'Ca_chua', 'Moc_suong'),
(7, 'Ca_chua___Nhen_do', 'Ca_chua', 'Nhen_do'),
(8, 'Ca_chua___Virus_kham_la', 'Ca_chua', 'Virus_kham_la'),
(9, 'Ca_chua___Virus_xoan_vang_la', 'Ca_chua', 'Virus_xoan_vang_la'),
(10, 'Ca_phe___Dom_chay_phoma', 'Ca_phe', 'Dom_chay_phoma'),
(11, 'Ca_phe___Dom_la_cercospora', 'Ca_phe', 'Dom_la_cercospora'),
(12, 'Ca_phe___Gi_sat', 'Ca_phe', 'Gi_sat'),
(13, 'Ca_phe___Khoe_manh', 'Ca_phe', 'Khoe_manh'),
(14, 'Ca_phe___Sau_duc_la', 'Ca_phe', 'Sau_duc_la'),
(15, 'Cam___Khoe_manh', 'Cam', 'Khoe_manh'),
(16, 'Cam___Loet_vi_khuan', 'Cam', 'Loet_vi_khuan'),
(17, 'Cam___Mac_nhieu_benh_cung_luc', 'Cam', 'Mac_nhieu_benh_cung_luc'),
(18, 'Cam___Vang_la_thieu_dinh_duong', 'Cam', 'Vang_la_thieu_dinh_duong'),
(19, 'Che___Chay_la_nau', 'Che', 'Chay_la_nau'),
(20, 'Che___Dom_la_do', 'Che', 'Dom_la_do'),
(21, 'Che___Dom_tao', 'Che', 'Dom_tao'),
(22, 'Che___Khoe_manh', 'Che', 'Khoe_manh'),
(23, 'Che___Than_thu', 'Che', 'Than_thu'),
(24, 'Lua___Bac_la_lua', 'Lua', 'Bac_la_lua'),
(25, 'Lua___Chay_la', 'Lua', 'Chay_la'),
(26, 'Lua___Dom_nau', 'Lua', 'Dom_nau'),
(27, 'Lua___Dom_than_la', 'Lua', 'Dom_than_la'),
(28, 'Lua___Khoe_manh', 'Lua', 'Khoe_manh'),
(29, 'Lua___Sau_gai_an_la', 'Lua', 'Sau_gai_an_la'),
(30, 'Lua___Thoi_chop_la', 'Lua', 'Thoi_chop_la'),
(31, 'Lua___Vang_lui', 'Lua', 'Vang_lui'),
(32, 'Ngo___Chay_la', 'Ngo', 'Chay_la'),
(33, 'Ngo___Dom_la_xam', 'Ngo', 'Dom_la_xam'),
(34, 'Ngo___Gi_sat', 'Ngo', 'Gi_sat'),
(35, 'Ngo___Khoe_manh', 'Ngo', 'Khoe_manh'),
(36, 'Nho___Chay_la', 'Nho', 'Chay_la'),
(37, 'Nho___Esca', 'Nho', 'Esca'),
(38, 'Nho___Khoe_manh', 'Nho', 'Khoe_manh'),
(39, 'Nho___Thoi_den', 'Nho', 'Thoi_den'),
(40, 'Ot___Dom_la_cercospora', 'Ot', 'Dom_la_cercospora'),
(41, 'Ot___Dom_vi_khuan', 'Ot', 'Dom_vi_khuan'),
(42, 'Ot___Khoe_manh', 'Ot', 'Khoe_manh'),
(43, 'Ot___Phan_trang', 'Ot', 'Phan_trang'),
(44, 'Ot___Thieu_dinh_duong', 'Ot', 'Thieu_dinh_duong'),
(45, 'Ot___Virus_xoan_la', 'Ot', 'Virus_xoan_la'),
(46, 'Sau_rieng___Chay_la', 'Sau_rieng', 'Chay_la'),
(47, 'Sau_rieng___Dom_la_phomopsis', 'Sau_rieng', 'Dom_la_phomopsis'),
(48, 'Sau_rieng___Dom_tao', 'Sau_rieng', 'Dom_tao'),
(49, 'Sau_rieng___Khoe_manh', 'Sau_rieng', 'Khoe_manh'),
(50, 'Sau_rieng___Ray_gay_hai', 'Sau_rieng', 'Ray_gay_hai'),
(51, 'Xoai___bo_cat_la', 'Xoai', 'bo_cat_la'),
(52, 'Xoai___bo_hong', 'Xoai', 'bo_hong'),
(53, 'Xoai___bo_xit', 'Xoai', 'bo_xit'),
(54, 'Xoai___kho_canh', 'Xoai', 'kho_canh'),
(55, 'Xoai___khoe_manh', 'Xoai', 'khoe_manh'),
(56, 'Xoai___loet_vi_khuan', 'Xoai', 'loet_vi_khuan'),
(57, 'Xoai___phan_trang', 'Xoai', 'phan_trang'),
(58, 'Xoai___than_thu', 'Xoai', 'than_thu');

CREATE TEMP TABLE plant_aliases (plant_key text PRIMARY KEY, legacy_name text, display_name text) ON COMMIT DROP;
INSERT INTO plant_aliases VALUES
('Ca_chua', 'Tomato', 'Cà chua'), ('Ca_phe', 'Coffee', 'Cà phê'),
('Cam', 'Orange', 'Cam'), ('Che', 'Tea', 'Chè'), ('Lua', 'Rice', 'Lúa'),
('Ngo', 'Corn', 'Ngô'), ('Nho', 'Grape', 'Nho'), ('Ot', 'Pepper', 'Ớt'),
('Sau_rieng', 'Durian', 'Sầu riêng'), ('Xoai', 'Mango', 'Xoài');
CREATE TEMP TABLE disease_aliases (condition_key text PRIMARY KEY, legacy_name text) ON COMMIT DROP;
INSERT INTO disease_aliases VALUES
('Khoe_manh', 'Healthy'), ('Chay_la_som', 'Early Blight'),
('Moc_suong', 'Late Blight'), ('Dom_vi_khuan', 'Bacterial Spot'),
('Virus_xoan_vang_la', 'Yellow Leaf Curl Virus');

-- Refuse ambiguous aliases rather than silently breaking existing references.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM plant_aliases a JOIN plants old ON old.name = a.legacy_name
        JOIN plants current ON current.name = a.plant_key)
        OR EXISTS (SELECT 1 FROM disease_aliases a JOIN diseases old ON old.name = a.legacy_name
        JOIN diseases current ON current.name = a.condition_key) THEN
        RAISE EXCEPTION 'Both legacy and canonical catalog names exist; resolve aliases before importing';
    END IF;
END $$;
UPDATE plants p SET name = a.plant_key, updated_at = now()
FROM plant_aliases a WHERE p.name = a.legacy_name;
UPDATE diseases d SET name = a.condition_key, updated_at = now()
FROM disease_aliases a WHERE d.name = a.legacy_name;

INSERT INTO plants (id, name, vietnamese_name, is_active, created_at)
SELECT gen_random_uuid(), plant_key, display_name, true, now() FROM plant_aliases
ON CONFLICT (name) DO UPDATE SET is_active = true;
INSERT INTO diseases (id, name, vietnamese_name, condition_type, is_content_approved, is_active, created_at)
SELECT gen_random_uuid(), condition_key,
    CASE WHEN lower(condition_key) = 'khoe_manh' THEN 'Khỏe mạnh'
         ELSE replace(condition_key, '_', ' ') END,
    CASE WHEN lower(condition_key) = 'khoe_manh' THEN 'Healthy'
         WHEN condition_key IN ('Thieu_dinh_duong', 'Vang_la_thieu_dinh_duong') THEN 'NutrientDeficiency'
         ELSE 'Unknown' END,
    false, true, now()
FROM (SELECT DISTINCT condition_key FROM dataset_catalog) conditions
ON CONFLICT (name) DO UPDATE SET is_active = true;

UPDATE diseases SET condition_type = CASE
    WHEN lower(name) = 'khoe_manh' THEN 'Healthy' ELSE 'NutrientDeficiency' END
WHERE condition_type = 'Unknown' AND
    (lower(name) = 'khoe_manh' OR name IN ('Thieu_dinh_duong', 'Vang_la_thieu_dinh_duong'));

-- Translate only confirmed legacy class identities; Potato is absent from v1.4.
UPDATE plant_diseases SET class_name = CASE class_name
    WHEN 'Tomato___Healthy' THEN 'Ca_chua___Khoe_manh'
    WHEN 'Tomato___Early_blight' THEN 'Ca_chua___Chay_la_som'
    WHEN 'Tomato___Late_blight' THEN 'Ca_chua___Moc_suong'
    WHEN 'Tomato___Bacterial_spot' THEN 'Ca_chua___Dom_vi_khuan'
    WHEN 'Tomato___Tomato_Yellow_Leaf_Curl_Virus' THEN 'Ca_chua___Virus_xoan_vang_la'
    WHEN 'Corn___healthy' THEN 'Ngo___Khoe_manh'
    WHEN 'Rice___healthy' THEN 'Lua___Khoe_manh'
    WHEN 'Mango___healthy' THEN 'Xoai___khoe_manh'
    ELSE class_name END;

DO $$ BEGIN
    IF EXISTS (SELECT class_name FROM plant_diseases GROUP BY class_name HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Duplicate class identities; catalog import aborted';
    END IF;
    IF EXISTS (SELECT 1 FROM plant_diseases pd JOIN dataset_catalog c USING (class_name)
        JOIN plants p ON p.id = pd.plant_id JOIN diseases d ON d.id = pd.disease_id
        WHERE p.name <> c.plant_key OR
        (d.name <> c.condition_key AND NOT (c.class_name = 'Xoai___khoe_manh' AND d.name = 'Khoe_manh'))) THEN
        RAISE EXCEPTION 'Existing class plant/condition identity conflicts with v1.4';
    END IF;
END $$;

-- Vacate the unique index range before reordering; checks forbid negative indices.
UPDATE plant_diseases SET class_index = class_index +
    (SELECT COALESCE(max(class_index), 0) + 60 FROM plant_diseases);
UPDATE plant_diseases pd SET class_index = c.class_index, is_active = true,
    plant_id = p.id, disease_id = d.id
FROM dataset_catalog c JOIN plants p ON p.name = c.plant_key
JOIN diseases d ON d.name = c.condition_key
WHERE pd.class_name = c.class_name;
INSERT INTO plant_diseases (id, plant_id, disease_id, class_name, class_index, is_active)
SELECT gen_random_uuid(), p.id, d.id, c.class_name, c.class_index, true
FROM dataset_catalog c JOIN plants p ON p.name = c.plant_key
JOIN diseases d ON d.name = c.condition_key
WHERE NOT EXISTS (SELECT 1 FROM plant_diseases pd WHERE pd.class_name = c.class_name);

-- Preserve unsupported legacy rows and references outside the active model range.
WITH legacy AS (
    SELECT id, 58 + row_number() OVER (ORDER BY class_index, id) AS archived_index
    FROM plant_diseases WHERE class_name NOT IN (SELECT class_name FROM dataset_catalog)
)
UPDATE plant_diseases pd SET class_index = legacy.archived_index, is_active = false
FROM legacy WHERE pd.id = legacy.id;
UPDATE plants SET is_active = false, updated_at = now() WHERE name = 'Potato'
AND NOT EXISTS (SELECT 1 FROM plant_diseases pd WHERE pd.plant_id = plants.id AND pd.is_active);

DO $$ BEGIN
    IF (SELECT count(*) FROM plant_diseases WHERE is_active) <> 59 OR EXISTS (
        SELECT 1 FROM dataset_catalog c LEFT JOIN plant_diseases pd
        ON pd.class_name = c.class_name AND pd.class_index = c.class_index AND pd.is_active
        WHERE pd.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Active catalog does not exactly match the 59 v1.4 classes';
    END IF;
END $$;
COMMIT;
