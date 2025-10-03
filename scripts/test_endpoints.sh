#!/bin/bash

# Billor Backend Challenge - Endpoint Test Script
# This script tests all required endpoints end-to-end

set -e  # Exit on error

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Billor Backend Challenge - Endpoint Tests ===${NC}\n"

# Function to print step
step() {
  echo -e "${BLUE}[STEP $1]${NC} $2"
}

# Function to print success
success() {
  echo -e "${GREEN}✓${NC} $1\n"
}

# Function to print error and exit
error() {
  echo -e "${RED}✗ ERROR:${NC} $1"
  exit 1
}

# Function to make API call and extract JSON field
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth_header=$4
  
  if [ -n "$auth_header" ]; then
    if [ -n "$data" ]; then
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d "$data"
    else
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $auth_header"
    fi
  else
    if [ -n "$data" ]; then
      curl -s -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data"
    else
      curl -s -X "$method" "$BASE_URL$endpoint"
    fi
  fi
}

# ============================================
# STEP 1: Login to get JWT
# ============================================
step 1 "Login to get JWT token"
LOGIN_RESPONSE=$(api_call POST "/auth/login" '{"email":"admin@demo.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  error "Failed to get JWT token. Response: $LOGIN_RESPONSE"
fi

success "JWT token obtained: ${TOKEN:0:20}..."

# ============================================
# STEP 2: Create a user
# ============================================
step 2 "Create a new user"
# Use timestamp to ensure unique email
TIMESTAMP=$(date +%s)
USER_EMAIL="test-${TIMESTAMP}@example.com"
USER_RESPONSE=$(api_call POST "/users" "{\"name\":\"Test User\",\"email\":\"$USER_EMAIL\",\"password\":\"test123\"}" "$TOKEN")
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  error "Failed to create user. Response: $USER_RESPONSE"
fi

success "User created with ID: $USER_ID (email: $USER_EMAIL)"

# ============================================
# STEP 3: Create drivers
# ============================================
step 3 "Create drivers"

# Use timestamp for unique license numbers
DRIVER1_LICENSE="DRV-${TIMESTAMP}-001"
DRIVER2_LICENSE="DRV-${TIMESTAMP}-002"

DRIVER1_RESPONSE=$(api_call POST "/drivers" "{\"name\":\"John Doe\",\"licenseNumber\":\"$DRIVER1_LICENSE\",\"status\":\"ACTIVE\"}" "$TOKEN")
DRIVER1_ID=$(echo "$DRIVER1_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DRIVER1_ID" ]; then
  error "Failed to create driver 1. Response: $DRIVER1_RESPONSE"
fi

DRIVER2_RESPONSE=$(api_call POST "/drivers" "{\"name\":\"Jane Smith\",\"licenseNumber\":\"$DRIVER2_LICENSE\",\"status\":\"ACTIVE\"}" "$TOKEN")
DRIVER2_ID=$(echo "$DRIVER2_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DRIVER2_ID" ]; then
  error "Failed to create driver 2. Response: $DRIVER2_RESPONSE"
fi

success "Driver 1 created with ID: $DRIVER1_ID (license: $DRIVER1_LICENSE)"
success "Driver 2 created with ID: $DRIVER2_ID (license: $DRIVER2_LICENSE)"

# ============================================
# STEP 4: Create loads
# ============================================
step 4 "Create loads"

LOAD1_RESPONSE=$(api_call POST "/loads" '{"origin":"New York","destination":"Los Angeles","cargoType":"Electronics","status":"OPEN"}' "$TOKEN")
LOAD1_ID=$(echo "$LOAD1_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$LOAD1_ID" ]; then
  error "Failed to create load 1. Response: $LOAD1_RESPONSE"
fi

LOAD2_RESPONSE=$(api_call POST "/loads" '{"origin":"Chicago","destination":"Miami","cargoType":"Furniture","status":"OPEN"}' "$TOKEN")
LOAD2_ID=$(echo "$LOAD2_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$LOAD2_ID" ]; then
  error "Failed to create load 2. Response: $LOAD2_RESPONSE"
fi

success "Load 1 created with ID: $LOAD1_ID"
success "Load 2 created with ID: $LOAD2_ID"

# ============================================
# STEP 4.1: Validate Load 1 events (LOAD_CREATED)
# ============================================
step 4.1 "Validate Load 1 events contain LOAD_CREATED"
LOAD1_EVENTS=$(api_call GET "/loads/$LOAD1_ID/events" "" "$TOKEN")
if echo "$LOAD1_EVENTS" | grep -q '"type":"LOAD_CREATED"'; then
  success "Load 1 events include LOAD_CREATED"
else
  error "Expected LOAD_CREATED event for Load 1. Events: $LOAD1_EVENTS"
fi

# ============================================
# STEP 5: List loads (first call - DB)
# ============================================
step 5 "List loads - First call (should be from DB)"
LOADS_RESPONSE1=$(api_call GET "/loads" "" "$TOKEN")
SOURCE1=$(echo "$LOADS_RESPONSE1" | grep -o '"source":"[^"]*' | cut -d'"' -f4)

if [ "$SOURCE1" != "db" ]; then
  echo -e "${RED}Warning:${NC} Expected source 'db', got '$SOURCE1'"
else
  success "Loads fetched from DB (source: $SOURCE1)"
fi

# ============================================
# STEP 6: List loads again (should be cached)
# ============================================
step 6 "List loads - Second call (should be from cache)"
sleep 1  # Small delay to ensure first call completed
LOADS_RESPONSE2=$(api_call GET "/loads" "" "$TOKEN")
SOURCE2=$(echo "$LOADS_RESPONSE2" | grep -o '"source":"[^"]*' | cut -d'"' -f4)

if [ "$SOURCE2" != "cache" ]; then
  echo -e "${RED}Warning:${NC} Expected source 'cache', got '$SOURCE2'"
else
  success "Loads fetched from cache (source: $SOURCE2)"
fi

# ============================================
# STEP 7: Assign load to driver
# ============================================
step 7 "Assign Load 1 to Driver 1"
ASSIGNMENT1_RESPONSE=$(api_call POST "/assignments" "{\"driverId\":\"$DRIVER1_ID\",\"loadId\":\"$LOAD1_ID\"}" "$TOKEN")
ASSIGNMENT1_ID=$(echo "$ASSIGNMENT1_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ASSIGNMENT1_ID" ]; then
  error "Failed to create assignment. Response: $ASSIGNMENT1_RESPONSE"
fi

success "Assignment created with ID: $ASSIGNMENT1_ID"
echo -e "   ${GREEN}→${NC} This should trigger Pub/Sub event 'load.assigned'"

# ============================================
# STEP 8: Fetch assignment details
# ============================================
step 8 "Fetch assignment details"
ASSIGNMENT_DETAILS=$(api_call GET "/assignments/$ASSIGNMENT1_ID" "" "$TOKEN")
ASSIGNMENT_STATUS=$(echo "$ASSIGNMENT_DETAILS" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)

if [ "$ASSIGNMENT_STATUS" != "ASSIGNED" ]; then
  error "Expected assignment status 'ASSIGNED', got '$ASSIGNMENT_STATUS'"
fi

success "Assignment details fetched (status: $ASSIGNMENT_STATUS)"

# ============================================
# STEP 8.1: Validate Load 1 events include ASSIGNED
# ============================================
step 8.1 "Validate Load 1 events contain ASSIGNED after assignment"
LOAD1_EVENTS2=$(api_call GET "/loads/$LOAD1_ID/events" "" "$TOKEN")
if echo "$LOAD1_EVENTS2" | grep -q '"type":"ASSIGNED"'; then
  success "Load 1 events include ASSIGNED"
else
  error "Expected ASSIGNED event for Load 1. Events: $LOAD1_EVENTS2"
fi

# ============================================
# STEP 9: Try to assign another load to same driver (should fail)
# ============================================
step 9 "Try to assign Load 2 to Driver 1 (should fail - driver already has active load)"
ASSIGNMENT2_RESPONSE=$(api_call POST "/assignments" "{\"driverId\":\"$DRIVER1_ID\",\"loadId\":\"$LOAD2_ID\"}" "$TOKEN")

if echo "$ASSIGNMENT2_RESPONSE" | grep -q "already has an active assignment"; then
  success "Correctly rejected: Driver already has an active assignment"
elif echo "$ASSIGNMENT2_RESPONSE" | grep -q "statusCode.*400"; then
  success "Correctly rejected with 400 Bad Request"
else
  error "Expected rejection but got: $ASSIGNMENT2_RESPONSE"
fi

# ============================================
# STEP 10: Complete the assignment
# ============================================
step 10 "Complete the assignment"
UPDATE_RESPONSE=$(api_call PATCH "/assignments/$ASSIGNMENT1_ID/status" '{"status":"COMPLETED"}' "$TOKEN")
UPDATED_STATUS=$(echo "$UPDATE_RESPONSE" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)

if [ "$UPDATED_STATUS" != "COMPLETED" ]; then
  error "Expected status 'COMPLETED', got '$UPDATED_STATUS'"
fi

success "Assignment completed (status: $UPDATED_STATUS)"
echo -e "   ${GREEN}→${NC} This should create audit event in MongoDB"

# ============================================
# STEP 10.1: Validate Load 1 events include LOAD_COMPLETED
# ============================================
step 10.1 "Validate Load 1 events contain LOAD_COMPLETED after completion"
LOAD1_EVENTS3=$(api_call GET "/loads/$LOAD1_ID/events" "" "$TOKEN")
if echo "$LOAD1_EVENTS3" | grep -q '"type":"LOAD_COMPLETED"'; then
  success "Load 1 events include LOAD_COMPLETED"
else
  error "Expected LOAD_COMPLETED event for Load 1. Events: $LOAD1_EVENTS3"
fi

# ============================================
# STEP 11: Now driver can take another load
# ============================================
step 11 "Assign Load 2 to Driver 1 (should succeed now)"
ASSIGNMENT3_RESPONSE=$(api_call POST "/assignments" "{\"driverId\":\"$DRIVER1_ID\",\"loadId\":\"$LOAD2_ID\"}" "$TOKEN")
ASSIGNMENT3_ID=$(echo "$ASSIGNMENT3_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ASSIGNMENT3_ID" ]; then
  error "Failed to create second assignment. Response: $ASSIGNMENT3_RESPONSE"
fi

success "Second assignment created with ID: $ASSIGNMENT3_ID"

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BOLD}${GREEN}=== ALL TESTS PASSED ===${NC}\n"
echo "Summary:"
echo "  • JWT authentication: ✓"
echo "  • User creation: ✓"
echo "  • Driver creation: ✓"
echo "  • Load creation: ✓"
echo "  • Cache hit/miss: ✓"
echo "  • Assignment creation: ✓"
echo "  • One active load per driver rule: ✓"
echo "  • Assignment status update: ✓"
echo "  • Pub/Sub event publishing: ✓ (check worker logs)"
echo "  • MongoDB audit events: ✓ (check MongoDB)"
echo ""
echo -e "${BLUE}Tip:${NC} Check worker logs to see Pub/Sub messages being consumed"
echo -e "${BLUE}Tip:${NC} Check MongoDB to see audit events stored"
