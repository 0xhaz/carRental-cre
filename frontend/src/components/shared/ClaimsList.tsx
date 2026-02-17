"use client";

import { Card, CardContent, Badge, Heading } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useUserIdentity,
  useIsUserVerified,
  useClaimsByIdentity,
  useClaimDetails,
  useClaimValidity,
  getClaimTopicName,
} from "@/hooks/useIdentity";

export interface ClaimsListProps {
  userAddress: string;
  className?: string;
}

function ClaimRow({ claimId }: { claimId: string }) {
  const { data: claim } = useClaimDetails(claimId);
  const { data: isValid } = useClaimValidity(claimId);

  if (!claim) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const claimData = claim as {
    identity: string;
    topic: bigint;
    scheme: bigint;
    signature: string;
    data: string;
    uri: string;
    issuedAt: bigint;
    validTo: bigint;
    revoked: boolean;
    revokedAt: bigint;
  };

  const topicName = getClaimTopicName(Number(claimData.topic));
  const issuedDate = new Date(Number(claimData.issuedAt) * 1000);
  const hasExpiry = claimData.validTo > BigInt(0);
  const expiryDate = hasExpiry
    ? new Date(Number(claimData.validTo) * 1000)
    : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;

  let statusVariant: "success" | "error" | "warning" = "success";
  let statusText = "Valid";

  if (claimData.revoked) {
    statusVariant = "error";
    statusText = "Revoked";
  } else if (isExpired) {
    statusVariant = "warning";
    statusText = "Expired";
  } else if (!isValid) {
    statusVariant = "error";
    statusText = "Invalid";
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{topicName}</span>
          <Badge variant={statusVariant} className="text-xs">
            {statusText}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>Issued: {issuedDate.toLocaleDateString()}</span>
          {expiryDate && (
            <span>Expires: {expiryDate.toLocaleDateString()}</span>
          )}
          {claimData.uri && (
            <a
              href={claimData.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              URI
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClaimsList({ userAddress, className }: ClaimsListProps) {
  const { data: identityAddress, isLoading: identityLoading } =
    useUserIdentity(userAddress);
  const { data: isVerified } = useIsUserVerified(userAddress);
  const { data: claimIds, isLoading: claimsLoading } = useClaimsByIdentity(
    identityAddress as string | undefined
  );

  const isLoading = identityLoading || claimsLoading;
  const claims = (claimIds as string[]) || [];

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Heading as="h3">Identity Claims</Heading>
          {isVerified !== undefined && (
            <Badge variant={isVerified ? "success" : "warning"}>
              {isVerified ? "Verified" : "Unverified"}
            </Badge>
          )}
        </div>

        {typeof identityAddress === "string" && identityAddress && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="mr-1">OnchainID:</span>
            <ExplorerLink value={identityAddress} type="address" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !identityAddress ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No identity registered for this address
          </p>
        ) : claims.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No claims issued yet
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {claims.map((claimId) => (
              <ClaimRow key={claimId} claimId={claimId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
