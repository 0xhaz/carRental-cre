# Rental Car Tokenization Platform - Frontend Architecture

## Overview

The frontend provides three distinct user experiences:
1. **Investor Portal** - For managing investments and tracking returns
2. **Rentor Dashboard** - For vehicle owners to manage fleet and fundraising
3. **Renter App** - For booking and managing rentals

All interfaces interact with the same smart contracts and Chainlink CRE services.

---

## Technology Stack

### Core Framework
- **React 18+** with TypeScript
- **Next.js 14** for SSR and routing
- **TailwindCSS** for styling
- **shadcn/ui** for component library

### Web3 Integration
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript interface for Ethereum
- **RainbowKit** - Wallet connection
- **Web3Modal** - Multi-wallet support

### State Management
- **Zustand** - Global state
- **TanStack Query (React Query)** - Server state & caching
- **Jotai** - Atomic state management

### Data Visualization
- **Recharts** - Charts and graphs
- **Tremor** - Financial dashboards
- **React Flow** - Transaction flows

### Additional Tools
- **Framer Motion** - Animations
- **React Hook Form** + **Zod** - Form validation
- **date-fns** - Date manipulation
- **Ethers.js v6** - Contract interactions (fallback)

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js app router
│   │   ├── (investor)/              # Investor portal routes
│   │   │   ├── dashboard/
│   │   │   ├── portfolio/
│   │   │   ├── marketplace/
│   │   │   └── investments/
│   │   ├── (rentor)/                # Rentor dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── vehicles/
│   │   │   ├── fundraising/
│   │   │   └── analytics/
│   │   ├── (renter)/                # Renter app routes
│   │   │   ├── browse/
│   │   │   ├── booking/
│   │   │   └── history/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/                   # Reusable components
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── web3/                    # Web3-specific components
│   │   │   ├── ConnectWallet.tsx
│   │   │   ├── NetworkSelector.tsx
│   │   │   ├── TransactionButton.tsx
│   │   │   └── TokenBalance.tsx
│   │   ├── investor/                # Investor-specific
│   │   │   ├── PortfolioCard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── InvestmentModal.tsx
│   │   │   └── TokenTransfer.tsx
│   │   ├── rentor/                  # Rentor-specific
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── FundraisingCampaign.tsx
│   │   │   ├── RevenueDistribution.tsx
│   │   │   └── InvestorList.tsx
│   │   ├── renter/                  # Renter-specific
│   │   │   ├── VehicleSearch.tsx
│   │   │   ├── BookingFlow.tsx
│   │   │   ├── ConditionReport.tsx
│   │   │   └── TripHistory.tsx
│   │   └── shared/                  # Shared components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       ├── Sidebar.tsx
│   │       └── NotificationBell.tsx
│   │
│   ├── lib/                         # Core libraries
│   │   ├── contracts/               # Contract interactions
│   │   │   ├── identity.ts
│   │   │   ├── tokens.ts
│   │   │   ├── payment.ts
│   │   │   ├── vehicle.ts
│   │   │   └── rental.ts
│   │   ├── cre/                     # Chainlink CRE client
│   │   │   ├── identity-service.ts
│   │   │   ├── telematics-service.ts
│   │   │   └── types.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── calculations.ts
│   │   └── constants.ts
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useIdentity.ts
│   │   ├── useInvestorProfile.ts
│   │   ├── useVehicleRegistry.ts
│   │   ├── useBooking.ts
│   │   ├── usePayment.ts
│   │   └── useNotifications.ts
│   │
│   ├── store/                       # Global state
│   │   ├── userStore.ts
│   │   ├── walletStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── types/                       # TypeScript types
│   │   ├── contracts.ts
│   │   ├── investor.ts
│   │   ├── rentor.ts
│   │   ├── renter.ts
│   │   └── vehicle.ts
│   │
│   └── styles/                      # Global styles
│       └── globals.css
│
├── public/                          # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── abis/                            # Contract ABIs
│   ├── OnchainID.json
│   ├── ERC3643Token.json
│   ├── PaymentProtocol.json
│   ├── VehicleRegistry.json
│   └── RentalBooking.json
│
├── config/                          # Configuration
│   ├── contracts.ts                 # Contract addresses
│   ├── networks.ts                  # Network configs
│   └── constants.ts
│
├── .env.local                       # Environment variables
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Core Features by User Type

### 1. Investor Portal

#### Dashboard (`/investor/dashboard`)
**Components:**
- Portfolio Overview Card
- Revenue Chart (monthly earnings)
- Active Investments List
- Recent Transactions
- Performance Metrics

**Key Metrics:**
```typescript
interface InvestorMetrics {
  totalInvested: bigint;
  totalRevenueEarned: bigint;
  averageROI: number;
  portfolioValue: bigint;
  activeVehicles: number;
  pendingReturns: bigint;
}
```

**Data Sources:**
- ERC3643Token (RevenueToken balances)
- PaymentProtocol (revenue distributions)
- VehicleRegistry (vehicle performance)

#### Marketplace (`/investor/marketplace`)
**Features:**
- Browse available investment opportunities
- Filter by vehicle type, location, expected ROI
- View detailed vehicle information
- Check compliance requirements
- Initiate investment

**Investment Flow:**
1. Browse vehicles seeking investment
2. View prospectus (vehicle details, financials, terms)
3. Check eligibility (investor type, accreditation)
4. Complete KYC if not done
5. Review investment terms
6. Approve transaction
7. Funds escrowed
8. Receive RevenueTokens after milestones

**Component Example:**
```typescript
<InvestmentCard
  vehicleId={vehicle.tokenId}
  make={vehicle.metadata.make}
  model={vehicle.metadata.model}
  year={vehicle.metadata.year}
  targetRaise={campaign.targetAmount}
  currentRaise={campaign.currentAmount}
  minInvestment={campaign.minInvestment}
  expectedROI={campaign.projectedROI}
  onInvest={handleInvest}
/>
```

#### Portfolio (`/investor/portfolio`)
**Features:**
- List of all investments
- Individual vehicle performance
- Revenue history per vehicle
- Token balances (Asset + Revenue)
- Transfer tokens (compliant)
- Tax documents (1099 generation)

**Views:**
- Grid view (cards)
- Table view (detailed)
- Chart view (performance)

#### Investments (`/investor/investments/[id]`)
**Detailed View:**
- Vehicle information
- Investment terms
- Revenue history chart
- Upcoming distributions
- Token details (supply, holders)
- Transfer history
- Download reports

### 2. Rentor Dashboard

#### Dashboard (`/rentor/dashboard`)
**Overview:**
- Total fleet value
- Active fundraising campaigns
- Total capital raised
- Revenue this month
- Utilization rate
- Pending approvals

**Quick Actions:**
- Add new vehicle
- Create fundraising campaign
- Distribute revenue
- View investor list

#### Vehicles (`/rentor/vehicles`)
**Fleet Management:**
- List all vehicles
- Add new vehicle
- Edit vehicle details
- Set pricing
- View rental history
- Maintenance schedule
- Incident reports

**Vehicle Creation Flow:**
1. Enter vehicle details (VIN, make, model, year)
2. Upload photos
3. Set rental rate
4. Deploy AssetToken & RevenueToken
5. Mint Vehicle NFT
6. Create fundraising campaign (optional)
7. List for rental

**Component:**
```typescript
<VehicleManagement
  vehicles={fleet}
  onAddVehicle={handleAddVehicle}
  onEditVehicle={handleEditVehicle}
  onMintNFT={handleMintNFT}
  onCreateTokens={handleCreateTokens}
/>
```

#### Fundraising (`/rentor/fundraising`)
**Campaign Management:**
- Active campaigns
- Create new campaign
- Set investment terms
- Define milestones
- Investor communications
- Fund releases

**Campaign Setup:**
- Target amount
- Min/max investment
- Investor type restrictions
- Lock-up period
- Revenue share percentage
- Campaign duration
- Milestones (vehicle purchase, registration, etc.)

**Campaign Card:**
```typescript
<FundraisingCampaign
  vehicleId={vehicle.tokenId}
  targetAmount={campaign.target}
  currentAmount={campaign.raised}
  investors={campaign.investorCount}
  daysRemaining={campaign.daysLeft}
  status={campaign.status}
  onWithdraw={handleWithdraw}
/>
```

#### Analytics (`/rentor/analytics`)
**Reports & Insights:**
- Revenue analytics (daily/weekly/monthly)
- Utilization rates
- Top-performing vehicles
- Investor demographics
- Booking patterns
- Maintenance costs
- Profitability per vehicle

**Charts:**
- Revenue trend (line chart)
- Utilization heatmap
- Investor distribution (pie chart)
- Booking frequency (bar chart)

### 3. Renter App

#### Browse (`/renter/browse`)
**Vehicle Discovery:**
- Search & filter vehicles
- Map view (location-based)
- List view with photos
- Sort by price, rating, availability
- Real-time availability
- Instant booking

**Search Filters:**
- Location (city, radius)
- Dates (pickup, return)
- Vehicle type (sedan, SUV, EV)
- Price range
- Features (GPS, bluetooth, etc.)
- Transmission (auto/manual)

**Search Component:**
```typescript
<VehicleSearch
  location={searchParams.location}
  startDate={searchParams.start}
  endDate={searchParams.end}
  filters={filters}
  onSearch={handleSearch}
  results={vehicles}
/>
```

#### Booking (`/renter/booking/[vehicleId]`)
**Booking Flow:**
1. Select dates
2. Review pricing breakdown
3. Complete identity verification (if first time)
4. Review terms & conditions
5. Pay (rental + security deposit)
6. Receive booking confirmation
7. Get pickup instructions

**Pricing Breakdown:**
```typescript
interface PricingBreakdown {
  dailyRate: bigint;
  numberOfDays: number;
  subtotal: bigint;
  platformFee: bigint;
  taxes: bigint;
  securityDeposit: bigint;
  total: bigint;
}
```

**Identity Verification:**
- Upload driver license
- Upload insurance card
- Provide personal info
- Wait for CRE verification
- Receive claims on OnchainID
- Proceed with booking

#### Active Rental (`/renter/active`)
**During Rental:**
- Booking details
- Vehicle location (live)
- Extend rental
- Report issue
- Emergency contact
- End rental

**Live Updates:**
- Real-time vehicle tracking
- Mileage counter
- Fuel level
- Time remaining
- Overdue alerts

#### History (`/renter/history`)
**Past Rentals:**
- Completed trips
- Receipts & invoices
- Photos (pre/post condition)
- Reviews submitted
- Dispute status
- Download tax documents

---

## Smart Contract Integration

### Contract Interaction Patterns

#### 1. Reading Data (Hooks Pattern)

```typescript
// hooks/useVehicleRegistry.ts
import { useContractRead } from 'wagmi';
import VehicleRegistryABI from '@/abis/VehicleRegistry.json';
import { CONTRACTS } from '@/config/contracts';

export function useVehicle(vehicleId: bigint) {
  const { data, isLoading, error } = useContractRead({
    address: CONTRACTS.VehicleRegistry,
    abi: VehicleRegistryABI,
    functionName: 'getVehicle',
    args: [vehicleId],
    watch: true, // Subscribe to updates
  });

  return {
    vehicle: data,
    isLoading,
    error,
  };
}
```

#### 2. Writing Data (Transaction Pattern)

```typescript
// hooks/useBooking.ts
import { useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import RentalBookingABI from '@/abis/RentalBooking.json';
import { CONTRACTS } from '@/config/contracts';

export function useRequestBooking() {
  const { config } = usePrepareContractWrite({
    address: CONTRACTS.RentalBooking,
    abi: RentalBookingABI,
    functionName: 'requestBooking',
  });

  const { data, write, isLoading: isWriteLoading } = useContractWrite(config);

  const { isLoading: isTxLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const requestBooking = async (params: BookingParams) => {
    if (!write) throw new Error('Write function not ready');
    
    write({
      args: [
        params.vehicleId,
        params.startTime,
        params.endTime,
        params.ratePerDay,
        params.securityDeposit,
      ],
      value: params.totalCost + params.securityDeposit,
    });
  };

  return {
    requestBooking,
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    txHash: data?.hash,
  };
}
```

#### 3. Multi-Step Transactions

```typescript
// lib/contracts/investment.ts
import { writeContract, waitForTransaction } from '@wagmi/core';

export async function investInVehicle(params: InvestmentParams) {
  // Step 1: Approve token spending
  const approveTx = await writeContract({
    address: params.tokenAddress,
    abi: ERC20ABI,
    functionName: 'approve',
    args: [CONTRACTS.PaymentProtocol, params.amount],
  });
  
  await waitForTransaction({ hash: approveTx.hash });

  // Step 2: Create payment
  const paymentTx = await writeContract({
    address: CONTRACTS.PaymentProtocol,
    abi: PaymentProtocolABI,
    functionName: 'createPayment',
    args: [
      0, // PaymentType.Investment
      params.rentor,
      params.amount,
      params.tokenAddress,
      params.referenceId,
      params.metadata,
    ],
  });

  await waitForTransaction({ hash: paymentTx.hash });

  // Step 3: Escrow payment
  const escrowTx = await writeContract({
    address: CONTRACTS.PaymentProtocol,
    abi: PaymentProtocolABI,
    functionName: 'escrowPayment',
    args: [paymentTx.hash], // Payment ID from event
  });

  return await waitForTransaction({ hash: escrowTx.hash });
}
```

### Event Listening

```typescript
// hooks/usePaymentEvents.ts
import { useContractEvent } from 'wagmi';
import PaymentProtocolABI from '@/abis/PaymentProtocol.json';
import { CONTRACTS } from '@/config/contracts';

export function usePaymentEvents(userAddress: `0x${string}`) {
  useContractEvent({
    address: CONTRACTS.PaymentProtocol,
    abi: PaymentProtocolABI,
    eventName: 'PaymentReleased',
    listener: (logs) => {
      logs.forEach((log) => {
        const { paymentId, amount, recipient } = log.args;
        
        if (recipient === userAddress) {
          // Show notification
          toast.success(`Payment received: ${formatEther(amount)} ETH`);
          
          // Refresh balance
          queryClient.invalidateQueries(['balance', userAddress]);
        }
      });
    },
  });
}
```

---

## Chainlink CRE Integration

### Client Service Pattern

```typescript
// lib/cre/identity-service.ts
export class IdentityVerificationClient {
  private serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  async verifyInvestor(data: InvestorVerificationData): Promise<Attestation> {
    const response = await fetch(`${this.serviceUrl}/verify-investor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Verification failed');
    }

    return await response.json();
  }

  async verifyRenter(data: RenterVerificationData): Promise<Attestation> {
    const response = await fetch(`${this.serviceUrl}/verify-renter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Verification failed');
    }

    return await response.json();
  }
}

export const identityService = new IdentityVerificationClient(
  process.env.NEXT_PUBLIC_CRE_IDENTITY_URL!
);
```

### React Hook for CRE

```typescript
// hooks/useIdentityVerification.ts
import { useMutation } from '@tanstack/react-query';
import { identityService } from '@/lib/cre/identity-service';
import { writeContract } from '@wagmi/core';
import OnchainIDABI from '@/abis/OnchainID.json';

export function useInvestorVerification() {
  const { mutateAsync: verify, isLoading } = useMutation({
    mutationFn: async (data: InvestorVerificationData) => {
      // Call CRE service
      const attestation = await identityService.verifyInvestor(data);
      
      // Add claims to OnchainID
      const identityAddress = await getIdentityAddress(data.userAddress);
      
      for (const claim of attestation.claims) {
        await writeContract({
          address: identityAddress,
          abi: OnchainIDABI,
          functionName: 'addClaim',
          args: [
            claim.topic,
            claim.scheme,
            attestation.issuer,
            claim.signature,
            claim.data,
            claim.uri,
            claim.expiresAt,
          ],
        });
      }
      
      return attestation;
    },
  });

  return { verify, isLoading };
}
```

### Telematics Integration

```typescript
// hooks/useVehicleTelemetry.ts
import { useQuery } from '@tanstack/react-query';
import { telematicsService } from '@/lib/cre/telematics-service';

export function useVehicleTelemetry(vehicleId: bigint, enabled: boolean = true) {
  return useQuery({
    queryKey: ['telemetry', vehicleId],
    queryFn: () => telematicsService.getTelemetry({
      vehicleId,
      vin: vehicle.metadata.vin,
      telematicsProvider: vehicle.telematicsProvider,
      deviceId: vehicle.deviceId,
    }),
    refetchInterval: 60000, // Refresh every minute
    enabled,
  });
}

export function useVehicleMonitoring(bookingId: bigint) {
  return useQuery({
    queryKey: ['monitoring', bookingId],
    queryFn: () => telematicsService.monitorVehicle({
      vehicleId: booking.vehicleId,
      bookingId,
      geofence: booking.geofence,
      maxSpeed: booking.maxSpeed,
      expectedReturnTime: booking.endTime,
    }),
    refetchInterval: 30000, // Check every 30 seconds
  });
}
```

---

## User Flow Components

### Investor Onboarding Flow

```typescript
// components/investor/OnboardingFlow.tsx
export function InvestorOnboardingFlow() {
  const [step, setStep] = useState(1);
  const { verify, isLoading } = useInvestorVerification();
  const { createIdentity } = useIdentity();
  const { registerInvestor } = useCompliance();

  const steps = [
    {
      title: 'Create Identity',
      component: <CreateIdentityStep onComplete={() => setStep(2)} />,
    },
    {
      title: 'Complete KYC',
      component: (
        <KYCVerificationStep
          onSubmit={async (data) => {
            await verify(data);
            setStep(3);
          }}
          isLoading={isLoading}
        />
      ),
    },
    {
      title: 'Choose Investor Type',
      component: (
        <InvestorTypeSelection
          onSelect={async (type, maxInvestment) => {
            await registerInvestor({ type, maxInvestment });
            setStep(4);
          }}
        />
      ),
    },
    {
      title: 'Ready to Invest',
      component: <OnboardingComplete />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressBar currentStep={step} totalSteps={steps.length} />
      <div className="mt-8">{steps[step - 1].component}</div>
    </div>
  );
}
```

### Booking Flow

```typescript
// components/renter/BookingFlow.tsx
export function BookingFlow({ vehicleId }: { vehicleId: bigint }) {
  const [bookingData, setBookingData] = useState<BookingData>({
    vehicleId,
    startDate: null,
    endDate: null,
  });
  
  const { vehicle } = useVehicle(vehicleId);
  const { requestBooking, isLoading } = useRequestBooking();
  const { identity } = useIdentity();

  const steps = [
    {
      title: 'Select Dates',
      component: (
        <DateSelection
          vehicleId={vehicleId}
          onSelect={(start, end) => {
            setBookingData({ ...bookingData, startDate: start, endDate: end });
          }}
        />
      ),
    },
    {
      title: 'Review & Pay',
      component: (
        <PricingReview
          vehicle={vehicle}
          bookingData={bookingData}
          onConfirm={async () => {
            await requestBooking({
              vehicleId,
              startTime: bookingData.startDate,
              endTime: bookingData.endDate,
              ratePerDay: vehicle.ratePerDay,
              securityDeposit: vehicle.securityDeposit,
            });
          }}
          isLoading={isLoading}
        />
      ),
    },
    {
      title: 'Confirmation',
      component: <BookingConfirmation bookingData={bookingData} />,
    },
  ];

  // Check if identity verification needed
  if (!identity?.hasValidClaim(CLAIM_DRIVER_LICENSE)) {
    return <RenterVerificationRequired />;
  }

  return <StepWizard steps={steps} />;
}
```

### Vehicle Creation Flow (Rentor)

```typescript
// components/rentor/VehicleCreationFlow.tsx
export function VehicleCreationFlow() {
  const [vehicleData, setVehicleData] = useState<VehicleData>({});
  const [tokenData, setTokenData] = useState<TokenData>({});
  
  const { deployTokens } = useTokenDeployment();
  const { mintVehicle } = useVehicleRegistry();
  const { createCampaign } = useFundraising();

  const handleSubmit = async () => {
    // Step 1: Deploy tokens
    const { assetToken, revenueToken } = await deployTokens({
      name: `${vehicleData.make} ${vehicleData.model}`,
      symbol: `VAT-${vehicleData.vin.slice(-6)}`,
      vin: vehicleData.vin,
    });

    // Step 2: Mint Vehicle NFT
    const vehicleId = await mintVehicle({
      metadata: vehicleData,
      assetToken: assetToken.address,
      revenueToken: revenueToken.address,
    });

    // Step 3: Create fundraising campaign (optional)
    if (tokenData.fundraising) {
      await createCampaign({
        vehicleId,
        targetAmount: tokenData.targetRaise,
        minInvestment: tokenData.minInvestment,
        investorTypes: tokenData.allowedInvestorTypes,
      });
    }

    toast.success('Vehicle created successfully!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vehicle">
          <TabsList>
            <TabsTrigger value="vehicle">Vehicle Details</TabsTrigger>
            <TabsTrigger value="tokens">Tokenization</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vehicle">
            <VehicleDetailsForm
              data={vehicleData}
              onChange={setVehicleData}
            />
          </TabsContent>
          
          <TabsContent value="tokens">
            <TokenizationForm
              data={tokenData}
              onChange={setTokenData}
            />
          </TabsContent>
          
          <TabsContent value="pricing">
            <PricingForm
              data={vehicleData}
              onChange={setVehicleData}
            />
          </TabsContent>
        </Tabs>
        
        <Button
          onClick={handleSubmit}
          className="mt-6 w-full"
          disabled={!isFormValid()}
        >
          Create Vehicle & Tokens
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## State Management

### Global Stores (Zustand)

```typescript
// store/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userType: 'investor' | 'rentor' | 'renter' | null;
  identityAddress: `0x${string}` | null;
  isVerified: boolean;
  investorType: InvestorType | null;
  setUserType: (type: UserState['userType']) => void;
  setIdentity: (address: `0x${string}`) => void;
  setVerified: (verified: boolean) => void;
  setInvestorType: (type: InvestorType) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userType: null,
      identityAddress: null,
      isVerified: false,
      investorType: null,
      setUserType: (type) => set({ userType: type }),
      setIdentity: (address) => set({ identityAddress: address }),
      setVerified: (verified) => set({ isVerified: verified }),
      setInvestorType: (type) => set({ investorType: type }),
      reset: () => set({
        userType: null,
        identityAddress: null,
        isVerified: false,
        investorType: null,
      }),
    }),
    {
      name: 'user-storage',
    }
  )
);
```

```typescript
// store/notificationStore.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        read: false,
      },
      ...state.notifications,
    ],
    unreadCount: state.unreadCount + 1,
  })),
  
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
}));
```

---

## UI Components Library

### Key Components

#### 1. Transaction Button

```typescript
// components/web3/TransactionButton.tsx
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TransactionButtonProps {
  onClick: () => Promise<void>;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function TransactionButton({
  onClick,
  isLoading,
  loadingText = 'Processing...',
  children,
}: TransactionButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      await onClick();
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setIsPending(false);
    }
  };

  const loading = isLoading || isPending;

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
```

#### 2. Token Balance Display

```typescript
// components/web3/TokenBalance.tsx
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';

interface TokenBalanceProps {
  address: `0x${string}`;
  tokenAddress?: `0x${string}`;
  showSymbol?: boolean;
}

export function TokenBalance({
  address,
  tokenAddress,
  showSymbol = true,
}: TokenBalanceProps) {
  const { data, isLoading } = useBalance({
    address,
    token: tokenAddress,
    watch: true,
  });

  if (isLoading) {
    return <Skeleton className="h-6 w-24" />;
  }

  const formatted = formatUnits(data?.value || 0n, data?.decimals || 18);

  return (
    <div className="font-mono">
      {parseFloat(formatted).toFixed(4)}
      {showSymbol && data?.symbol && (
        <span className="ml-1 text-muted-foreground">{data.symbol}</span>
      )}
    </div>
  );
}
```

#### 3. Investment Card

```typescript
// components/investor/InvestmentCard.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Car } from 'lucide-react';

interface InvestmentCardProps {
  vehicle: Vehicle;
  campaign: Campaign;
  onInvest: () => void;
}

export function InvestmentCard({ vehicle, campaign, onInvest }: InvestmentCardProps) {
  const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
        <img
          src={vehicle.imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover mix-blend-overlay"
        />
        <Badge className="absolute top-4 right-4">
          {campaign.investorType}
        </Badge>
      </div>
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground">
              VIN: {vehicle.vin}
            </p>
          </div>
          <Car className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Funding Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Funding Progress</span>
            <span className="font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>${formatNumber(campaign.currentAmount)}</span>
            <span>Goal: ${formatNumber(campaign.targetAmount)}</span>
          </div>
        </div>
        
        {/* Expected ROI */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Expected ROI</span>
          </div>
          <span className="text-lg font-bold text-green-500">
            {campaign.expectedROI}%
          </span>
        </div>
        
        {/* Investment Range */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Min Investment</p>
            <p className="font-semibold">${formatNumber(campaign.minInvestment)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Investment</p>
            <p className="font-semibold">${formatNumber(campaign.maxInvestment)}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button onClick={onInvest} className="w-full">
          Invest Now
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### 4. Vehicle Card (Renter)

```typescript
// components/renter/VehicleCard.tsx
export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { requestBooking } = useRequestBooking();
  
  return (
    <Card className="overflow-hidden">
      <div className="relative h-56">
        <img
          src={vehicle.imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover"
        />
        {vehicle.status === 'available' && (
          <Badge className="absolute top-4 left-4 bg-green-500">
            Available Now
          </Badge>
        )}
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{vehicle.make} {vehicle.model}</CardTitle>
            <p className="text-sm text-muted-foreground">{vehicle.year}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${vehicle.ratePerDay}</p>
            <p className="text-sm text-muted-foreground">per day</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Gauge className="h-4 w-4" />
            <span>{formatNumber(vehicle.mileage)} mi</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel className="h-4 w-4" />
            <span>{vehicle.fuelType}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{vehicle.seats} seats</span>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex gap-2">
          {vehicle.features.map((feature) => (
            <Badge key={feature} variant="outline">
              {feature}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1">
          View Details
        </Button>
        <Button className="flex-1" onClick={() => requestBooking(vehicle.id)}>
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### 5. Revenue Chart

```typescript
// components/investor/RevenueChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## Responsive Design

### Breakpoints (Tailwind)
```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};
```

### Mobile-First Approach
- All layouts built mobile-first
- Progressive enhancement for larger screens
- Touch-friendly interactions
- Bottom navigation for mobile

### Example Responsive Component
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {vehicles.map((vehicle) => (
    <VehicleCard key={vehicle.id} vehicle={vehicle} />
  ))}
</div>
```

---

## Performance Optimization

### Code Splitting
```typescript
// Lazy load heavy components
const InvestorDashboard = lazy(() => import('@/components/investor/Dashboard'));
const RentorDashboard = lazy(() => import('@/components/rentor/Dashboard'));

// Route-based code splitting (automatic with Next.js app router)
```

### Caching Strategy (React Query)
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### Optimistic Updates
```typescript
const { mutate } = useMutation({
  mutationFn: updateVehicle,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['vehicle', vehicleId]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['vehicle', vehicleId]);
    
    // Optimistically update
    queryClient.setQueryData(['vehicle', vehicleId], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['vehicle', vehicleId], context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['vehicle', vehicleId]);
  },
});
```

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
```typescript
// __tests__/components/InvestmentCard.test.tsx
import { render, screen } from '@testing-library/react';
import { InvestmentCard } from '@/components/investor/InvestmentCard';

describe('InvestmentCard', () => {
  it('renders vehicle information', () => {
    render(<InvestmentCard vehicle={mockVehicle} campaign={mockCampaign} />);
    
    expect(screen.getByText('2024 Tesla Model 3')).toBeInTheDocument();
    expect(screen.getByText('27% ROI')).toBeInTheDocument();
  });
  
  it('calls onInvest when button clicked', async () => {
    const onInvest = vi.fn();
    render(
      <InvestmentCard
        vehicle={mockVehicle}
        campaign={mockCampaign}
        onInvest={onInvest}
      />
    );
    
    await userEvent.click(screen.getByText('Invest Now'));
    expect(onInvest).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
// __tests__/flows/booking-flow.test.tsx
describe('Booking Flow', () => {
  it('completes full booking process', async () => {
    // Mock wallet connection
    mockWallet();
    
    // Navigate to vehicle
    render(<VehiclePage vehicleId="1" />);
    
    // Click book now
    await userEvent.click(screen.getByText('Book Now'));
    
    // Select dates
    await selectDates('2024-03-15', '2024-03-18');
    
    // Review pricing
    expect(screen.getByText('$240.00')).toBeInTheDocument();
    
    // Confirm booking
    await userEvent.click(screen.getByText('Confirm & Pay'));
    
    // Verify transaction sent
    expect(mockContractWrite).toHaveBeenCalledWith({
      functionName: 'requestBooking',
      args: expect.any(Array),
    });
  });
});
```

### E2E Tests (Playwright)
```typescript
// e2e/investor-journey.spec.ts
test('investor can complete investment', async ({ page }) => {
  await page.goto('/investor/marketplace');
  
  // Find vehicle
  await page.click('text=2024 Tesla Model 3');
  
  // Click invest
  await page.click('button:has-text("Invest Now")');
  
  // Enter amount
  await page.fill('[name="amount"]', '5000');
  
  // Confirm in wallet (mocked)
  await page.click('button:has-text("Confirm Transaction")');
  
  // Wait for success
  await expect(page.locator('text=Investment successful')).toBeVisible();
});
```

---

## Deployment

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Contract Addresses
NEXT_PUBLIC_IDENTITY_FACTORY=0x...
NEXT_PUBLIC_COMPLIANCE_MODULE=0x...
NEXT_PUBLIC_PAYMENT_PROTOCOL=0x...
NEXT_PUBLIC_VEHICLE_REGISTRY=0x...
NEXT_PUBLIC_RENTAL_BOOKING=0x...

# CRE Services
NEXT_PUBLIC_CRE_IDENTITY_URL=https://cre.example.com/identity
NEXT_PUBLIC_CRE_TELEMATICS_URL=https://cre.example.com/telematics

# Analytics
NEXT_PUBLIC_GA_ID=G-...
```

### Build & Deploy
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Monitoring & Analytics

### Error Tracking (Sentry)
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Analytics (Google Analytics)
```typescript
// lib/analytics.ts
export const trackEvent = (action: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
};

// Usage
trackEvent('investment_completed', {
  vehicle_id: vehicleId,
  amount: amount.toString(),
});
```

### Performance Monitoring
```typescript
// lib/performance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  console.log(`${name}: ${end - start}ms`);
  
  // Send to analytics
  trackEvent('performance', {
    metric: name,
    duration: end - start,
  });
};
```

---

## Security Best Practices

### Input Validation
```typescript
import { z } from 'zod';

const InvestmentSchema = z.object({
  amount: z.number().min(1000).max(50000),
  vehicleId: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true),
});

// Validate before submission
const result = InvestmentSchema.safeParse(formData);
if (!result.success) {
  toast.error(result.error.message);
  return;
}
```

### XSS Prevention
- All user input sanitized
- React's built-in XSS protection
- DOMPurify for rich text
- Content Security Policy headers

### CSRF Protection
- SameSite cookies
- CSRF tokens for sensitive operations
- Origin validation

---

## Accessibility (WCAG 2.1 AA)

### Semantic HTML
```typescript
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>
```

### Keyboard Navigation
- All interactive elements keyboard-accessible
- Focus indicators visible
- Skip links for screen readers
- Logical tab order

### Screen Reader Support
```typescript
<Button aria-label="Invest in 2024 Tesla Model 3">
  Invest Now
</Button>

<img
  src={vehicle.image}
  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
/>
```

---

## Progressive Web App (PWA)

### Manifest
```json
{
  "name": "RentalCar Platform",
  "short_name": "RentalCar",
  "description": "Decentralized car rental and investment platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
- Offline support
- Cache API responses
- Background sync for transactions
- Push notifications

---

## Internationalization (i18n)

### Setup
```typescript
// next-i18next.config.js
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'zh'],
  },
};
```

### Usage
```typescript
import { useTranslation } from 'next-i18next';

export function WelcomeMessage() {
  const { t } = useTranslation('common');
  
  return <h1>{t('welcome')}</h1>;
}
```

---

## Summary

This frontend architecture provides:

✅ **Three distinct user experiences** (Investor, Rentor, Renter)
✅ **Complete smart contract integration** via wagmi/viem
✅ **Chainlink CRE service integration** for off-chain computation
✅ **Modern, responsive UI** with TailwindCSS and shadcn/ui
✅ **Type-safe development** with TypeScript
✅ **Optimized performance** with code splitting and caching
✅ **Comprehensive testing** strategy
✅ **Production-ready** deployment setup

The architecture is modular, scalable, and maintainable, with clear separation of concerns between business logic, UI components, and blockchain interactions.
