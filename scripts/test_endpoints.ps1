#requires -Version 7.0

$ErrorActionPreference = 'Stop'

# Billor Backend Challenge - Endpoint Test Script (PowerShell)
# This script tests all required endpoints end-to-end on Windows

param(
  [string]$BaseUrl = "http://localhost:3000/api"
)

function Step($n, $msg) { Write-Host "[STEP $n] $msg" -ForegroundColor Cyan }
function Success($msg) { Write-Host "`u2713 $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "X ERROR: $msg" -ForegroundColor Red; exit 1 }

Write-Host "=== Billor Backend Challenge - Endpoint Tests (PowerShell) ===" -ForegroundColor Yellow

# Helper: Invoke API (returns object)
function Invoke-ApiJson {
  param(
    [Parameter(Mandatory)] [ValidateSet('GET','POST','PATCH')] [string]$Method,
    [Parameter(Mandatory)] [string]$Endpoint,
    [Parameter()] $Body,
    [Parameter()] [string]$Token
  )
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  if ($Body) {
    return Invoke-RestMethod -Method $Method -Uri ("{0}{1}" -f $BaseUrl, $Endpoint) -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6)
  } else {
    return Invoke-RestMethod -Method $Method -Uri ("{0}{1}" -f $BaseUrl, $Endpoint) -Headers $headers
  }
}

# 1) Login
Step 1 'Login to get JWT token'
$loginResp = Invoke-ApiJson -Method POST -Endpoint '/auth/login' -Body @{ email='admin@demo.com'; password='admin123' }
$TOKEN = $loginResp.access_token
if (-not $TOKEN) { Fail "Failed to get JWT token. Response: $($loginResp | ConvertTo-Json -Depth 6)" }
Success "JWT token obtained: $($TOKEN.Substring(0, [Math]::Min(20,$TOKEN.Length)))..."

# 2) Create user
Step 2 'Create a new user'
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$userEmail = "test-$ts@example.com"
$userResp = Invoke-ApiJson -Method POST -Endpoint '/users' -Token $TOKEN -Body @{ name='Test User'; email=$userEmail; password='test123' }
$USER_ID = $userResp.id
if (-not $USER_ID) { Fail "Failed to create user. Response: $($userResp | ConvertTo-Json -Depth 6)" }
Success "User created: $USER_ID ($userEmail)"

# 3) Create drivers
Step 3 'Create drivers'
$drv1 = "DRV-$ts-001"
$drv2 = "DRV-$ts-002"
$d1 = Invoke-ApiJson -Method POST -Endpoint '/drivers' -Token $TOKEN -Body @{ name='John Doe'; licenseNumber=$drv1; status='ACTIVE' }
$d2 = Invoke-ApiJson -Method POST -Endpoint '/drivers' -Token $TOKEN -Body @{ name='Jane Smith'; licenseNumber=$drv2; status='ACTIVE' }
$DRIVER1_ID = $d1.id; $DRIVER2_ID = $d2.id
if (-not $DRIVER1_ID) { Fail "Failed to create driver 1. Response: $($d1 | ConvertTo-Json -Depth 6)" }
if (-not $DRIVER2_ID) { Fail "Failed to create driver 2. Response: $($d2 | ConvertTo-Json -Depth 6)" }
Success "Drivers created: $DRIVER1_ID, $DRIVER2_ID"

# 4) Create loads
Step 4 'Create loads'
$l1 = Invoke-ApiJson -Method POST -Endpoint '/loads' -Token $TOKEN -Body @{ origin='New York'; destination='Los Angeles'; cargoType='Electronics'; status='OPEN' }
$l2 = Invoke-ApiJson -Method POST -Endpoint '/loads' -Token $TOKEN -Body @{ origin='Chicago'; destination='Miami'; cargoType='Furniture'; status='OPEN' }
$LOAD1_ID = $l1.id; $LOAD2_ID = $l2.id
if (-not $LOAD1_ID) { Fail "Failed to create load 1. Response: $($l1 | ConvertTo-Json -Depth 6)" }
if (-not $LOAD2_ID) { Fail "Failed to create load 2. Response: $($l2 | ConvertTo-Json -Depth 6)" }
Success "Loads created: $LOAD1_ID, $LOAD2_ID"

# 4.1) Validate LOAD_CREATED
Step '4.1' 'Validate Load 1 events contain LOAD_CREATED'
$ev1 = Invoke-ApiJson -Method GET -Endpoint "/loads/$LOAD1_ID/events" -Token $TOKEN
if ($ev1.events | Where-Object { $_.type -eq 'LOAD_CREATED' }) { Success 'LOAD_CREATED present' } else { Fail "Expected LOAD_CREATED. Events: $($ev1 | ConvertTo-Json -Depth 6)" }

# 5) List loads (DB)
Step 5 'List loads - First call (DB)'
$loads1 = Invoke-ApiJson -Method GET -Endpoint '/loads' -Token $TOKEN
if ($loads1.source -ne 'db') { Write-Host "Warning: expected 'db', got '$($loads1.source)'" -ForegroundColor Yellow } else { Success "Loads from DB" }

# 6) List loads (cache)
Step 6 'List loads - Second call (cache)'
Start-Sleep -Seconds 1
$loads2 = Invoke-ApiJson -Method GET -Endpoint '/loads' -Token $TOKEN
if ($loads2.source -ne 'cache') { Write-Host "Warning: expected 'cache', got '$($loads2.source)'" -ForegroundColor Yellow } else { Success "Loads from cache" }

# 7) Assign load to driver
Step 7 'Assign Load 1 to Driver 1'
$as1 = Invoke-ApiJson -Method POST -Endpoint '/assignments' -Token $TOKEN -Body @{ driverId=$DRIVER1_ID; loadId=$LOAD1_ID }
$ASSIGNMENT1_ID = $as1.id
if (-not $ASSIGNMENT1_ID) { Fail "Failed to create assignment. Response: $($as1 | ConvertTo-Json -Depth 6)" }
Success "Assignment created: $ASSIGNMENT1_ID (should publish load.assigned)"

# 8) Fetch assignment details
Step 8 'Fetch assignment details'
$as1d = Invoke-ApiJson -Method GET -Endpoint "/assignments/$ASSIGNMENT1_ID" -Token $TOKEN
if ($as1d.status -ne 'ASSIGNED') { Fail "Expected status ASSIGNED, got $($as1d.status)" } else { Success "Assignment status ASSIGNED" }

# 8.1) Validate ASSIGNED event
Step '8.1' 'Validate Load 1 events contain ASSIGNED'
$ev2 = Invoke-ApiJson -Method GET -Endpoint "/loads/$LOAD1_ID/events" -Token $TOKEN
if ($ev2.events | Where-Object { $_.type -eq 'ASSIGNED' }) { Success 'ASSIGNED present' } else { Fail "Expected ASSIGNED. Events: $($ev2 | ConvertTo-Json -Depth 6)" }

# 9) Try to assign another load to same driver (should fail)
Step 9 'Try second assignment (must fail)'
$failed = $false
try {
  $null = Invoke-ApiJson -Method POST -Endpoint '/assignments' -Token $TOKEN -Body @{ driverId=$DRIVER1_ID; loadId=$LOAD2_ID }
} catch {
  $failed = $true
}
if (-not $failed) { Fail 'Expected rejection for second active assignment' } else { Success 'Correctly rejected second active assignment' }

# 10) Complete assignment
Step 10 'Complete the assignment'
$upd = Invoke-ApiJson -Method PATCH -Endpoint "/assignments/$ASSIGNMENT1_ID/status" -Token $TOKEN -Body @{ status='COMPLETED' }
if ($upd.status -ne 'COMPLETED') { Fail "Expected COMPLETED, got $($upd.status)" } else { Success 'Assignment completed' }

# 10.1) Validate LOAD_COMPLETED
Step '10.1' 'Validate LOAD_COMPLETED event'
$ev3 = Invoke-ApiJson -Method GET -Endpoint "/loads/$LOAD1_ID/events" -Token $TOKEN
if ($ev3.events | Where-Object { $_.type -eq 'LOAD_COMPLETED' }) { Success 'LOAD_COMPLETED present' } else { Fail "Expected LOAD_COMPLETED. Events: $($ev3 | ConvertTo-Json -Depth 6)" }

# 11) Now driver can take another load
Step 11 'Assign Load 2 to Driver 1 (should succeed now)'
$as2 = Invoke-ApiJson -Method POST -Endpoint '/assignments' -Token $TOKEN -Body @{ driverId=$DRIVER1_ID; loadId=$LOAD2_ID }
if (-not $as2.id) { Fail "Failed to create second assignment. Response: $($as2 | ConvertTo-Json -Depth 6)" } else { Success "Second assignment created: $($as2.id)" }

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
