#!/usr/bin/env python3
"""Validate the proposed PostgreSQL design in a disposable Docker database.

This does not migrate the application or benchmark capacity. Requires Python 3,
Docker and an already running PostgreSQL 17 container (no host port is needed):
  python3 scripts/validate_target_schema.py --container salamatban-architecture-pg17
Only this invocation's temporary database and role are created and removed.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import time
import uuid


ROOT = Path(__file__).resolve().parents[1]
DDL = ROOT / "deliverables/architecture/postgresql-target-schema.sql"
REPORT = ROOT / "review-evidence/architecture-database-validation.json"


def ident(number: int) -> str:
    return f"00000000-0000-0000-0000-{number:012d}"


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", default="salamatban-architecture-pg17")
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()
    suffix = uuid.uuid4().hex[:12]
    database = f"salamatban_design_validation_{suffix}"
    role = f"salamatban_design_role_{suffix}"
    docker = ["docker", "exec", "-i", args.container]
    base = docker + ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-At"]

    def sql(source: str, db: str = database) -> str:
        result = subprocess.run(base + ["-d", db], input=source, text=True,
                                capture_output=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stderr.strip() or result.stdout.strip())
        return result.stdout.strip()

    assertions: list[dict] = []
    schema_bytes = DDL.read_bytes()
    version = sql("SHOW server_version;", "postgres")
    if version.split(".")[0] != "17":
        raise RuntimeError(f"Expected PostgreSQL 17; received {version}")
    created = False
    role_created = False
    started = time.time()
    try:
        sql(f"CREATE DATABASE {database};", "postgres")
        created = True
        sql(schema_bytes.decode())
        sql(f"CREATE ROLE {role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;")
        role_created = True
        append_only = [
            "consent_documents", "consent_events", "record_revisions", "care_plans",
            "plan_actions", "action_events", "task_events", "support_messages", "audit_events",
        ]
        # Explicit candidate runtime grants from the database design. These grants
        # are test setup, not an assertion that application provisioning exists.
        sql(f"GRANT USAGE ON SCHEMA public TO {role};\n"
            f"GRANT SELECT ON consent_documents TO {role};\n"
            f"GRANT SELECT, INSERT ON {', '.join(append_only[1:])} TO {role};\n"
            f"REVOKE UPDATE, DELETE, TRUNCATE ON {', '.join(append_only)} FROM {role};\n"
            f"GRANT USAGE ON SEQUENCE action_events_sequence_seq TO {role};")

        fixture = f"""
INSERT INTO app_users(id,phone_e164,display_name) VALUES
 ('{ident(1)}','+989000000001','Synthetic member A'),
 ('{ident(2)}','+989000000002','Synthetic member B'),
 ('{ident(3)}','+989000000003','Synthetic clinician'),
 ('{ident(4)}','+989000000004','Synthetic administrator');
INSERT INTO user_roles(user_id,role) VALUES
 ('{ident(1)}','member'),('{ident(2)}','member'),
 ('{ident(3)}','clinician'),('{ident(4)}','admin');
INSERT INTO memberships(member_id,invited_by) VALUES
 ('{ident(1)}','{ident(4)}'),('{ident(2)}','{ident(4)}');
INSERT INTO care_assignments(id,member_id,clinician_id,assigned_by) VALUES
 ('{ident(5)}','{ident(1)}','{ident(3)}','{ident(4)}');
INSERT INTO consent_documents(id,scope,version,body,sha256,approved_at,effective_at)
 VALUES ('{ident(20)}','clinical','synthetic-v1','Synthetic consent only',repeat('a',64),now(),now());
INSERT INTO consent_events(id,member_id,document_id,decision,channel,occurred_at) VALUES
 ('{ident(21)}','{ident(1)}','{ident(20)}','accepted','member_ui',now()),
 ('{ident(22)}','{ident(2)}','{ident(20)}','accepted','member_ui',now());
INSERT INTO health_records(id,member_id,birth_date,assessment_version,clinical_consent_event_id,status,version) VALUES
 ('{ident(11)}','{ident(1)}','1991-03-21','synthetic-v1','{ident(21)}','submitted',1),
 ('{ident(12)}','{ident(2)}','1986-03-21','synthetic-v1','{ident(22)}','draft',0);
INSERT INTO record_revisions(record_id,version,member_id,snapshot,snapshot_sha256,created_by) VALUES
 ('{ident(11)}',1,'{ident(1)}','{{}}',repeat('a',64),'{ident(1)}'),
 ('{ident(11)}',2,'{ident(1)}','{{}}',repeat('b',64),'{ident(1)}');
INSERT INTO care_plans(id,record_id,member_id,version,source_record_version,reviewer_id,reviewer_display_name,summary)
 VALUES ('{ident(30)}','{ident(11)}','{ident(1)}',1,1,'{ident(3)}','Synthetic clinician','Synthetic clinical review summary for schema validation.');
INSERT INTO plan_actions(id,plan_id,member_id,position,title,reason,due_date,owner)
 VALUES ('{ident(31)}','{ident(30)}','{ident(1)}',1,'Synthetic action','Synthetic reason','2026-10-10','member');
INSERT INTO action_events(id,plan_id,action_id,member_id,actor_id,done)
 VALUES ('{ident(32)}','{ident(30)}','{ident(31)}','{ident(1)}','{ident(1)}',true);
INSERT INTO documents(id,record_id,member_id,object_key,original_name,mime_type,size_bytes,sha256)
 VALUES ('{ident(33)}','{ident(11)}','{ident(1)}','synthetic/a.pdf','a.pdf','application/pdf',128,repeat('a',64));
INSERT INTO assessment_orders(id,record_id,member_id,pricing_version,amount_rial,status,idempotency_key)
 VALUES ('{ident(40)}','{ident(11)}','{ident(1)}','synthetic-v1',1000000,'pending','order-1');
INSERT INTO payment_attempts(id,order_id,expected_amount_rial,provider,provider_idempotency_key,authority,provider_reference,status,verified_amount_rial,verified_at)
 VALUES ('{ident(41)}','{ident(40)}',1000000,'synthetic','payment-1','authority-1','reference-1','verified',1000000,now());
UPDATE assessment_orders SET status='paid',paid_at=now() WHERE id='{ident(40)}';
UPDATE health_records SET status='published' WHERE id='{ident(11)}';
INSERT INTO coordination_tasks(id,member_id,kind,status,title)
 VALUES ('{ident(50)}','{ident(1)}','urgent','open','Synthetic task');
INSERT INTO outbox_events(id,event_key,event_type,aggregate_type,aggregate_id,payload)
 VALUES ('{ident(60)}','plan:synthetic:published','plan.published','plan','{ident(30)}','{{}}');
INSERT INTO jobs(id,outbox_event_id,kind,dedupe_key,payload) VALUES
 ('{ident(61)}','{ident(60)}','synthetic-notification','notification:synthetic:1','{{}}'),
 ('{ident(62)}','{ident(60)}','synthetic-notification','notification:synthetic:2','{{}}');
"""
        sql(fixture)
        checks: list[str] = ["""
CREATE TEMP TABLE validation_results(name text, passed boolean, expected_sqlstate text);
CREATE FUNCTION pg_temp.assert_true(test_name text, condition boolean) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', test_name; END IF;
  INSERT INTO validation_results VALUES(test_name,true,NULL);
END $$;
CREATE FUNCTION pg_temp.expect_error(test_name text, statement text, expected text) RETURNS void
LANGUAGE plpgsql AS $$ DECLARE actual text; BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE;
  END;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'Assertion % expected SQLSTATE %, received %',test_name,expected,coalesce(actual,'success');
  END IF;
  INSERT INTO validation_results VALUES(test_name,true,expected);
END $$;
"""]

        def yes(name: str, condition: str) -> None:
            checks.append(f"SELECT pg_temp.assert_true({literal(name)},({condition}));")

        def no(name: str, statement: str, state: str = "23503") -> None:
            checks.append(f"SELECT pg_temp.expect_error({literal(name)}, {literal(statement)}, {literal(state)});")

        yes("valid_member_clinician_record_plan_action_progress_path",
            f"SELECT count(*)=1 FROM memberships m JOIN care_assignments c USING(member_id) "
            "JOIN health_records r USING(member_id) JOIN care_plans p ON p.record_id=r.id "
            "JOIN plan_actions a ON a.plan_id=p.id JOIN action_events e ON e.action_id=a.id "
            f"WHERE m.member_id='{ident(1)}' AND e.done AND r.status='published'")
        yes("valid_payment_matches_order_amount",
            f"SELECT a.status='verified' AND o.status='paid' AND a.verified_amount_rial=o.amount_rial "
            f"FROM payment_attempts a JOIN assessment_orders o ON o.id=a.order_id WHERE a.id='{ident(41)}'")
        no("clinician_role_required_for_assignment",
           f"UPDATE care_assignments SET clinician_id='{ident(2)}' WHERE id='{ident(5)}'")
        no("one_active_assignment_per_member",
           f"INSERT INTO care_assignments(id,member_id,clinician_id) VALUES('{ident(6)}','{ident(1)}','{ident(3)}')", "23505")
        no("record_cannot_use_other_member_consent",
           f"UPDATE health_records SET clinical_consent_event_id='{ident(21)}' WHERE id='{ident(12)}'")
        no("revision_cannot_refer_to_other_member",
           f"UPDATE record_revisions SET member_id='{ident(2)}' WHERE record_id='{ident(11)}' AND version=2")
        no("document_cannot_refer_to_other_member",
           f"UPDATE documents SET member_id='{ident(2)}' WHERE id='{ident(33)}'")
        no("plan_cannot_refer_to_other_member",
           f"UPDATE care_plans SET member_id='{ident(2)}' WHERE id='{ident(30)}'")
        no("action_cannot_refer_to_other_member",
           f"UPDATE plan_actions SET member_id='{ident(2)}' WHERE id='{ident(31)}'")
        no("progress_cannot_refer_to_other_member",
           f"UPDATE action_events SET member_id='{ident(2)}' WHERE id='{ident(32)}'")
        no("task_event_cannot_refer_to_other_member",
           f"INSERT INTO task_events(id,task_id,member_id,actor_id,version,from_status,to_status) "
           f"VALUES('{ident(51)}','{ident(50)}','{ident(2)}','{ident(4)}',1,'open','resolved')")
        plan_insert = ("INSERT INTO care_plans(id,record_id,member_id,version,source_record_version,reviewer_id,reviewer_display_name,summary) "
                       f"VALUES('{ident(39)}','{ident(11)}','{ident(1)}',{{version}},{{source}},'{ident(3)}','Synthetic clinician',"
                       "'Synthetic clinical review summary for duplicate validation.')")
        no("duplicate_plan_version_rejected", plan_insert.format(version=1, source=2), "23505")
        no("duplicate_source_record_version_rejected", plan_insert.format(version=2, source=1), "23505")
        no("missing_source_record_revision_rejected", plan_insert.format(version=2, source=99))
        no("published_plan_requires_historical_reviewer_name",
           f"UPDATE care_plans SET reviewer_display_name=NULL WHERE id='{ident(30)}'", "23502")
        checks.append(f"UPDATE app_users SET display_name='Renamed clinician' WHERE id='{ident(3)}';")
        yes("published_reviewer_name_survives_account_rename",
            f"SELECT p.reviewer_display_name='Synthetic clinician' AND u.display_name='Renamed clinician' "
            f"FROM care_plans p JOIN app_users u ON u.id=p.reviewer_id WHERE p.id='{ident(30)}'")
        no("invalid_gregorian_birth_date_rejected",
           f"UPDATE health_records SET birth_date='2026-02-30' WHERE id='{ident(11)}'", "22008")
        no("invalid_gregorian_action_date_rejected",
           f"UPDATE plan_actions SET due_date='2026-13-01' WHERE id='{ident(31)}'", "22008")
        no("negative_record_version_rejected",
           f"UPDATE health_records SET version=-1 WHERE id='{ident(11)}'", "23514")
        no("non_object_profile_rejected",
           f"UPDATE health_records SET profile='[]' WHERE id='{ident(11)}'", "23514")
        no("oversize_document_rejected",
           f"UPDATE documents SET size_bytes=10485761 WHERE id='{ident(33)}'", "23514")
        no("clean_document_requires_storage_and_scan_time",
           f"UPDATE documents SET scan_status='clean' WHERE id='{ident(33)}'", "23514")
        no("purged_document_requires_purge_time",
           f"UPDATE documents SET storage_status='purged' WHERE id='{ident(33)}'", "23514")
        no("duplicate_active_document_hash_rejected",
           f"INSERT INTO documents(id,record_id,member_id,object_key,original_name,mime_type,size_bytes,sha256) "
           f"VALUES('{ident(34)}','{ident(11)}','{ident(1)}','synthetic/b.pdf','b.pdf','application/pdf',128,repeat('a',64))", "23505")
        no("payment_expected_amount_must_match_order",
           f"UPDATE payment_attempts SET expected_amount_rial=900000,verified_amount_rial=900000 WHERE id='{ident(41)}'")
        no("verified_amount_mismatch_rejected",
           f"UPDATE payment_attempts SET verified_amount_rial=900000 WHERE id='{ident(41)}'", "23514")
        no("verified_payment_requires_provider_evidence",
           f"UPDATE payment_attempts SET provider_reference=NULL WHERE id='{ident(41)}'", "23514")
        no("second_verified_payment_per_order_rejected",
           f"INSERT INTO payment_attempts(id,order_id,expected_amount_rial,provider,provider_idempotency_key,authority,provider_reference,status,verified_amount_rial,verified_at) "
           f"VALUES('{ident(42)}','{ident(40)}',1000000,'synthetic','payment-2','authority-2','reference-2','verified',1000000,now())", "23505")
        no("paid_order_requires_paid_time",
           f"UPDATE assessment_orders SET paid_at=NULL WHERE id='{ident(40)}'", "23514")
        no("order_amount_cannot_change_after_payment_attempt",
           f"UPDATE assessment_orders SET amount_rial=1200000 WHERE id='{ident(40)}'")
        no("second_active_assessment_order_rejected",
           f"INSERT INTO assessment_orders(id,record_id,member_id,pricing_version,amount_rial,status,idempotency_key) "
           f"VALUES('{ident(43)}','{ident(11)}','{ident(1)}','synthetic-v1',1000000,'pending','order-2')", "23505")
        no("duplicate_open_urgent_task_rejected",
           f"INSERT INTO coordination_tasks(id,member_id,kind,status,title) VALUES('{ident(51)}','{ident(1)}','urgent','open','Synthetic duplicate')", "23505")
        no("booking_requires_consent",
           f"INSERT INTO coordination_tasks(id,member_id,kind,status,title) VALUES('{ident(52)}','{ident(1)}','booking','requested','Synthetic booking')", "23514")
        no("outbox_event_key_is_unique",
           f"INSERT INTO outbox_events(id,event_key,event_type,aggregate_type,aggregate_id,payload) "
           f"VALUES('{ident(63)}','plan:synthetic:published','plan.published','plan','{ident(30)}','{{}}')", "23505")
        no("job_dedupe_key_is_unique",
           f"INSERT INTO jobs(id,kind,dedupe_key,payload) VALUES('{ident(64)}','synthetic-notification','notification:synthetic:1','{{}}')", "23505")
        no("running_job_requires_lease",
           f"UPDATE jobs SET status='running' WHERE id='{ident(61)}'", "23514")
        no("ready_job_cannot_keep_lease",
           f"UPDATE jobs SET locked_by='worker-0',lease_token='{ident(70)}',lease_expires_at=now()+interval '1 minute' WHERE id='{ident(61)}'", "23514")
        no("completed_job_requires_finish_time",
           f"UPDATE jobs SET status='succeeded' WHERE id='{ident(61)}'", "23514")

        checks.append(f"GRANT INSERT ON validation_results TO {role}; SET ROLE {role};")
        yes("runtime_role_is_non_owner_non_superuser",
            "SELECT NOT r.rolsuper AND r.oid <> c.relowner FROM pg_roles r "
            "JOIN pg_class c ON c.relname='care_plans' AND c.relnamespace='public'::regnamespace "
            "WHERE r.rolname=current_user")
        for table in append_only:
            column = "record_id" if table == "record_revisions" else "id"
            no(f"runtime_cannot_update_{table}", f"UPDATE {table} SET {column}={column} WHERE false", "42501")
            no(f"runtime_cannot_delete_{table}", f"DELETE FROM {table} WHERE false", "42501")
            no(f"runtime_cannot_truncate_{table}", f"TRUNCATE {table}", "42501")
        no("web_role_cannot_publish_consent_document",
           f"INSERT INTO consent_documents(id,scope,version,body,sha256,approved_at,effective_at) "
           f"VALUES('{ident(29)}','clinical','unauthorized-v2','Synthetic consent',repeat('b',64),now(),now())", "42501")
        checks.append(f"INSERT INTO action_events(id,plan_id,action_id,member_id,actor_id,done) "
                      f"VALUES('{ident(35)}','{ident(30)}','{ident(31)}','{ident(1)}','{ident(1)}',false);")
        yes("runtime_can_append_progress_with_generated_sequence",
            f"SELECT count(*)=2 AND count(DISTINCT sequence)=2 FROM action_events WHERE action_id='{ident(31)}'")
        checks.append("RESET ROLE;")
        checks.append("SELECT 'VALIDATION_JSON=' || json_agg(row_to_json(r))::text FROM validation_results r;")
        raw = sql("\n".join(checks))
        line = next(line for line in raw.splitlines() if line.startswith("VALIDATION_JSON="))
        assertions.extend(json.loads(line.split("=", 1)[1]))

        # Two live transactions overlap: worker A holds its row lock while B
        # claims another eligible row. A barrier confirms the lock is held.
        def claim(worker: str, token: int, hold: bool = False) -> str:
            pause = "SELECT 'LOCK_ACQUIRED'; SELECT pg_sleep(3);" if hold else ""
            return f"""BEGIN;
WITH candidate AS (
 SELECT id FROM jobs WHERE status='ready' AND available_at<=now() AND attempts<max_attempts
 ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT 1
)
UPDATE jobs j SET status='running',attempts=attempts+1,locked_by='{worker}',
 lease_token='{ident(token)}',lease_expires_at=now()+interval '1 minute',updated_at=now()
FROM candidate c WHERE j.id=c.id RETURNING 'CLAIMED=' || j.id::text;
{pause}
COMMIT;
"""

        first = subprocess.Popen(base + ["-d", database], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        first.stdin.write(claim("synthetic-worker-a", 71, hold=True))
        first.stdin.close()
        first_output = []
        # A timeout prevents an unsuccessful barrier from hanging validation.
        def read_barrier() -> None:
            for line in first.stdout:
                first_output.append(line.strip())
                if line.strip() == "LOCK_ACQUIRED":
                    return
            raise RuntimeError("First job claimant ended before acquiring its row lock")

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            executor.submit(read_barrier).result(timeout=20)
        second_output = sql(claim("synthetic-worker-b", 72))
        first.wait(timeout=15)
        first_output.extend(line.strip() for line in first.stdout)
        first_error = first.stderr.read()
        if first.returncode:
            raise RuntimeError(first_error)
        claimed_a = next(line.split("=", 1)[1] for line in first_output if line.startswith("CLAIMED="))
        claimed_b = next(line.split("=", 1)[1] for line in second_output.splitlines() if line.startswith("CLAIMED="))
        if claimed_a == claimed_b:
            raise AssertionError("Overlapping workers claimed the same job")
        assertions.append({"name": "overlapping_skip_locked_workers_claim_distinct_jobs", "passed": True})
        if sql("SELECT count(*) FROM jobs WHERE status='running' AND attempts=1 AND lease_token IS NOT NULL;") != "2":
            raise AssertionError("Both claims must be persisted once")
        assertions.append({"name": "both_job_claims_persisted_once_with_lease", "passed": True})
        # An obsolete lease holder must not complete work owned by a new token.
        old_lease_updates = sql(f"WITH changed AS (UPDATE jobs SET status='succeeded',finished_at=now(),"
                                f"locked_by=NULL,lease_token=NULL,lease_expires_at=NULL "
                                f"WHERE id='{claimed_a}' AND status='running' AND lease_token='{ident(99)}' "
                                "AND lease_expires_at>now() RETURNING id) "
                                "SELECT count(*) FROM changed;")
        if old_lease_updates != "0":
            raise AssertionError("Stale lease completion was not fenced")
        assertions.append({"name": "conditional_update_rejects_stale_lease_token", "passed": True})
        sql(f"UPDATE jobs SET lease_expires_at=now()-interval '1 second' WHERE id='{claimed_a}';")
        expired_lease_updates = sql(f"WITH changed AS (UPDATE jobs SET status='succeeded',finished_at=now(),"
                                    f"locked_by=NULL,lease_token=NULL,lease_expires_at=NULL "
                                    f"WHERE id='{claimed_a}' AND status='running' AND lease_token='{ident(71)}' "
                                    "AND lease_expires_at>now() RETURNING id) SELECT count(*) FROM changed;")
        if expired_lease_updates != "0":
            raise AssertionError("Expired lease completion was not fenced")
        assertions.append({"name": "conditional_update_rejects_expired_lease", "passed": True})
        current_lease_updates = sql(f"WITH changed AS (UPDATE jobs SET status='succeeded',finished_at=now(),"
                                    f"locked_by=NULL,lease_token=NULL,lease_expires_at=NULL "
                                    f"WHERE id='{claimed_b}' AND status='running' AND lease_token='{ident(72)}' "
                                    "AND lease_expires_at>now() RETURNING id) SELECT count(*) FROM changed;")
        if current_lease_updates != "1":
            raise AssertionError("Current valid lease could not complete")
        assertions.append({"name": "current_valid_lease_completes_and_clears_lease_fields", "passed": True})
        sql(f"INSERT INTO jobs(id,kind,dedupe_key,payload,attempts,max_attempts) "
            f"VALUES('{ident(64)}','synthetic-notification','notification:synthetic:exhausted','{{}}',8,8);")
        if "CLAIMED=" in sql(claim("synthetic-worker-c", 73)):
            raise AssertionError("Exhausted job must not be reclaimed without recovery")
        assertions.append({"name": "documented_claim_skips_exhausted_jobs", "passed": True})

        # Synthetic storage/index smoke check; does not send HTTP traffic,
        # benchmark latency, establish throughput, or prove concurrency capacity.
        sql("""
INSERT INTO app_users(id,phone_e164,display_name)
 SELECT md5('synthetic-member-'||n)::uuid,'+98910'||lpad(n::text,7,'0'),'Synthetic member '||n
 FROM generate_series(1,998) AS g(n);
INSERT INTO user_roles(user_id,role)
 SELECT md5('synthetic-member-'||n)::uuid,'member' FROM generate_series(1,998) AS g(n);
INSERT INTO memberships(member_id)
 SELECT md5('synthetic-member-'||n)::uuid FROM generate_series(1,998) AS g(n);
INSERT INTO health_records(id,member_id,assessment_version,status,submitted_at)
 SELECT md5('synthetic-record-'||n)::uuid,md5('synthetic-member-'||n)::uuid,'synthetic-v1','submitted',
 now() - make_interval(secs=>n) FROM generate_series(1,998) AS g(n);
ANALYZE;
""")
        if sql("SELECT count(*) FROM memberships WHERE enabled;") != "1000":
            raise AssertionError("Expected 1,000 enabled synthetic memberships")
        assertions.append({"name": "schema_stores_1000_enabled_synthetic_members", "passed": True})
        plan = json.loads(sql("EXPLAIN (FORMAT JSON) SELECT id,member_id FROM health_records "
                              "WHERE status='submitted' ORDER BY urgent DESC,submitted_at,id LIMIT 25;"))
        table_count = int(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';"))
        index_count = int(sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public';"))
        report = {
            "status": "passed", "executedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "engine": {"name": "PostgreSQL", "version": version},
            "schema": {"path": str(DDL.relative_to(ROOT)), "sha256": hashlib.sha256(schema_bytes).hexdigest(),
                       "tableCount": table_count, "indexCount": index_count, "appliedToProduction": False},
            "validator": "scripts/validate_target_schema.py",
            "assertionCount": len(assertions), "assertions": assertions,
            "syntheticMemberCount": 1000,
            "queryPlan": {"purpose": "Illustrative review queue index selection with 1,000 synthetic records; not a performance benchmark",
                          "sql": "SELECT id,member_id FROM health_records WHERE status='submitted' ORDER BY urgent DESC,submitted_at,id LIMIT 25",
                          "explain": plan},
            "appendOnlyPermissions": {"testedWithExplicitDisposableNonOwnerRole": True,
                                      "tables": append_only,
                                      "notProvisionedBySchemaDdl": True},
            "queueConcurrency": {"overlappingTransactions": 2, "claimedDistinctJobs": True,
                                 "providerCalled": False, "deliveryGuarantee": "at-least-once; no exactly-once claim"},
            "notVerified": [
                "1,000 simultaneously active users, HTTP latency, throughput, production sizing or availability",
                "Application integration, authentication/authorization, transitions and clinical content validation",
                "Membership admission capacity lock protocol and concurrent refund total checks",
                "Consent scope/withdrawal enforcement and clinical-assignment authorization",
                "External payment/SMS/storage/scan providers, payment reconciliation and worker side effects",
                "Runtime deployment role provisioning, backups, restoration, retention and actual production migration",
            ],
            "durationSeconds": round(time.time() - started, 3),
            "cleanup": "Temporary test database and role removed by validator finally block",
        }
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"status": "passed", "assertions": len(assertions), "tables": table_count,
                          "report": str(args.report.relative_to(ROOT))}, ensure_ascii=False))
    finally:
        if created:
            sql(f"DROP DATABASE {database} WITH (FORCE);", "postgres")
        if role_created:
            sql(f"DROP ROLE {role};", "postgres")


if __name__ == "__main__":
    main()
