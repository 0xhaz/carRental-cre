"use client";

import { Heading, Paragraph } from "@/components/ui";
import EscrowManagement from "@/components/admin/EscrowManagement";

export default function AdminEscrowsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Heading as="h1" className="mb-2">
          Escrow Management
        </Heading>
        <Paragraph className="text-lg">
          Monitor escrow balances, process expired escrows, and manage fee withdrawals.
        </Paragraph>
      </div>

      <EscrowManagement />
    </div>
  );
}
