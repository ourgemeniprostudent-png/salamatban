import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  authUserId: text('auth_user_id').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  birthDate: text('birth_date'),
  city: text('city'),
  onboardingStatus: text('onboarding_status').notNull().default('started'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_members_auth_user_id').on(table.authUserId)]);

export const consentDefinitions = sqliteTable('consent_definitions', {
  id: text('id').primaryKey(),
  consentType: text('consent_type').notNull(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  bodyHash: text('body_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_consent_type_version').on(table.consentType, table.version)]);

export const userConsents = sqliteTable('user_consents', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  definitionId: text('definition_id').notNull().references(() => consentDefinitions.id),
  grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  source: text('source').notNull(),
}, (table) => [index('idx_user_consents_member').on(table.memberId)]);

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  subjectId: text('subject_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  purpose: text('purpose').notNull(),
  outcome: text('outcome').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_audit_subject_created').on(table.subjectId, table.createdAt)]);

export const questionnaireDefinitions = sqliteTable('questionnaire_definitions', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  source: text('source').notNull(),
  approvedBy: text('approved_by').notNull(),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => [uniqueIndex('idx_questionnaire_version').on(table.version)]);

export const questionnaireResponses = sqliteTable('questionnaire_responses', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  definitionId: text('definition_id').notNull().references(() => questionnaireDefinitions.id),
  status: text('status').notNull(),
  redFlagCount: integer('red_flag_count').notNull().default(0),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('idx_questionnaire_response_member_definition').on(table.memberId, table.definitionId),
  index('idx_questionnaire_response_status').on(table.status),
]);

export const questionnaireAnswers = sqliteTable('questionnaire_answers', {
  id: text('id').primaryKey(),
  responseId: text('response_id').notNull().references(() => questionnaireResponses.id),
  questionId: text('question_id').notNull(),
  answerValue: text('answer_value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_questionnaire_answer_response_question').on(table.responseId, table.questionId)]);

export const careTasks = sqliteTable('care_tasks', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  responseId: text('response_id').references(() => questionnaireResponses.id),
  taskType: text('task_type').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_care_tasks_status_due').on(table.status, table.dueAt)]);

export const clinicalReviews = sqliteTable('clinical_reviews', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  responseId: text('response_id').notNull().references(() => questionnaireResponses.id),
  status: text('status').notNull(),
  priority: text('priority').notNull(),
  assignedTo: text('assigned_to'),
  decision: text('decision'),
  notes: text('notes'),
  recommendations: text('recommendations'),
  medicationPlan: text('medication_plan'),
  followUpPlan: text('follow_up_plan'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
}, (table) => [index('idx_clinical_reviews_status_priority').on(table.status, table.priority)]);

export const healthPictures = sqliteTable('health_pictures', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  reviewId: text('review_id').notNull().references(() => clinicalReviews.id),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  summary: text('summary').notNull(),
  recommendations: text('recommendations'),
  medicationPlan: text('medication_plan'),
  followUpPlan: text('follow_up_plan'),
  approvedBy: text('approved_by').notNull(),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('idx_health_picture_member_version').on(table.memberId, table.version),
  index('idx_health_picture_status').on(table.status),
]);

export const roadmaps = sqliteTable('roadmaps', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  healthPictureId: text('health_picture_id').notNull().references(() => healthPictures.id),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  startDate: text('start_date').notNull(),
  approvedBy: text('approved_by').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  uniqueIndex('idx_roadmap_member_version').on(table.memberId, table.version),
  index('idx_roadmap_status').on(table.status),
]);

export const roadmapActions = sqliteTable('roadmap_actions', {
  id: text('id').primaryKey(),
  roadmapId: text('roadmap_id').notNull().references(() => roadmaps.id),
  title: text('title').notNull(),
  rationale: text('rationale').notNull(),
  dueDate: text('due_date').notNull(),
  priority: text('priority').notNull(),
  ownerType: text('owner_type').notNull(),
  status: text('status').notNull(),
  completionRule: text('completion_rule').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_roadmap_actions_roadmap_due').on(table.roadmapId, table.dueDate)]);

export const roadmapActionUpdates = sqliteTable('roadmap_action_updates', {
  id: text('id').primaryKey(),
  actionId: text('action_id').notNull().references(() => roadmapActions.id),
  memberId: text('member_id').notNull().references(() => members.id),
  status: text('status').notNull(),
  evidence: text('evidence').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_roadmap_action_updates_action_created').on(table.actionId, table.createdAt)]);

export const medicalDocuments = sqliteTable('medical_documents', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  originalName: text('original_name').notNull(),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  checksum: text('checksum').notNull(),
  status: text('status').notNull(),
  reviewNote: text('review_note'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_medical_documents_member_created').on(table.memberId, table.createdAt), index('idx_medical_documents_status').on(table.status)]);

export const assistancePlans = sqliteTable('assistance_plans', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  durationMonths: integer('duration_months').notNull(),
  testPriceRial: integer('test_price_rial').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => [uniqueIndex('idx_assistance_plans_duration').on(table.durationMonths)]);

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id),
  planId: text('plan_id').notNull().references(() => assistancePlans.id), status: text('status').notNull(),
  amountRial: integer('amount_rial').notNull(), policyVersion: text('policy_version').notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_orders_member_created').on(table.memberId, table.createdAt)]);

export const paymentAttempts = sqliteTable('payment_attempts', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id),
  provider: text('provider').notNull(), providerReference: text('provider_reference').notNull(), status: text('status').notNull(),
  idempotencyKey: text('idempotency_key').notNull(), verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_payment_attempt_idempotency').on(table.idempotencyKey)]);

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id), orderId: text('order_id').notNull().references(() => orders.id),
  durationMonths: integer('duration_months').notNull(), status: text('status').notNull(), startsOn: text('starts_on').notNull(), endsOn: text('ends_on').notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_subscriptions_member_status').on(table.memberId, table.status)]);

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(), name: text('name').notNull(), city: text('city').notNull(), serviceLabel: text('service_label').notNull(), adapter: text('adapter').notNull(), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const providerIntegrations = sqliteTable('provider_integrations', {
  id: text('id').primaryKey(),
  providerKey: text('provider_key').notNull(),
  displayName: text('display_name').notNull(),
  apiBaseUrl: text('api_base_url'),
  bookingUrl: text('booking_url'),
  credentialEnvKey: text('credential_env_key'),
  mode: text('mode').notNull().default('test'),
  status: text('status').notNull().default('draft'),
  paymentOwner: text('payment_owner').notNull().default('provider'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  updatedBy: text('updated_by'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_provider_integrations_provider_key').on(table.providerKey)]);

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id), roadmapActionId: text('roadmap_action_id').references(() => roadmapActions.id), providerId: text('provider_id').notNull().references(() => providers.id),
  scheduledFor: text('scheduled_for').notNull(), status: text('status').notNull(), externalReference: text('external_reference'), adapterResponse: text('adapter_response'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_appointments_member_scheduled').on(table.memberId, table.scheduledFor)]);

export const reminderPreferences = sqliteTable('reminder_preferences', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id),
  inAppEnabled: integer('in_app_enabled', { mode: 'boolean' }).notNull().default(true), smsEnabled: integer('sms_enabled', { mode: 'boolean' }).notNull().default(false),
  roadmapEnabled: integer('roadmap_enabled', { mode: 'boolean' }).notNull().default(true), appointmentEnabled: integer('appointment_enabled', { mode: 'boolean' }).notNull().default(true), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_reminder_preferences_member').on(table.memberId)]);

export const memberJourneyProfiles = sqliteTable('member_journey_profiles', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id),
  primaryGoal: text('primary_goal').notNull(), insuranceStatus: text('insurance_status').notNull(),
  bookingConsent: integer('booking_consent', { mode: 'boolean' }).notNull().default(false), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_member_journey_profiles_member').on(table.memberId)]);

export const checkupOrders = sqliteTable('checkup_orders', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id),
  packageVersion: text('package_version').notNull(), status: text('status').notNull(), amountRial: integer('amount_rial').notNull(),
  testReference: text('test_reference').notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_checkup_orders_member_created').on(table.memberId, table.createdAt)]);

export const executionPreferences = sqliteTable('execution_preferences', {
  id: text('id').primaryKey(), memberId: text('member_id').notNull().references(() => members.id),
  mode: text('mode').notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('idx_execution_preferences_member').on(table.memberId)]);
