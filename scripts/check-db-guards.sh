#!/usr/bin/env bash
# Proves the record cannot be rewritten, against the local test database (after a smoke run):
# updates and deletes on events and signed_pdfs fail, a frozen envelope field cannot change, a
# completed envelope is final, and the public roles cannot call complete_envelope.
#   . .local-db/env; scripts/check-db-guards.sh
set -u
: "${LOCAL_DB_URL:?run: set -a; . .local-db/env; set +a}"
fail=0
expect_error() { # label sql
  local out
  out="$(psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "$2" 2>&1)"
  if [ $? -ne 0 ] && grep -q "ink:" <<<"$out"; then echo "ok   $1"; else echo "FAIL $1: $out"; fail=1; fi
}
expect_ok() {
  local out
  out="$(psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 -c "$2" 2>&1)"
  if [ $? -eq 0 ]; then echo "ok   $1"; else echo "FAIL $1: $out"; fail=1; fi
}
expect_error "events cannot be updated" "update events set ip = '1.1.1.1' where id = (select min(id) from events)"
expect_error "events cannot be deleted" "delete from events where id = (select min(id) from events)"
expect_error "signed PDFs cannot be replaced" "update signed_pdfs set pdf_base64 = 'x' where envelope_id = (select envelope_id from signed_pdfs limit 1)"
expect_error "signed PDFs cannot be deleted" "delete from signed_pdfs"
expect_error "a frozen agreement text cannot change" "update envelopes set document = '{}'::jsonb where id = (select id from envelopes limit 1)"
expect_error "a completed envelope's signer cannot change" "update envelopes set signer_name = 'Someone Else' where status = 'completed'"
expect_error "a completed envelope cannot be voided" "update envelopes set status = 'voided' where status = 'completed'"
expect_error "fingerprints are written once" "update envelopes set pdf_sha256 = repeat('0', 64) where status = 'completed' and pdf_sha256 is not null"
expect_error "envelopes are never deleted" "delete from envelopes where status = 'voided'"
expect_ok "a completed envelope may be read" "select count(*) from envelopes where status = 'completed'"
out="$(psql "$LOCAL_DB_URL" -X -q -At -c "select has_function_privilege('anon', 'complete_envelope(uuid, text, text, jsonb, text)', 'execute')")"
if [ "$out" = "f" ]; then echo "ok   anon cannot call complete_envelope"; else echo "FAIL anon can call complete_envelope ($out)"; fail=1; fi
[ "$fail" = 0 ] && echo "all database guards hold" || { echo "some guards FAILED"; exit 1; }
