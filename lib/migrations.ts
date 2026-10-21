/**
 * Ordered, append-only migrations. Never edit a shipped entry — add a new one.
 * Applied ids are recorded in `_migration`, so `migrate()` is idempotent.
 */
export type Migration = { id: string; sql: string };

export const migrations: Migration[] = [
  {
    id: '0001_init',
    sql: `
-- ---------- identity ----------
CREATE TABLE user (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  email_lower     TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  password_algo   TEXT NOT NULL,
  recovery_hash   TEXT,            -- hash of the one-time recovery code
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
);

CREATE TABLE session (
  id              TEXT PRIMARY KEY,   -- sha256 of the cookie token; the token itself is never stored
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  revoked_at      INTEGER,
  user_agent      TEXT
);
CREATE INDEX session_user_idx ON session(user_id, expires_at);

CREATE TABLE user_settings (
  user_id             TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  language            TEXT NOT NULL DEFAULT 'en',
  text_scale          TEXT NOT NULL DEFAULT 'normal',   -- normal | large | xlarge
  reduce_motion       INTEGER NOT NULL DEFAULT 0,
  theme               TEXT NOT NULL DEFAULT 'system',   -- system | light | dark
  retention_days      INTEGER NOT NULL DEFAULT 90,      -- 0 = keep until deleted
  notify_reviews      INTEGER NOT NULL DEFAULT 1,
  notify_invitations  INTEGER NOT NULL DEFAULT 1,
  notify_security     INTEGER NOT NULL DEFAULT 1,
  onboarding_step     INTEGER NOT NULL DEFAULT 0,
  onboarding_done_at  INTEGER,
  updated_at          INTEGER NOT NULL
);

CREATE TABLE subscription_entitlement (
  user_id         TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'free',   -- free | family
  source          TEXT NOT NULL DEFAULT 'default',-- default | dev_simulation
  max_members     INTEGER NOT NULL DEFAULT 2,
  max_reviewers   INTEGER NOT NULL DEFAULT 1,
  history_limit   INTEGER NOT NULL DEFAULT 25,
  updated_at      INTEGER NOT NULL
);

-- ---------- family ----------
CREATE TABLE family_circle (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  created_by      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at      INTEGER NOT NULL
);

CREATE TABLE family_membership (
  id              TEXT PRIMARY KEY,
  circle_id       TEXT NOT NULL REFERENCES family_circle(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,    -- admin | member
  joined_at       INTEGER NOT NULL,
  left_at         INTEGER,
  UNIQUE (circle_id, user_id)
);
CREATE INDEX membership_user_idx ON family_membership(user_id, left_at);

CREATE TABLE family_invitation (
  id              TEXT PRIMARY KEY,
  circle_id       TEXT NOT NULL REFERENCES family_circle(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,  -- sha256 of the invite token
  label           TEXT,
  created_by      TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  accepted_at     INTEGER,
  accepted_by     TEXT REFERENCES user(id) ON DELETE SET NULL,
  revoked_at      INTEGER
);
CREATE INDEX invitation_circle_idx ON family_invitation(circle_id);

CREATE TABLE trusted_contact (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  contact_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  circle_id       TEXT REFERENCES family_circle(id) ON DELETE SET NULL,
  note            TEXT,
  created_at      INTEGER NOT NULL,
  removed_at      INTEGER,
  UNIQUE (owner_user_id, contact_user_id)
);

-- ---------- scans ----------
CREATE TABLE scan_case (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,     -- text | image | url | qr | payment
  outcome         TEXT NOT NULL,     -- warning_signs | verification_recommended | insufficient_information | no_known_warning_signs
  headline        TEXT NOT NULL,
  claim_type      TEXT,              -- bank | delivery | payment | support | job | shopping | utility | acquaintance | institution | unknown
  title           TEXT NOT NULL,
  is_demo         INTEGER NOT NULL DEFAULT 0,
  saved           INTEGER NOT NULL DEFAULT 1,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER,           -- retention policy; nullable = keep
  deleted_at      INTEGER
);
CREATE INDEX scan_owner_idx ON scan_case(owner_user_id, created_at DESC);

CREATE TABLE scan_input (
  scan_case_id    TEXT PRIMARY KEY REFERENCES scan_case(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,     -- pasted | ocr | ocr_corrected | url | qr | form
  content_enc     TEXT NOT NULL,     -- AES-256-GCM sealed, redacted text
  redaction_count INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT               -- small non-sensitive structured fields
);

CREATE TABLE scan_finding (
  id              TEXT PRIMARY KEY,
  scan_case_id    TEXT NOT NULL REFERENCES scan_case(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  category        TEXT NOT NULL,
  severity        TEXT NOT NULL,     -- info | caution | high
  title           TEXT NOT NULL,
  explanation     TEXT NOT NULL,
  position        INTEGER NOT NULL
);
CREATE INDEX finding_case_idx ON scan_finding(scan_case_id, position);

CREATE TABLE scan_evidence (
  id              TEXT PRIMARY KEY,
  scan_finding_id TEXT NOT NULL REFERENCES scan_finding(id) ON DELETE CASCADE,
  excerpt_enc     TEXT NOT NULL,     -- sealed excerpt from the submitted content
  note            TEXT
);
CREATE INDEX evidence_finding_idx ON scan_evidence(scan_finding_id);

-- ---------- verification ----------
CREATE TABLE verification_checklist (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  scan_case_id    TEXT REFERENCES scan_case(id) ON DELETE CASCADE,
  claim_type      TEXT NOT NULL,
  title           TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  completed_at    INTEGER
);
CREATE INDEX checklist_owner_idx ON verification_checklist(owner_user_id, created_at DESC);

CREATE TABLE verification_step (
  id              TEXT PRIMARY KEY,
  checklist_id    TEXT NOT NULL REFERENCES verification_checklist(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  instruction     TEXT NOT NULL,
  detail          TEXT,
  done_at         INTEGER,
  outcome_note    TEXT
);
CREATE INDEX step_checklist_idx ON verification_step(checklist_id, position);

-- ---------- reviews ----------
CREATE TABLE review_request (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  circle_id       TEXT REFERENCES family_circle(id) ON DELETE SET NULL,
  scan_case_id    TEXT REFERENCES scan_case(id) ON DELETE CASCADE,
  state           TEXT NOT NULL,   -- draft|awaiting_review|under_review|more_info_requested|reviewed|closed|cancelled
  question        TEXT NOT NULL,
  share_findings  INTEGER NOT NULL DEFAULT 1,
  share_content   INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  closed_at       INTEGER
);
CREATE INDEX review_owner_idx ON review_request(owner_user_id, updated_at DESC);

CREATE TABLE review_participant (
  id                TEXT PRIMARY KEY,
  review_request_id TEXT NOT NULL REFERENCES review_request(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  verdict           TEXT,     -- see_warning_signs | verify_independently | need_more_info | cannot_determine
  responded_at      INTEGER,
  removed_at        INTEGER,
  UNIQUE (review_request_id, user_id)
);
CREATE INDEX participant_user_idx ON review_participant(user_id, removed_at);

CREATE TABLE review_comment (
  id                TEXT PRIMARY KEY,
  review_request_id TEXT NOT NULL REFERENCES review_request(id) ON DELETE CASCADE,
  author_user_id    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  verdict           TEXT,
  created_at        INTEGER NOT NULL
);
CREATE INDEX comment_review_idx ON review_comment(review_request_id, created_at);

CREATE TABLE access_grant (
  id                TEXT PRIMARY KEY,
  resource_type     TEXT NOT NULL,   -- scan_case | recovery_case
  resource_id       TEXT NOT NULL,
  grantee_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  granted_by        TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  review_request_id TEXT REFERENCES review_request(id) ON DELETE CASCADE,
  scope             TEXT NOT NULL,   -- findings | findings_and_content
  created_at        INTEGER NOT NULL,
  revoked_at        INTEGER
);
CREATE UNIQUE INDEX grant_unique_idx
  ON access_grant(resource_type, resource_id, grantee_user_id, review_request_id);
CREATE INDEX grant_lookup_idx ON access_grant(grantee_user_id, resource_type, resource_id, revoked_at);

-- ---------- payment review ----------
CREATE TABLE payment_review (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  scan_case_id    TEXT NOT NULL REFERENCES scan_case(id) ON DELETE CASCADE,
  claimed_payee   TEXT,
  upi_id          TEXT,
  amount_paise    INTEGER,
  reason          TEXT,
  channel         TEXT,            -- how the request arrived
  created_at      INTEGER NOT NULL
);
CREATE INDEX payment_owner_idx ON payment_review(owner_user_id, created_at DESC);

-- ---------- recovery ----------
CREATE TABLE recovery_case (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL,   -- open | reported | resolved | closed
  lost_amount_paise INTEGER,
  happened_at     INTEGER,
  notes           TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX recovery_owner_idx ON recovery_case(owner_user_id, updated_at DESC);

CREATE TABLE recovery_evidence (
  id                TEXT PRIMARY KEY,
  recovery_case_id  TEXT NOT NULL REFERENCES recovery_case(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,   -- transaction_ref | note | report_ack | contact | attachment
  label             TEXT NOT NULL,
  value             TEXT,
  attachment_id     TEXT,
  created_at        INTEGER NOT NULL
);
CREATE INDEX recovery_evidence_idx ON recovery_evidence(recovery_case_id, created_at);

CREATE TABLE attachment (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  mime            TEXT NOT NULL,
  byte_size       INTEGER NOT NULL,
  sha256          TEXT NOT NULL,
  bytes           BLOB NOT NULL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX attachment_owner_idx ON attachment(owner_user_id, created_at DESC);

-- ---------- notifications, academy, audit ----------
CREATE TABLE notification (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  href            TEXT,
  dedupe_key      TEXT,
  created_at      INTEGER NOT NULL,
  read_at         INTEGER,
  dismissed_at    INTEGER
);
CREATE INDEX notification_user_idx ON notification(user_id, created_at DESC);
CREATE UNIQUE INDEX notification_dedupe_idx ON notification(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE academy_lesson (
  slug            TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  position        INTEGER NOT NULL
);

CREATE TABLE academy_progress (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  lesson_slug     TEXT NOT NULL REFERENCES academy_lesson(slug) ON DELETE CASCADE,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_count     INTEGER NOT NULL DEFAULT 0,
  completed_at    INTEGER,
  updated_at      INTEGER NOT NULL,
  UNIQUE (user_id, lesson_slug)
);

CREATE TABLE audit_event (
  id              TEXT PRIMARY KEY,
  actor_user_id   TEXT REFERENCES user(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  detail          TEXT,       -- never content; short labels only
  created_at      INTEGER NOT NULL
);
CREATE INDEX audit_actor_idx ON audit_event(actor_user_id, created_at DESC);

CREATE TABLE rate_limit (
  bucket          TEXT PRIMARY KEY,
  count           INTEGER NOT NULL,
  window_start    INTEGER NOT NULL
);
`,
  },
  {
    // A circle belongs to its members, not to whoever happened to create it.
    // The original ON DELETE CASCADE on created_by destroyed a whole circle — for
    // everyone in it — when the creator deleted their account. SQLite cannot alter a
    // foreign key in place, so the table is rebuilt.
    id: '0002_circle_survives_creator',
    sql: `
PRAGMA foreign_keys = OFF;

CREATE TABLE family_circle_new (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  created_by      TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at      INTEGER NOT NULL
);
INSERT INTO family_circle_new (id, name, created_by, created_at)
  SELECT id, name, created_by, created_at FROM family_circle;
DROP TABLE family_circle;
ALTER TABLE family_circle_new RENAME TO family_circle;

PRAGMA foreign_keys = ON;
`,
  },
];
