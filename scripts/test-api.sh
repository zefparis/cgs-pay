#!/bin/bash

# Test Congo Gaming Payout API

echo "🧪 Testing Congo Gaming Payout API"
echo "==================================="

# API Base URL
API_URL="http://localhost:8080"
SECRET="dev-secret-change-in-production"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "${API_URL}/healthz" | jq '.'

# Test metrics endpoint
echo -e "\n2. Testing metrics endpoint..."
curl -s "${API_URL}/metrics" | head -n 10

# Generate signature for close-day endpoint
echo -e "\n3. Testing settlement close-day..."
PAYLOAD='{"dryRun":true}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)

curl -X POST "${API_URL}/v1/settlements/close-day" \
  -H "Content-Type: application/json" \
  -H "X-CG-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  | jq '.'

# List settlements
echo -e "\n4. Listing settlements..."
curl -s "${API_URL}/v1/runs" | jq '.'

# List payouts
echo -e "\n5. Listing payouts..."
curl -s "${API_URL}/v1/payouts" | jq '.'

echo -e "\n✅ API tests completed!"
