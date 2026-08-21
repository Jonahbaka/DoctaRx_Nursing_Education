-- Production persistence and integration controls for the Nursing LMS.

CREATE TABLE IF NOT EXISTS nursing_platform_collections (
  tenant_key TEXT NOT NULL,
  collection_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_key, collection_key)
);

CREATE TABLE IF NOT EXISTS nursing_platform_entities (
  tenant_key TEXT NOT NULL,
  collection_key TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_key, collection_key, entity_key)
);
CREATE INDEX IF NOT EXISTS idx_nursing_entities_collection
  ON nursing_platform_entities (tenant_key, collection_key, position, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_entities_payload
  ON nursing_platform_entities USING GIN (payload);

CREATE TABLE IF NOT EXISTS nursing_platform_metadata (
  tenant_key TEXT NOT NULL,
  metadata_key TEXT NOT NULL,
  value JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_key, metadata_key)
);

CREATE TABLE IF NOT EXISTS nursing_store_operation_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  changed_collections INTEGER NOT NULL,
  changed_entities INTEGER NOT NULL,
  conflict_retries INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nursing_store_metrics_tenant
  ON nursing_store_operation_metrics (tenant_key, created_at DESC);

-- One-time, idempotent conversion from the legacy tenant JSON document.
INSERT INTO nursing_platform_collections (tenant_key, collection_key)
SELECT state_row.tenant_key, item.key
  FROM nursing_platform_state state_row
 CROSS JOIN LATERAL jsonb_each(state_row.state) item
 WHERE jsonb_typeof(item.value) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO nursing_platform_entities (tenant_key, collection_key, entity_key, payload, position)
SELECT state_row.tenant_key,
       item.key,
       COALESCE(element.value->>'id', element.value->>'userId', element.value->>'externalKey', element.ordinality::TEXT),
       element.value,
       element.ordinality::INTEGER - 1
  FROM nursing_platform_state state_row
 CROSS JOIN LATERAL jsonb_each(state_row.state) item
 CROSS JOIN LATERAL jsonb_array_elements(item.value) WITH ORDINALITY element(value, ordinality)
 WHERE jsonb_typeof(item.value) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO nursing_platform_metadata (tenant_key, metadata_key, value)
SELECT state_row.tenant_key, item.key, item.value
  FROM nursing_platform_state state_row
 CROSS JOIN LATERAL jsonb_each(state_row.state) item
 WHERE jsonb_typeof(item.value) <> 'array'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS nursing_storage_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  owner_user_key TEXT NOT NULL,
  object_kind TEXT NOT NULL CHECK (object_kind IN ('course_media','lesson_pdf','assignment','clinical_evidence','certificate')),
  storage_provider TEXT NOT NULL DEFAULT 's3',
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256_checksum CHAR(64),
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','quarantined','rejected')),
  retention_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','revoked','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nursing_storage_scope ON nursing_storage_objects (tenant_key, owner_user_key, status);

CREATE TABLE IF NOT EXISTS nursing_verifiable_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  certificate_key TEXT NOT NULL,
  student_key TEXT NOT NULL,
  course_key TEXT,
  verification_code TEXT NOT NULL UNIQUE,
  claims_json JSONB NOT NULL,
  claims_sha256 CHAR(64) NOT NULL,
  pdf_sha256 CHAR(64) NOT NULL,
  storage_object_id UUID REFERENCES nursing_storage_objects(id) ON DELETE SET NULL,
  issued_by_key TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by_key TEXT,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  UNIQUE (tenant_key, certificate_key)
);
CREATE INDEX IF NOT EXISTS idx_nursing_certificates_verify ON nursing_verifiable_certificates (verification_code, revoked_at);

CREATE TABLE IF NOT EXISTS nursing_institution_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  billing_key TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('paystack','invoice','sponsor')),
  provider_reference TEXT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','paid','failed','refunded','sponsored')),
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_key, billing_key)
);
CREATE INDEX IF NOT EXISTS idx_nursing_billing_scope ON nursing_institution_billing (tenant_key, status, created_at DESC);

CREATE TABLE IF NOT EXISTS nursing_message_delivery_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_key TEXT NOT NULL,
  message_key TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','delivered','read','failed')),
  actor_user_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_key, sequence_number)
);
CREATE INDEX IF NOT EXISTS idx_nursing_delivery_replay ON nursing_message_delivery_events (tenant_key, sequence_number);

CREATE TABLE IF NOT EXISTS nursing_integration_health (
  integration_key TEXT PRIMARY KEY,
  required_in_production BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL CHECK (status IN ('configured','degraded','unavailable','disabled')),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detail JSONB NOT NULL DEFAULT '{}'::JSONB
);
