"use client";

import { Heading, Paragraph } from "@/components/ui";
import TokenCompliancePanel from "@/components/admin/TokenCompliancePanel";

export default function AdminTokenCompliancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Token Compliance
        </Heading>
        <Paragraph className="text-lg">
          Manage ERC-3643 compliant asset and revenue tokens. Mint, burn, freeze, and recover tokens.
        </Paragraph>
      </div>

      <TokenCompliancePanel />
    </div>
  );
}
