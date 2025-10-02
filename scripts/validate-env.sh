#!/bin/bash

# Billor Backend - Environment Validation Script
# Validates that all required environment variables are set

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Environment Validation ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}✗ ERROR:${NC} .env file not found"
  echo -e "  Run: ${YELLOW}cp .env.example .env${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} .env file exists\n"

# Required variables
REQUIRED_VARS=(
  "JWT_SECRET"
  "DATABASE_URL"
  "REDIS_URL"
  "MONGO_URL"
  "MONGO_DB"
  "PUBSUB_PROJECT_ID"
)

# Optional variables with defaults
OPTIONAL_VARS=(
  "PORT"
  "NODE_ENV"
  "PUBSUB_EMULATOR_HOST"
)

# Load .env file
export $(grep -v '^#' .env | xargs)

# Check required variables
MISSING_VARS=()
WEAK_SECRETS=()

echo -e "${BOLD}Checking required variables:${NC}"
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗${NC} $var is not set"
    MISSING_VARS+=("$var")
  else
    echo -e "${GREEN}✓${NC} $var is set"
    
    # Check for weak secrets
    if [[ "$var" == "JWT_SECRET" ]]; then
      if [[ "${!var}" == *"super-secret"* ]] || [[ "${!var}" == *"change"* ]] || [ ${#JWT_SECRET} -lt 16 ]; then
        echo -e "  ${YELLOW}⚠${NC}  Warning: JWT_SECRET appears to be weak or default"
        WEAK_SECRETS+=("$var")
      fi
    fi
  fi
done

echo ""

# Check optional variables
echo -e "${BOLD}Checking optional variables:${NC}"
for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}○${NC} $var is not set (will use default)"
  else
    echo -e "${GREEN}✓${NC} $var is set: ${!var}"
  fi
done

echo ""

# Check for production-specific issues
if [ "$NODE_ENV" = "production" ]; then
  echo -e "${BOLD}Production environment checks:${NC}"
  
  # Check if using emulator in production
  if [ -n "$PUBSUB_EMULATOR_HOST" ]; then
    echo -e "${RED}✗${NC} PUBSUB_EMULATOR_HOST should not be set in production"
    MISSING_VARS+=("PUBSUB_EMULATOR_HOST_SHOULD_BE_UNSET")
  fi
  
  # Check for localhost in URLs
  if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$REDIS_URL" == *"localhost"* ]] || [[ "$MONGO_URL" == *"localhost"* ]]; then
    echo -e "${YELLOW}⚠${NC}  Warning: Using localhost in production URLs"
  fi
  
  # Check for SSL in database URLs
  if [[ "$DATABASE_URL" != *"sslmode=require"* ]]; then
    echo -e "${YELLOW}⚠${NC}  Warning: DATABASE_URL should use SSL in production (add ?sslmode=require)"
  fi
  
  if [[ "$REDIS_URL" != "rediss://"* ]]; then
    echo -e "${YELLOW}⚠${NC}  Warning: REDIS_URL should use TLS in production (rediss://)"
  fi
fi

echo ""

# Summary
if [ ${#MISSING_VARS[@]} -eq 0 ] && [ ${#WEAK_SECRETS[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All validations passed!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ Validation failed:${NC}"
  
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "\n${RED}Missing required variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
      echo -e "  - $var"
    done
  fi
  
  if [ ${#WEAK_SECRETS[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}Weak or default secrets detected:${NC}"
    for var in "${WEAK_SECRETS[@]}"; do
      echo -e "  - $var"
    done
    echo -e "\n${YELLOW}Generate a strong secret with:${NC}"
    echo -e "  openssl rand -base64 32"
  fi
  
  exit 1
fi
