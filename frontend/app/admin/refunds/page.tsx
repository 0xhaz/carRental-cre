"use client";

import { Heading, Paragraph } from "@/components/ui";
import RefundManagement from "@/components/admin/RefundManagement";

export default function AdminRefundsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Refund Management
        </Heading>
        <Paragraph className="text-lg">
          Review, approve, reject, and process refund requests for investment and rental payments.
        </Paragraph>
      </div>

      <RefundManagement />
    </div>
  );
}
