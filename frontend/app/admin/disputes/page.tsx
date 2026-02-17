"use client";

import { Heading, Paragraph } from "@/components/ui";
import { DisputeManagement } from "@/components/admin/DisputeManagement";

export default function AdminDisputesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Dispute Management
        </Heading>
        <Paragraph className="text-lg">
          Review and resolve payment disputes. Emergency resolve or close completed disputes.
        </Paragraph>
      </div>

      <DisputeManagement />
    </div>
  );
}
