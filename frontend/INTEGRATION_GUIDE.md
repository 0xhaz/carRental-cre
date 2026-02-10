# Frontend-Backend Integration Guide

## Overview

This document demonstrates how the frontend and backend components work together in the Rental Car Tokenization Platform. It shows the complete data flow from user interaction through smart contracts to CRE services and back.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Investor   │  │    Rentor    │  │    Renter    │          │
│  │    Portal    │  │   Dashboard  │  │     App      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
│  ┌─────────────────────────▼────────────────────────┐           │
│  │         Web3 Integration Layer (wagmi/viem)       │           │
│  │  - Wallet Connection  - Contract Calls            │           │
│  │  - Transaction Signing - Event Listening          │           │
│  └─────────────────────────┬────────────────────────┘           │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  OnchainID   │  │ ERC-3643     │  │   Payment    │           │
│  │   System     │  │   Tokens     │  │   Protocol   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                    │
│  ┌──────▼──────────────────▼──────────────────▼───────┐          │
│  │        Vehicle Registry & Rental Booking            │          │
│  └──────────────────────┬──────────────────────────────┘          │
│                         │                                          │
│                         │ Emit Events / Request Attestations       │
│                         │                                          │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────────────┐
│                    CHAINLINK CRE LAYER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐    │
│  │    Identity      │  │    Telematics    │  │   Damage     │    │
│  │  Verification    │  │     Service      │  │  Assessment  │    │
│  │    Service       │  │                  │  │   Service    │    │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘    │
│           │                     │                     │             │
│           └─────────────────────┼─────────────────────┘             │
│                                 │                                   │
│  ┌──────────────────────────────▼─────────────────────────┐       │
│  │        Trusted Execution Environment (TEE)              │       │
│  │  - Secure Computation  - Private Data Access            │       │
│  │  - API Integration     - Cryptographic Attestations     │       │
│  └──────────────────────────────┬─────────────────────────┘       │
│                                  │                                  │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │   KYC   │  │   DMV   │  │Insurance│  │Telematics│ │ Pricing  │ │
│  │ (Jumio) │  │   API   │  │  APIs   │  │(Geotab) │  │  (KBB)  │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete User Flows with Integration Points

### Flow 1: Investor Onboarding & Investment

#### Step 1: Create Identity (Frontend → Blockchain)

**Frontend Component:**
```typescript
// components/investor/CreateIdentity.tsx
import { useContractWrite } from 'wagmi';
import OnchainIDFactoryABI from '@/abis/OnchainIDFactory.json';

export function CreateIdentity() {
  const { write: createIdentity, isLoading } = useContractWrite({
    address: CONTRACTS.OnchainIDFactory,
    abi: OnchainIDFactoryABI,
    functionName: 'createIdentity',
    args: [userAddress],
  });

  return (
    <TransactionButton onClick={createIdentity} isLoading={isLoading}>
      Create OnchainID
    </TransactionButton>
  );
}
```

**Smart Contract:**
```solidity
// contracts/OnchainID.sol
function createIdentity(address _managementKey) external returns (address identity) {
    OnchainID newIdentity = new OnchainID(_managementKey);
    newIdentity.transferOwnership(msg.sender);
    userIdentities[msg.sender] = address(newIdentity);
    emit IdentityCreated(address(newIdentity), msg.sender);
    return address(newIdentity);
}
```

**Frontend Event Listener:**
```typescript
// hooks/useIdentityEvents.ts
useContractEvent({
  address: CONTRACTS.OnchainIDFactory,
  abi: OnchainIDFactoryABI,
  eventName: 'IdentityCreated',
  listener: (logs) => {
    const { identity, owner } = logs[0].args;
    if (owner === userAddress) {
      toast.success('Identity created!');
      setIdentityAddress(identity);
    }
  },
});
```

#### Step 2: KYC Verification (Frontend → CRE → Blockchain)

**Frontend Form:**
```typescript
// components/investor/KYCForm.tsx
export function KYCForm() {
  const { verify, isLoading } = useInvestorVerification();
  const { addClaim } = useAddClaim();

  const handleSubmit = async (data: KYCFormData) => {
    // Step 1: Submit to CRE service
    const attestation = await verify({
      userId: userAddress,
      investorType: InvestorType.Retail,
      personalInfo: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dob,
        address: data.address,
        ssn: data.ssn,
      },
      documents: {
        passport: data.passportFile,
        utility: data.utilityBillFile,
      },
    });

    // Step 2: Add claims to OnchainID
    for (const claim of attestation.claims) {
      await addClaim({
        identityAddress,
        topic: claim.topic,
        scheme: 1, // ECDSA
        issuer: CRE_ISSUER_ADDRESS,
        signature: claim.signature,
        data: claim.data,
        uri: claim.uri,
        expiresAt: claim.expiresAt,
      });
    }

    toast.success('KYC verification complete!');
  };

  return <Form onSubmit={handleSubmit}>...</Form>;
}
```

**CRE Service:**
```javascript
// chainlink-cre/identity-verification-service.js
async function verifyInvestorIdentity(request) {
  // Call Jumio API (inside TEE)
  const jumioResult = await callAPI(API_ENDPOINTS.kyc.jumio, {
    method: 'POST',
    body: JSON.stringify({
      firstName: request.personalInfo.firstName,
      lastName: request.personalInfo.lastName,
      // ... other fields
    }),
  });

  // Generate claim if verified
  if (jumioResult.verification_status === 'APPROVED_VERIFIED') {
    claims.push({
      topic: 1, // CLAIM_KYC
      data: encodeClaimData(jumioResult),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
      signature: await signWithTEE(claimData),
    });
  }

  // Return attestation
  return generateAttestation({ claims });
}
```

**Smart Contract:**
```solidity
// contracts/OnchainID.sol
function addClaim(
    uint256 _topic,
    uint256 _scheme,
    address _issuer,
    bytes memory _signature,
    bytes memory _data,
    string memory _uri,
    uint256 _expiresAt
) external returns (bytes32 claimId) {
    require(trustedIssuers[_issuer], "Issuer not trusted");
    
    claimId = keccak256(abi.encodePacked(_issuer, _topic));
    claims[claimId] = Claim({...});
    claimsByTopic[_topic].push(claimId);
    
    emit ClaimAdded(claimId, _topic, _issuer);
}
```

**Frontend Update:**
```typescript
// hooks/useIdentityClaims.ts
const { data: claims } = useContractRead({
  address: identityAddress,
  abi: OnchainIDABI,
  functionName: 'getClaimIdsByTopic',
  args: [CLAIM_KYC],
  watch: true,
});

// Display verification status
useEffect(() => {
  if (claims && claims.length > 0) {
    setVerificationStatus('verified');
  }
}, [claims]);
```

#### Step 3: Register as Investor (Frontend → Blockchain)

**Frontend Component:**
```typescript
// components/investor/InvestorRegistration.tsx
export function InvestorRegistration() {
  const { register, isLoading } = useRegisterInvestor();

  const handleRegister = async (type: InvestorType, maxInvestment: bigint) => {
    await register({
      address: userAddress,
      investorType: type,
      maxInvestment,
      region: '', // Empty for non-regional
    });

    toast.success('Registered as investor!');
    router.push('/investor/marketplace');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Investor Type</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup onValueChange={(v) => setSelectedType(Number(v))}>
          <div className="space-y-4">
            <InvestorTypeOption
              type={InvestorType.Retail}
              label="Retail Investor"
              description="$1K - $50K per vehicle"
              requirements={['KYC', 'Accredited Status']}
            />
            <InvestorTypeOption
              type={InvestorType.Institutional}
              label="Institutional"
              description="$50K - $500K per fleet"
              requirements={['Enhanced Due Diligence']}
            />
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter>
        <Button onClick={() => handleRegister(selectedType, maxInvestment)}>
          Register
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**Smart Contract:**
```solidity
// contracts/ERC3643Token.sol (InvestorComplianceModule)
function registerInvestor(
    address _investor,
    InvestorType _type,
    uint256 _maxInvestment,
    string memory _region
) external onlyRole(COMPLIANCE_OFFICER) {
    require(_verifyIdentityClaims(_investor, _type), "Missing claims");
    
    investors[_investor] = InvestorProfile({
        investorType: _type,
        tier: requiredTier[_type],
        maxInvestment: _maxInvestment,
        currentHoldings: 0,
        lockupExpiry: block.timestamp + _getLockupPeriod(_type),
        isApproved: true,
        region: _region
    });
    
    emit InvestorRegistered(_investor, _type);
}
```

#### Step 4: Make Investment (Frontend → Blockchain → CRE)

**Frontend Investment Flow:**
```typescript
// components/investor/InvestmentModal.tsx
export function InvestmentModal({ vehicle, campaign }: Props) {
  const [amount, setAmount] = useState<bigint>(0n);
  const { invest, isLoading } = useInvest();

  const handleInvest = async () => {
    // Create payment
    const paymentId = await invest({
      vehicleId: vehicle.tokenId,
      amount,
      rentor: vehicle.owner,
    });

    toast.success('Investment submitted!');
    
    // Track investment
    trackEvent('investment_completed', {
      vehicle_id: vehicle.tokenId.toString(),
      amount: formatEther(amount),
    });
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invest in {vehicle.make} {vehicle.model}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Investment Amount</Label>
            <Input
              type="number"
              value={formatEther(amount)}
              onChange={(e) => setAmount(parseEther(e.target.value))}
              min={formatEther(campaign.minInvestment)}
              max={formatEther(campaign.maxInvestment)}
            />
          </div>
          
          <PricingBreakdown amount={amount} />
          
          <Alert>
            <AlertDescription>
              Lock-up period: 6 months
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <TransactionButton onClick={handleInvest} isLoading={isLoading}>
            Confirm Investment
          </TransactionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Smart Contract Payment Creation:**
```solidity
// contracts/PaymentProtocol.sol
function createPayment(
    PaymentType _type,
    address _payee,
    uint256 _amount,
    address _token,
    bytes32 _referenceId,
    string memory _metadata
) external payable returns (uint256 paymentId) {
    paymentId = nextPaymentId++;
    
    payments[paymentId] = Payment({
        paymentType: _type,
        state: PaymentState.Pending,
        payer: msg.sender,
        payee: _payee,
        amount: _amount,
        // ... other fields
    });
    
    emit PaymentCreated(paymentId, _type, msg.sender, _payee, _amount);
}
```

**Frontend Event Handling:**
```typescript
// hooks/usePaymentEvents.ts
useContractEvent({
  address: CONTRACTS.PaymentProtocol,
  abi: PaymentProtocolABI,
  eventName: 'PaymentCreated',
  listener: (logs) => {
    const { paymentId, payer } = logs[0].args;
    
    if (payer === userAddress) {
      // Show payment created notification
      addNotification({
        type: 'success',
        title: 'Payment Created',
        message: `Payment #${paymentId} created successfully`,
      });
      
      // Refresh payment list
      queryClient.invalidateQueries(['payments', userAddress]);
    }
  },
});
```

---

### Flow 2: Renter Booking & Rental

#### Step 1: Search Vehicles (Frontend Only)

**Frontend Search Component:**
```typescript
// components/renter/VehicleSearch.tsx
export function VehicleSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    startDate: null,
    endDate: null,
    vehicleType: 'all',
    priceRange: [0, 200],
  });

  const { data: vehicles, isLoading } = useSearchVehicles(filters);

  return (
    <div className="space-y-6">
      <SearchFilters filters={filters} onChange={setFilters} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles?.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  );
}
```

**Data Fetching Hook:**
```typescript
// hooks/useSearchVehicles.ts
export function useSearchVehicles(filters: SearchFilters) {
  return useQuery({
    queryKey: ['vehicles', 'search', filters],
    queryFn: async () => {
      // Read all vehicles from VehicleRegistry
      const totalVehicles = await readContract({
        address: CONTRACTS.VehicleRegistry,
        abi: VehicleRegistryABI,
        functionName: 'nextVehicleId',
      });

      // Fetch vehicle details
      const vehicles = await Promise.all(
        Array.from({ length: Number(totalVehicles) }, (_, i) =>
          readContract({
            address: CONTRACTS.VehicleRegistry,
            abi: VehicleRegistryABI,
            functionName: 'getVehicle',
            args: [BigInt(i + 1)],
          })
        )
      );

      // Filter based on search criteria
      return vehicles.filter((v) => {
        if (filters.vehicleType !== 'all' && v.metadata.type !== filters.vehicleType) {
          return false;
        }
        if (v.status !== VehicleStatus.Available) {
          return false;
        }
        // ... more filters
        return true;
      });
    },
  });
}
```

#### Step 2: Request Booking (Frontend → Blockchain → CRE)

**Frontend Booking Component:**
```typescript
// components/renter/BookingRequest.tsx
export function BookingRequest({ vehicle }: Props) {
  const { requestBooking, isLoading } = useRequestBooking();
  const { verify } = useRenterVerification();
  const [bookingData, setBookingData] = useState<BookingData>({});

  const handleBook = async () => {
    // Check if renter is verified
    const identity = await getIdentityAddress(userAddress);
    const hasDriverLicense = await checkClaim(identity, CLAIM_DRIVER_LICENSE);
    
    if (!hasDriverLicense) {
      // Trigger verification flow
      await verify({
        userId: userAddress,
        personalInfo: {...},
        driverLicense: {...},
        insuranceInfo: {...},
      });
    }

    // Calculate total cost
    const days = differenceInDays(bookingData.endDate, bookingData.startDate);
    const totalCost = BigInt(days) * vehicle.ratePerDay;
    const deposit = vehicle.securityDeposit;

    // Create booking
    await requestBooking({
      vehicleId: vehicle.tokenId,
      startTime: Math.floor(bookingData.startDate.getTime() / 1000),
      endTime: Math.floor(bookingData.endDate.getTime() / 1000),
      ratePerDay: vehicle.ratePerDay,
      securityDeposit: deposit,
      totalCost: totalCost + deposit,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book {vehicle.make} {vehicle.model}</CardTitle>
      </CardHeader>
      <CardContent>
        <DateRangePicker
          value={[bookingData.startDate, bookingData.endDate]}
          onChange={([start, end]) => setBookingData({ startDate: start, endDate: end })}
        />
        
        <Separator className="my-4" />
        
        <PricingBreakdown
          dailyRate={vehicle.ratePerDay}
          days={calculateDays(bookingData)}
          deposit={vehicle.securityDeposit}
        />
      </CardContent>
      <CardFooter>
        <TransactionButton onClick={handleBook} isLoading={isLoading}>
          Request Booking
        </TransactionButton>
      </CardFooter>
    </Card>
  );
}
```

**CRE Renter Verification:**
```javascript
// chainlink-cre/identity-verification-service.js
async function verifyRenterIdentity(request) {
  const results = { approved: false, claims: [], errors: [] };

  // Verify driver license via DMV API
  const licenseResult = await callAPI(API_ENDPOINTS.government.dmv, {
    method: 'POST',
    body: JSON.stringify({
      licenseNumber: request.driverLicense.number,
      state: request.driverLicense.state,
      dateOfBirth: request.driverLicense.dateOfBirth,
    }),
  });

  if (licenseResult.status !== 'valid') {
    results.errors.push('Invalid driver license');
    return await generateAttestation(results);
  }

  // Check age requirement
  if (calculateAge(licenseResult.date_of_birth) < 21) {
    results.errors.push('Must be 21 or older');
    return await generateAttestation(results);
  }

  results.claims.push({
    topic: 4, // CLAIM_DRIVER_LICENSE
    data: { state: licenseResult.state, class: licenseResult.license_class },
    expiresAt: new Date(licenseResult.expiry_date).getTime(),
  });

  // Verify insurance
  const insuranceResult = await callAPI(API_ENDPOINTS.insurance.verifier, {
    method: 'POST',
    body: JSON.stringify({
      policyNumber: request.insuranceInfo.policyNumber,
      carrierName: request.insuranceInfo.carrier,
    }),
  });

  if (!insuranceResult.active) {
    results.errors.push('Insurance not active');
    return await generateAttestation(results);
  }

  results.claims.push({
    topic: 5, // CLAIM_INSURANCE
    data: { carrier: insuranceResult.carrier },
    expiresAt: new Date(insuranceResult.expiry_date).getTime(),
  });

  // Final approval
  results.approved = results.errors.length === 0 && results.claims.length >= 2;
  
  return await generateAttestation(results);
}
```

**Smart Contract Booking Creation:**
```solidity
// contracts/RentalManagement.sol
function requestBooking(
    uint256 _vehicleId,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _ratePerDay,
    uint256 _securityDeposit
) external payable returns (uint256) {
    require(_verifyRenterIdentity(msg.sender), "Identity not verified");
    require(vehicle.status == VehicleStatus.Available, "Not available");

    uint256 bookingId = nextBookingId++;
    uint256 days = (_endTime - _startTime) / 1 days + 1;
    uint256 totalCost = days * _ratePerDay;

    // Create payment escrow
    bytes32 referenceId = keccak256(abi.encodePacked("booking", bookingId));
    uint256 paymentId = paymentProtocol.createPayment{value: msg.value}(
        PaymentType.Rental,
        vehicle.owner,
        totalCost + _securityDeposit,
        address(0),
        referenceId,
        ""
    );

    bookings[bookingId] = Booking({
        vehicleId: _vehicleId,
        renter: msg.sender,
        startTime: _startTime,
        endTime: _endTime,
        status: BookingStatus.Requested,
        paymentId: paymentId,
        // ... other fields
    });

    emit BookingRequested(bookingId, _vehicleId, msg.sender);
    return bookingId;
}
```

#### Step 3: Booking Approval (Automated via CRE)

**CRE Compliance Check (triggered by event):**
```javascript
// chainlink-cre/compliance-automation.js
async function handleBookingRequest(event) {
  const { bookingId, vehicleId, renter } = event.args;

  // Get renter's OnchainID
  const identityAddress = await getIdentityAddress(renter);

  // Verify all required claims exist and are valid
  const hasKYC = await checkClaim(identityAddress, CLAIM_KYC);
  const hasLicense = await checkClaim(identityAddress, CLAIM_DRIVER_LICENSE);
  const hasInsurance = await checkClaim(identityAddress, CLAIM_INSURANCE);

  if (hasKYC && hasLicense && hasInsurance) {
    // Auto-approve booking
    await writeContract({
      address: CONTRACTS.RentalBooking,
      abi: RentalBookingABI,
      functionName: 'approveBooking',
      args: [bookingId],
    });
  } else {
    // Reject booking
    toast.error('Verification required');
  }
}
```

**Frontend Notification:**
```typescript
// hooks/useBookingEvents.ts
useContractEvent({
  address: CONTRACTS.RentalBooking,
  abi: RentalBookingABI,
  eventName: 'BookingApproved',
  listener: (logs) => {
    const { bookingId } = logs[0].args;
    
    addNotification({
      type: 'success',
      title: 'Booking Approved',
      message: `Your booking #${bookingId} has been approved!`,
    });
    
    // Navigate to booking details
    router.push(`/renter/bookings/${bookingId}`);
  },
});
```

#### Step 4: Active Rental Monitoring (CRE Background Service)

**CRE Telematics Monitoring:**
```javascript
// chainlink-cre/rental-monitoring.js
async function monitorActiveRentals() {
  // Get all active bookings
  const activeBookings = await getActiveBookings();

  for (const booking of activeBookings) {
    // Get vehicle telemetry
    const telemetry = await telematicsService.getVehicleTelemetry({
      vehicleId: booking.vehicleId,
      vin: booking.vehicle.vin,
      telematicsProvider: 'geotab',
      deviceId: booking.vehicle.deviceId,
    });

    // Check for violations
    const alerts = [];

    // Geofence check
    if (!isWithinGeofence(telemetry.location, booking.geofence)) {
      alerts.push({
        type: 'GEOFENCE_VIOLATION',
        severity: 'HIGH',
        message: 'Vehicle outside authorized area',
      });

      // Notify rentor and renter
      await sendNotification(booking.rentor, 'Vehicle left authorized area');
      await sendNotification(booking.renter, 'Please return to authorized area');
    }

    // Speed check
    if (telemetry.speed > 120) {
      alerts.push({
        type: 'SPEED_VIOLATION',
        severity: 'MEDIUM',
        message: 'Excessive speed detected',
      });
    }

    // Update on-chain if significant violations
    if (alerts.some(a => a.severity === 'HIGH')) {
      await recordViolation(booking.id, alerts);
    }
  }
}

// Run every 30 seconds
setInterval(monitorActiveRentals, 30000);
```

**Frontend Live Tracking:**
```typescript
// components/renter/ActiveRental.tsx
export function ActiveRental({ bookingId }: Props) {
  const { data: telemetry } = useQuery({
    queryKey: ['telemetry', bookingId],
    queryFn: () => telematicsService.getTelemetry(bookingId),
    refetchInterval: 30000, // 30 seconds
  });

  const { data: booking } = useBooking(bookingId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Rental</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Map */}
        <div className="h-64 rounded-lg overflow-hidden">
          <Map
            center={[telemetry.location.latitude, telemetry.location.longitude]}
            zoom={15}
          >
            <Marker position={[telemetry.location.latitude, telemetry.location.longitude]} />
            {booking.geofence && (
              <Circle
                center={[booking.geofence.latitude, booking.geofence.longitude]}
                radius={booking.geofence.radius}
              />
            )}
          </Map>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Speed" value={`${telemetry.speed} km/h`} />
          <Stat label="Mileage" value={`${telemetry.odometer} km`} />
          <Stat label="Fuel" value={`${telemetry.fuelLevel}%`} />
        </div>

        {/* Time Remaining */}
        <Progress
          value={calculateProgress(booking.startTime, booking.endTime)}
          className="h-2"
        />
        <p className="text-sm text-muted-foreground text-center">
          {formatTimeRemaining(booking.endTime)}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => extendRental(bookingId)}>
            Extend Rental
          </Button>
          <Button onClick={() => initiateReturn(bookingId)}>
            End Rental
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Step 5: Return & Damage Assessment (Frontend → CRE → Blockchain)

**Frontend Return Flow:**
```typescript
// components/renter/ReturnProcess.tsx
export function ReturnProcess({ bookingId }: Props) {
  const [photos, setPhotos] = useState<File[]>([]);
  const { initiateReturn } = useInitiateReturn();
  const { completeReturn } = useCompleteReturn();

  const handleInitiateReturn = async () => {
    await initiateReturn(bookingId);
    toast.success('Return initiated. Please take photos.');
  };

  const handleUploadPhotos = async () => {
    // Upload to IPFS
    const photoHashes = await Promise.all(
      photos.map(photo => uploadToIPFS(photo))
    );

    // Trigger CRE damage assessment
    const assessment = await damageAssessmentService.assess({
      bookingId,
      vehicleId: booking.vehicleId,
      preRentalPhotos: booking.preCondition.photoHashes,
      postRentalPhotos: photoHashes,
    });

    // Complete return with damage charges
    await completeReturn({
      bookingId,
      postCondition: {
        timestamp: Date.now(),
        mileage: currentMileage,
        fuelLevel: currentFuelLevel,
        photoHashes,
        damageNotes: assessment.damages.map(d => d.description),
      },
      damageCharges: assessment.totalEstimatedCost,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Return Vehicle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Upload Photos (All Angles)</Label>
          <FileUpload
            multiple
            accept="image/*"
            onChange={setPhotos}
            maxFiles={12}
          />
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={URL.createObjectURL(photo)}
                className="rounded-lg"
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={handleInitiateReturn}>
          Start Return
        </Button>
        <Button
          onClick={handleUploadPhotos}
          disabled={photos.length < 6}
        >
          Complete Return
        </Button>
      </CardFooter>
    </Card>
  );
}
```

**CRE Damage Assessment:**
```javascript
// chainlink-cre/damage-assessment-service.js
async function assessVehicleDamage(request) {
  const { preRentalPhotos, postRentalPhotos } = request;

  // Use computer vision API to detect damage
  const damages = [];

  for (let i = 0; i < postRentalPhotos.length; i++) {
    const prePhoto = await fetchFromIPFS(preRentalPhotos[i]);
    const postPhoto = await fetchFromIPFS(postRentalPhotos[i]);

    // Call image comparison API (e.g., AWS Rekognition)
    const comparison = await compareImages(prePhoto, postPhoto);

    if (comparison.differencePercentage > 5) {
      // Detect damage type
      const damageType = await classifyDamage(comparison.differences);

      damages.push({
        type: damageType, // scratch, dent, crack, etc.
        severity: calculateSeverity(comparison.differencePercentage),
        location: detectLocation(comparison.differences),
        photoHash: postRentalPhotos[i],
        description: generateDescription(damageType, comparison),
      });
    }
  }

  // Estimate repair costs
  const costs = await Promise.all(
    damages.map(damage => estimateRepairCost(damage))
  );

  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

  return {
    damages: damages.map((d, i) => ({ ...d, estimatedCost: costs[i] })),
    totalEstimatedCost: totalCost,
    confidence: 95,
    requiresHumanReview: damages.some(d => d.severity > 7),
  };
}
```

**Smart Contract Return Completion:**
```solidity
// contracts/RentalManagement.sol
function completeReturn(
    uint256 _bookingId,
    ConditionReport memory _postCondition,
    uint256 _damageCharges
) external onlyRole(OPERATOR_ROLE) {
    Booking storage booking = bookings[_bookingId];
    require(booking.status == BookingStatus.PendingReturn, "Not pending");

    booking.status = BookingStatus.Completed;
    booking.postCondition = _postCondition;
    booking.damageCharges = _damageCharges;

    // Calculate final charges
    uint256 overdueMinutes = 0;
    if (block.timestamp > booking.endTime) {
        overdueMinutes = (block.timestamp - booking.endTime) / 60;
    }
    uint256 overdueCharges = overdueMinutes * (booking.ratePerDay / 1440);
    uint256 totalCharges = booking.totalCost + overdueCharges + _damageCharges;

    // Release payment to vehicle owner
    paymentProtocol.releasePartialPayment(
        booking.paymentId,
        totalCharges,
        vehicleRegistry.ownerOf(booking.vehicleId)
    );

    // Refund remaining deposit
    uint256 refund = booking.securityDeposit - (totalCharges - booking.totalCost);
    if (refund > 0) {
        paymentProtocol.requestRefund(
            booking.paymentId,
            RefundType.Automatic,
            refund,
            "Deposit refund"
        );
    }

    emit BookingCompleted(_bookingId, totalCharges);
}
```

**Frontend Completion Notification:**
```typescript
// hooks/useBookingEvents.ts
useContractEvent({
  address: CONTRACTS.RentalBooking,
  abi: RentalBookingABI,
  eventName: 'BookingCompleted',
  listener: (logs) => {
    const { bookingId, totalCost } = logs[0].args;

    addNotification({
      type: 'success',
      title: 'Rental Completed',
      message: `Total charges: ${formatEther(totalCost)} ETH`,
    });

    // Show receipt
    router.push(`/renter/bookings/${bookingId}/receipt`);
  },
});
```

---

### Flow 3: Revenue Distribution (Automated)

**Chainlink Automation Trigger:**
```javascript
// chainlink-automation/revenue-distribution.js
async function checkUpkeep() {
  const lastDistribution = await getLastDistribution();
  const timeSinceLastDistribution = Date.now() - lastDistribution;

  // Trigger weekly
  return timeSinceLastDistribution > 7 * 24 * 60 * 60 * 1000;
}

async function performUpkeep() {
  // Get all vehicles with accumulated revenue
  const vehicles = await getVehiclesWithRevenue();

  for (const vehicle of vehicles) {
    // Calculate revenue distribution
    const revenue = await vehicleRegistry.totalRevenue(vehicle.id);

    if (revenue > 0) {
      // Trigger distribution
      await revenueDistributor.distributeRevenue(vehicle.assetToken);
    }
  }
}
```

**Smart Contract Distribution:**
```solidity
// contracts/RevenueDistributor.sol
function distributeRevenue(address vehicleToken) external {
    uint256 revenue = accumulatedRevenue[vehicleToken];
    require(revenue > 0, "No revenue");

    // Apply waterfall
    uint256 platformFee = (revenue * 15) / 100;
    uint256 maintenance = (revenue * 10) / 100;
    uint256 insurance = (revenue * 5) / 100;
    uint256 operating = (revenue * 10) / 100;
    uint256 distributable = revenue - platformFee - maintenance - insurance - operating;

    // Transfer fees
    payable(feeRecipient).transfer(platformFee);
    maintenanceReserve[vehicleToken] += maintenance;
    insurancePool.transfer(insurance);
    operatingPool.transfer(operating);

    // Get RevenueToken holders
    address revenueToken = revenueTokens[vehicleToken];
    address[] memory holders = getTokenHolders(revenueToken);
    uint256 totalSupply = IERC20(revenueToken).totalSupply();

    // Distribute proportionally
    for (uint i = 0; i < holders.length; i++) {
        uint256 balance = IERC20(revenueToken).balanceOf(holders[i]);
        uint256 amount = (distributable * balance) / totalSupply;
        payable(holders[i]).transfer(amount);
        emit RevenueDistributed(holders[i], amount);
    }

    accumulatedRevenue[vehicleToken] = 0;
}
```

**Frontend Revenue Tracking:**
```typescript
// components/investor/RevenueTracking.tsx
export function RevenueTracking() {
  const { address } = useAccount();
  const { data: portfolio } = usePortfolio(address);

  useContractEvent({
    address: CONTRACTS.RevenueDistributor,
    abi: RevenueDistributorABI,
    eventName: 'RevenueDistributed',
    listener: (logs) => {
      logs.forEach((log) => {
        const { recipient, amount } = log.args;
        
        if (recipient === address) {
          addNotification({
            type: 'success',
            title: 'Revenue Received',
            message: `You received ${formatEther(amount)} ETH`,
          });

          // Confetti animation
          confetti();

          // Refresh balance
          queryClient.invalidateQueries(['balance', address]);
          queryClient.invalidateQueries(['portfolio', address]);
        }
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue History</CardTitle>
      </CardHeader>
      <CardContent>
        <RevenueChart data={portfolio.revenueHistory} />
        
        <div className="mt-4 space-y-2">
          {portfolio.recentPayments.map((payment) => (
            <div key={payment.id} className="flex justify-between">
              <span>{format(payment.date, 'MMM dd, yyyy')}</span>
              <span className="font-mono text-green-600">
                +{formatEther(payment.amount)} ETH
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Data Synchronization

### Real-time Updates

**WebSocket Connection (for notifications):**
```typescript
// lib/websocket.ts
export function useWebSocket() {
  const { address } = useAccount();
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!address) return;

    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'subscribe',
        address,
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'booking_approved':
          addNotification({
            type: 'success',
            title: 'Booking Approved',
            message: data.message,
          });
          break;
        case 'revenue_distributed':
          confetti();
          queryClient.invalidateQueries(['balance']);
          break;
        // ... other event types
      }
    };

    setWs(socket);

    return () => socket.close();
  }, [address]);

  return ws;
}
```

### Cache Management

**Query Invalidation Strategy:**
```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
    },
  },
});

// Invalidate on wallet change
export function useWalletSync() {
  const { address } = useAccount();

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [address]);
}

// Invalidate on block
export function useBlockSync() {
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    // Invalidate specific queries that depend on block state
    queryClient.invalidateQueries(['balance']);
    queryClient.invalidateQueries(['bookings', 'active']);
  }, [blockNumber]);
}
```

---

## Error Handling

### Contract Error Handling

```typescript
// lib/errors.ts
export function handleContractError(error: Error) {
  if (error.message.includes('user rejected')) {
    toast.error('Transaction cancelled');
    return;
  }

  if (error.message.includes('insufficient funds')) {
    toast.error('Insufficient funds for transaction');
    return;
  }

  if (error.message.includes('Identity not verified')) {
    toast.error('Please complete identity verification first');
    router.push('/verify');
    return;
  }

  // Generic error
  console.error(error);
  toast.error('Transaction failed. Please try again.');
}
```

### CRE Error Handling

```typescript
// lib/cre/error-handling.ts
export async function callCREService<T>(
  serviceFn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await serviceFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  
  throw new Error('CRE service failed after retries');
}
```

---

## Summary

This integration guide demonstrates:

✅ **Complete data flow** from frontend → blockchain → CRE → external APIs
✅ **Real-time synchronization** via event listeners and WebSockets
✅ **Automated processes** via Chainlink Automation
✅ **Error handling** at all layers
✅ **State management** with React Query and Zustand
✅ **Type safety** throughout the stack with TypeScript

The frontend and backend are tightly integrated through:
1. **Smart contract events** for state changes
2. **CRE services** for off-chain computation
3. **Real-time updates** for user experience
4. **Automated workflows** for operational efficiency
