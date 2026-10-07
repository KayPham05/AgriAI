-- Read schema metadata only; no account or prediction contents are exported.
SELECT json_build_object(
    'columns', (
        SELECT json_agg(row_to_json(c)) FROM (
            SELECT table_name, column_name, ordinal_position, data_type,
                   is_nullable, character_maximum_length, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        ) AS c
    ),
    'constraints', (
        SELECT json_agg(row_to_json(c)) FROM (
            SELECT conrelid::regclass::text AS table_name, conname AS name,
                   pg_get_constraintdef(oid) AS definition
            FROM pg_constraint
            WHERE connamespace = 'public'::regnamespace
            ORDER BY conrelid::regclass::text, conname
        ) AS c
    ),
    'indexes', (
        SELECT json_agg(row_to_json(i)) FROM (
            SELECT tablename, indexname, indexdef
            FROM pg_indexes WHERE schemaname = 'public'
            ORDER BY tablename, indexname
        ) AS i
    )
);
