-- AGRI-76: PostgreSQL business schema, derived from the verified ERD.
-- Source: InitialCreate 20260925161222; schema snapshot 2026-10-05, commit 99d6e56.
-- Apply to an empty database; no seed data or EF migration history is included.
BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE public.users (
    id uuid NOT NULL,
    full_name varchar(150) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash text NOT NULL,
    role varchar(30) NOT NULL DEFAULT 'User'::character varying,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT "PK_users" PRIMARY KEY (id)
);

CREATE TABLE public.plants (
    id uuid NOT NULL,
    name varchar(100) NOT NULL,
    vietnamese_name varchar(150),
    scientific_name varchar(200),
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT "PK_plants" PRIMARY KEY (id)
);

CREATE TABLE public.diseases (
    id uuid NOT NULL,
    name varchar(150) NOT NULL,
    vietnamese_name varchar(200),
    description text,
    symptoms text,
    treatment text,
    prevention text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT "PK_diseases" PRIMARY KEY (id)
);

CREATE TABLE public.plant_diseases (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    disease_id uuid NOT NULL,
    class_name varchar(255) NOT NULL,
    class_index integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT "FK_plant_diseases_diseases_disease_id" FOREIGN KEY (disease_id) REFERENCES diseases(id) ON DELETE RESTRICT,
    CONSTRAINT "FK_plant_diseases_plants_plant_id" FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE RESTRICT,
    CONSTRAINT "PK_plant_diseases" PRIMARY KEY (id),
    CONSTRAINT "ck_plant_diseases_class_index" CHECK ((class_index >= 0))
);

CREATE TABLE public.predictions (
    id uuid NOT NULL,
    user_id uuid,
    image_path text NOT NULL,
    image_public_id text,
    predicted_plant_disease_id uuid NOT NULL,
    confidence double precision NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT "FK_predictions_plant_diseases_predicted_plant_disease_id" FOREIGN KEY (predicted_plant_disease_id) REFERENCES plant_diseases(id) ON DELETE RESTRICT,
    CONSTRAINT "FK_predictions_users_user_id" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT "PK_predictions" PRIMARY KEY (id)
);

CREATE TABLE public.prediction_details (
    id uuid NOT NULL,
    prediction_id uuid NOT NULL,
    plant_disease_id uuid NOT NULL,
    probability double precision NOT NULL,
    rank integer NOT NULL,
    CONSTRAINT "FK_prediction_details_plant_diseases_plant_disease_id" FOREIGN KEY (plant_disease_id) REFERENCES plant_diseases(id) ON DELETE RESTRICT,
    CONSTRAINT "FK_prediction_details_predictions_prediction_id" FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
    CONSTRAINT "PK_prediction_details" PRIMARY KEY (id),
    CONSTRAINT "ck_prediction_details_rank" CHECK ((rank > 0))
);

CREATE UNIQUE INDEX ix_diseases_name ON public.diseases USING btree (name);
CREATE UNIQUE INDEX ix_plant_diseases_class_index ON public.plant_diseases USING btree (class_index);
CREATE INDEX ix_plant_diseases_disease_id ON public.plant_diseases USING btree (disease_id);
CREATE INDEX ix_plant_diseases_plant_id ON public.plant_diseases USING btree (plant_id);
CREATE UNIQUE INDEX ix_plant_diseases_plant_id_disease_id ON public.plant_diseases USING btree (plant_id, disease_id);
CREATE UNIQUE INDEX ix_plants_name ON public.plants USING btree (name);
CREATE INDEX "IX_prediction_details_plant_disease_id" ON public.prediction_details USING btree (plant_disease_id);
CREATE INDEX ix_prediction_details_prediction_id ON public.prediction_details USING btree (prediction_id);
CREATE UNIQUE INDEX ix_prediction_details_prediction_id_rank ON public.prediction_details USING btree (prediction_id, rank);
CREATE INDEX "IX_predictions_predicted_plant_disease_id" ON public.predictions USING btree (predicted_plant_disease_id);
CREATE INDEX ix_predictions_created_at ON public.predictions USING btree (created_at);
CREATE INDEX ix_predictions_user_id ON public.predictions USING btree (user_id);
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);

COMMIT;
