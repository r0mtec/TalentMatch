#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_LOGIN="${DEFAULT_ADMIN_LOGIN:-admin}"
ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-password}"
run_id="$(date +%s)-$$"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

json_value() {
  local key="$1"
  php -r '$data=json_decode(stream_get_contents(STDIN), true); echo $data[$argv[1]] ?? "";' "$key"
}

require_status() {
  local expected="$1"
  local actual="$2"
  local body_file="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "Expected HTTP $expected, got $actual" >&2
    cat "$body_file" >&2
    exit 1
  fi
}

require_status_in() {
  local actual="$1"
  local body_file="$2"
  shift 2

  local expected
  for expected in "$@"; do
    if [[ "$actual" == "$expected" ]]; then
      return 0
    fi
  done

  echo "Expected one of HTTP $*, got $actual" >&2
  cat "$body_file" >&2
  exit 1
}

request() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  shift 3

  curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$url" "$@"
}

echo "Checking request-management health"
curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/ready" >/dev/null

login_file="$tmp_dir/login.json"
status="$(request POST "$BASE_URL/api/auth/login" "$login_file" \
  -H 'Content-Type: application/json' \
  -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PASSWORD\"}")"
require_status 200 "$status" "$login_file"
token="$(json_value token < "$login_file")"

request_file="$tmp_dir/request.json"
status="$(request POST "$BASE_URL/api/requests" "$request_file" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d '{"status":"draft","position":"Backend developer"}')"
require_status 201 "$status" "$request_file"
request_id="$(json_value id < "$request_file")"

tech_file="$tmp_dir/technology.json"
tech_name="SmokeTech-$run_id"
status="$(request POST "$BASE_URL/api/technologies" "$tech_file" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$tech_name\",\"group_name\":\"frameworks\"}")"
require_status 201 "$status" "$tech_file"
technology_id="$(json_value id < "$tech_file")"

status="$(request POST "$BASE_URL/api/technologies/$technology_id/synonyms" "$tmp_dir/synonym.json" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "{\"synonym\":\"Smoke Framework $run_id\"}")"
require_status 201 "$status" "$tmp_dir/synonym.json"

status="$(request POST "$BASE_URL/api/requests/$request_id/requirements" "$tmp_dir/requirement.json" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "{\"technology_id\":\"$technology_id\",\"type\":\"must\",\"weight\":3}")"
require_status 201 "$status" "$tmp_dir/requirement.json"

status="$(request PATCH "$BASE_URL/api/requests/$request_id" "$tmp_dir/activate.json" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "{\"status\":\"active\",\"title\":\"Smoke backend request $run_id\",\"position\":\"Backend developer\",\"grade\":\"Senior\",\"location\":\"Remote\",\"citizenship\":\"RU\"}")"
require_status 200 "$status" "$tmp_dir/activate.json"

resume_file="$tmp_dir/synthetic-resume.pdf"
printf '%%PDF-1.1\n1 0 obj <<>> endobj\ntrailer <<>>\n%%%%EOF\n' > "$resume_file"

status="$(request POST "$BASE_URL/api/candidates/upload" "$tmp_dir/candidate.json" \
  -H "Authorization: Bearer $token" \
  -F 'display_name=Synthetic Smoke Candidate' \
  -F 'grade=Senior' \
  -F 'location=Remote' \
  -F 'citizenship=RU' \
  -F "resume=@$resume_file;type=application/pdf")"
require_status 202 "$status" "$tmp_dir/candidate.json"
candidate_id="$(json_value id < "$tmp_dir/candidate.json")"

status="$(request POST "$BASE_URL/api/candidates/$candidate_id/skills" "$tmp_dir/candidate-skill.json" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "{\"technology_id\":\"$technology_id\",\"raw_text\":\"$tech_name\",\"normalized_name\":\"$tech_name\",\"evidence_text\":\"Smoke evidence\",\"confidence\":100}")"
require_status 201 "$status" "$tmp_dir/candidate-skill.json"

status="$(request POST "$BASE_URL/api/requests/$request_id/candidates/$candidate_id/assessments" "$tmp_dir/assessment.json" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d '{}')"
require_status_in "$status" "$tmp_dir/assessment.json" 201 202
assessment_id="$(json_value id < "$tmp_dir/assessment.json")"

for _ in {1..20}; do
  curl -fsS -H "Authorization: Bearer $token" "$BASE_URL/api/assessments/$assessment_id" > "$tmp_dir/assessment-show.json"
  assessment_status="$(json_value status < "$tmp_dir/assessment-show.json")"

  if [[ "$assessment_status" == "done" ]]; then
    break
  fi

  if [[ "$assessment_status" == "failed" ]]; then
    echo "Assessment failed" >&2
    cat "$tmp_dir/assessment-show.json" >&2
    exit 1
  fi

  sleep 1
done

if [[ "${assessment_status:-}" != "done" ]]; then
  echo "Assessment did not complete in time; last status: ${assessment_status:-unknown}" >&2
  cat "$tmp_dir/assessment-show.json" >&2
  exit 1
fi

curl -fsS -H "Authorization: Bearer $token" "$BASE_URL/api/requests/$request_id/compare-candidates" \
  -H 'Content-Type: application/json' \
  -d "{\"candidate_ids\":[\"$candidate_id\"]}" >/dev/null
curl -fsS -H "Authorization: Bearer $token" "$BASE_URL/api/assessments/$assessment_id/report.pdf" >/dev/null
curl -fsS -H "Authorization: Bearer $token" "$BASE_URL/api/requests/$request_id/comparison-report.pdf" >/dev/null

echo "Backend smoke scenario completed"
