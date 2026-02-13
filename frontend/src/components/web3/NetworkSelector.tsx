"use client";

import { useState } from "react";
import { Select } from "@/components/ui";
import { MOCK_NETWORKS } from "@/lib/constants";
import { toast } from "react-hot-toast";

export interface NetworkSelectorProps {
  onNetworkChange?: (chainId: number) => void;
  className?: string;
}

export function NetworkSelector({
  onNetworkChange,
  className,
}: NetworkSelectorProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<number>(MOCK_NETWORKS[0].chainId);

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chainId = parseInt(e.target.value);
    setSelectedNetwork(chainId);

    const network = MOCK_NETWORKS.find((n) => n.chainId === chainId);
    toast.success(`Switched to ${network?.name} (mock)`);

    onNetworkChange?.(chainId);
  };

  const options = MOCK_NETWORKS.map((network) => ({
    value: network.chainId.toString(),
    label: `${network.name} (${network.symbol})`,
  }));

  return (
    <div className={className}>
      <Select
        value={selectedNetwork.toString()}
        onChange={handleNetworkChange}
        options={options}
      />
    </div>
  );
}
