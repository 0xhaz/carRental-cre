"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Heading, Button, Input, Separator } from "@/components/ui";
import { ExplorerLink } from "@/components/web3";
import {
  useAssetTokenMint,
  useAssetTokenBurn,
  useAssetTokenSetAddressFrozen,
  useAssetTokenFreezePartial,
  useAssetTokenUnfreezePartial,
  useAssetTokenRecovery,
} from "@/hooks/useAssetToken";
import {
  useRevenueTokenMint,
  useRevenueTokenBurn,
  useRevenueTokenSetAddressFrozen,
  useRevenueTokenFreezePartial,
  useRevenueTokenUnfreezePartial,
  useRevenueTokenRecovery,
} from "@/hooks/useRevenueToken";
import { parseEther } from "viem";
import { toast } from "react-hot-toast";

interface TokenAgentActionsProps {
  tokenAddress: `0x${string}`;
  tokenType: "asset" | "revenue";
}

export default function TokenAgentActions({ tokenAddress, tokenType }: TokenAgentActionsProps) {
  const isAsset = tokenType === "asset";

  // Form states
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [burnFrom, setBurnFrom] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [freezeAddr, setFreezeAddr] = useState("");
  const [freezeToggle, setFreezeToggle] = useState(true);
  const [partialAddr, setPartialAddr] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [partialAction, setPartialAction] = useState<"freeze" | "unfreeze">("freeze");
  const [recoverLost, setRecoverLost] = useState("");
  const [recoverNew, setRecoverNew] = useState("");
  const [recoverId, setRecoverId] = useState("");

  // Hooks
  const assetMint = useAssetTokenMint(isAsset ? tokenAddress : undefined);
  const revenueMint = useRevenueTokenMint(!isAsset ? tokenAddress : undefined);
  const assetBurn = useAssetTokenBurn(isAsset ? tokenAddress : undefined);
  const revenueBurn = useRevenueTokenBurn(!isAsset ? tokenAddress : undefined);
  const assetFreeze = useAssetTokenSetAddressFrozen(isAsset ? tokenAddress : undefined);
  const revenueFreeze = useRevenueTokenSetAddressFrozen(!isAsset ? tokenAddress : undefined);
  const assetFreezePartial = useAssetTokenFreezePartial(isAsset ? tokenAddress : undefined);
  const revenueFreezePartial = useRevenueTokenFreezePartial(!isAsset ? tokenAddress : undefined);
  const assetUnfreezePartial = useAssetTokenUnfreezePartial(isAsset ? tokenAddress : undefined);
  const revenueUnfreezePartial = useRevenueTokenUnfreezePartial(!isAsset ? tokenAddress : undefined);
  const assetRecover = useAssetTokenRecovery(isAsset ? tokenAddress : undefined);
  const revenueRecover = useRevenueTokenRecovery(!isAsset ? tokenAddress : undefined);

  const mint = isAsset ? assetMint : revenueMint;
  const burn = isAsset ? assetBurn : revenueBurn;
  const freeze = isAsset ? assetFreeze : revenueFreeze;
  const freezePartial = isAsset ? assetFreezePartial : revenueFreezePartial;
  const unfreezePartial = isAsset ? assetUnfreezePartial : revenueUnfreezePartial;
  const recover = isAsset ? assetRecover : revenueRecover;

  useEffect(() => { if (mint.isSuccess) { toast.success("Tokens minted!"); setMintAmount(""); } }, [mint.isSuccess]);
  useEffect(() => { if (burn.isSuccess) { toast.success("Tokens burned!"); setBurnAmount(""); } }, [burn.isSuccess]);
  useEffect(() => { if (freeze.isSuccess) toast.success(`Address ${freezeToggle ? "frozen" : "unfrozen"}!`); }, [freeze.isSuccess]);
  useEffect(() => { if (freezePartial.isSuccess || unfreezePartial.isSuccess) toast.success("Partial freeze/unfreeze complete!"); }, [freezePartial.isSuccess, unfreezePartial.isSuccess]);
  useEffect(() => { if (recover.isSuccess) toast.success("Token recovery complete!"); }, [recover.isSuccess]);

  return (
    <Card>
      <CardContent className="p-6">
        <Heading as="h4" className="text-sm mb-4">Agent Actions ({isAsset ? "Asset" : "Revenue"} Token)</Heading>

        {/* Mint */}
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium">Mint Tokens</p>
          <div className="grid grid-cols-2 gap-3">
            <Input type="text" label="To" value={mintTo} onChange={(e) => setMintTo(e.target.value)} placeholder="0x..." />
            <Input type="number" label="Amount" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="100" min={0} />
          </div>
          <Button
            onClick={() => mint.mint(mintTo as `0x${string}`, parseEther(mintAmount))}
            disabled={mint.isPending || mint.isConfirming || !mintTo || !mintAmount}
            className="w-full" size="sm"
          >
            {mint.isPending ? "Confirm..." : mint.isConfirming ? "Minting..." : "Mint"}
          </Button>
          {mint.hash && <ExplorerLink value={mint.hash} type="tx" label="View tx" className="text-xs" />}
        </div>

        <Separator className="my-4" />

        {/* Burn */}
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium">Burn Tokens</p>
          <div className="grid grid-cols-2 gap-3">
            <Input type="text" label="From" value={burnFrom} onChange={(e) => setBurnFrom(e.target.value)} placeholder="0x..." />
            <Input type="number" label="Amount" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} placeholder="100" min={0} />
          </div>
          <Button
            onClick={() => burn.burn(burnFrom as `0x${string}`, parseEther(burnAmount))}
            disabled={burn.isPending || burn.isConfirming || !burnFrom || !burnAmount}
            className="w-full" size="sm" variant="outline"
          >
            {burn.isPending ? "Confirm..." : burn.isConfirming ? "Burning..." : "Burn"}
          </Button>
          {burn.hash && <ExplorerLink value={burn.hash} type="tx" label="View tx" className="text-xs" />}
        </div>

        <Separator className="my-4" />

        {/* Freeze/Unfreeze Address */}
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium">Freeze/Unfreeze Address</p>
          <Input type="text" label="Address" value={freezeAddr} onChange={(e) => setFreezeAddr(e.target.value)} placeholder="0x..." />
          <div className="flex gap-3">
            <Button
              onClick={() => freeze.setFrozen(freezeAddr as `0x${string}`, true)}
              disabled={freeze.isPending || freeze.isConfirming || !freezeAddr}
              size="sm" className="flex-1"
            >
              Freeze
            </Button>
            <Button
              variant="outline"
              onClick={() => freeze.setFrozen(freezeAddr as `0x${string}`, false)}
              disabled={freeze.isPending || freeze.isConfirming || !freezeAddr}
              size="sm" className="flex-1"
            >
              Unfreeze
            </Button>
          </div>
          {freeze.hash && <ExplorerLink value={freeze.hash} type="tx" label="View tx" className="text-xs" />}
        </div>

        <Separator className="my-4" />

        {/* Partial Freeze/Unfreeze */}
        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium">Partial Freeze/Unfreeze</p>
          <div className="grid grid-cols-2 gap-3">
            <Input type="text" label="Address" value={partialAddr} onChange={(e) => setPartialAddr(e.target.value)} placeholder="0x..." />
            <Input type="number" label="Amount" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} placeholder="50" min={0} />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => freezePartial.freezePartial(partialAddr as `0x${string}`, parseEther(partialAmount))}
              disabled={freezePartial.isPending || freezePartial.isConfirming || !partialAddr || !partialAmount}
              size="sm" className="flex-1"
            >
              Freeze Partial
            </Button>
            <Button
              variant="outline"
              onClick={() => unfreezePartial.unfreezePartial(partialAddr as `0x${string}`, parseEther(partialAmount))}
              disabled={unfreezePartial.isPending || unfreezePartial.isConfirming || !partialAddr || !partialAmount}
              size="sm" className="flex-1"
            >
              Unfreeze Partial
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Recovery */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Token Recovery</p>
          <div className="grid grid-cols-3 gap-3">
            <Input type="text" label="Lost Wallet" value={recoverLost} onChange={(e) => setRecoverLost(e.target.value)} placeholder="0x..." />
            <Input type="text" label="New Wallet" value={recoverNew} onChange={(e) => setRecoverNew(e.target.value)} placeholder="0x..." />
            <Input type="text" label="Identity Hash" value={recoverId} onChange={(e) => setRecoverId(e.target.value)} placeholder="0x..." />
          </div>
          <Button
            onClick={() => recover.recover(recoverLost as `0x${string}`, recoverNew as `0x${string}`, recoverId as `0x${string}`)}
            disabled={recover.isPending || recover.isConfirming || !recoverLost || !recoverNew || !recoverId}
            className="w-full" size="sm" variant="outline"
          >
            {recover.isPending ? "Confirm..." : recover.isConfirming ? "Recovering..." : "Recover Tokens"}
          </Button>
          {recover.hash && <ExplorerLink value={recover.hash} type="tx" label="View tx" className="text-xs" />}
        </div>
      </CardContent>
    </Card>
  );
}
