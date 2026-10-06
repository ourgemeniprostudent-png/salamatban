CREATE TABLE member_journey_profiles (id TEXT PRIMARY KEY NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), primary_goal TEXT NOT NULL, insurance_status TEXT NOT NULL, booking_consent INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX idx_member_journey_profiles_member ON member_journey_profiles(member_id);
CREATE TABLE checkup_orders (id TEXT PRIMARY KEY NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), package_version TEXT NOT NULL, status TEXT NOT NULL, amount_rial INTEGER NOT NULL, test_reference TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX idx_checkup_orders_member_created ON checkup_orders(member_id, created_at);
CREATE TABLE execution_preferences (id TEXT PRIMARY KEY NOT NULL, member_id TEXT NOT NULL REFERENCES members(id), mode TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX idx_execution_preferences_member ON execution_preferences(member_id);
