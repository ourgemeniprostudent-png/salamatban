ALTER TABLE clinical_reviews ADD COLUMN recommendations TEXT;
ALTER TABLE clinical_reviews ADD COLUMN medication_plan TEXT;
ALTER TABLE clinical_reviews ADD COLUMN follow_up_plan TEXT;

ALTER TABLE health_pictures ADD COLUMN recommendations TEXT;
ALTER TABLE health_pictures ADD COLUMN medication_plan TEXT;
ALTER TABLE health_pictures ADD COLUMN follow_up_plan TEXT;
