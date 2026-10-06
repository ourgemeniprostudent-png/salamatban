-- Additional transactional invariants for request races.
CREATE UNIQUE INDEX pilot_one_open_payment ON pilot_orders(user_id,mode) WHERE status IN ('requesting','pending','reconciliation','paid');
CREATE TRIGGER pilot_file_limit BEFORE INSERT ON pilot_files WHEN (SELECT count(*) FROM pilot_files WHERE user_id=NEW.user_id)>=10 BEGIN SELECT RAISE(ABORT,'file limit reached'); END;
CREATE TRIGGER pilot_member_limit BEFORE INSERT ON pilot_users WHEN NEW.role='member' AND NEW.active=1 AND (SELECT count(*) FROM pilot_users WHERE role='member' AND active=1)>=50 BEGIN SELECT RAISE(ABORT,'pilot capacity reached'); END;
