-- Proposed server-side model only. Not used by the browser demo.
CREATE TABLE accounts (id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, role TEXT NOT NULL);
CREATE TABLE patient_intakes (patient_id TEXT PRIMARY KEY REFERENCES accounts(id), answers_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE appointments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES accounts(id), physician_id TEXT NOT NULL REFERENCES accounts(id), starts_at TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE documents (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES accounts(id), private_object_key TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE encounters (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL REFERENCES appointments(id), physician_id TEXT NOT NULL REFERENCES accounts(id), clinical_record_json TEXT NOT NULL, authored_at TEXT NOT NULL);
CREATE TABLE coordination_tasks (id TEXT PRIMARY KEY, encounter_id TEXT NOT NULL REFERENCES encounters(id), assignee_id TEXT REFERENCES accounts(id), status TEXT NOT NULL, due_at TEXT);

CREATE TABLE patient_profiles (patient_id TEXT PRIMARY KEY REFERENCES accounts(id), profile_json TEXT NOT NULL, physician_id TEXT NOT NULL REFERENCES accounts(id), updated_at TEXT NOT NULL);
CREATE TABLE physician_availability (physician_id TEXT NOT NULL REFERENCES accounts(id), starts_at TEXT NOT NULL, available BOOLEAN NOT NULL, PRIMARY KEY (physician_id, starts_at));

-- V5 proposed server additions; not deployed by the local demo.
CREATE TABLE payment_attempts (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES accounts(id), appointment_snapshot_json TEXT NOT NULL, amount_toman INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, finished_at TEXT);
CREATE TABLE pathway_steps (task_id TEXT NOT NULL REFERENCES coordination_tasks(id), template_type TEXT NOT NULL, template_version INTEGER NOT NULL, step_key TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES accounts(id), values_json TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(task_id, step_key));
CREATE TABLE pathway_events (id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES coordination_tasks(id), actor_id TEXT NOT NULL REFERENCES accounts(id), event_json TEXT NOT NULL, created_at TEXT NOT NULL);
ALTER TABLE documents ADD COLUMN task_id TEXT REFERENCES coordination_tasks(id);
