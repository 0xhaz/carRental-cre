"use client";

import { Card, CardContent, Heading, Badge } from "@/components/ui";
import { ExplorerLink, AddressDisplay } from "@/components/web3";

export interface ConditionReportData {
  timestamp: bigint;
  mileage: bigint;
  fuelLevel: number;
  photoHashes: string[];
  damageNotes: string[];
  inspector: string;
}

export interface ConditionReportDisplayProps {
  report: ConditionReportData;
  type: "pre" | "post";
  className?: string;
}

export function ConditionReportDisplay({
  report,
  type,
  className,
}: ConditionReportDisplayProps) {
  const date = new Date(Number(report.timestamp) * 1000);
  const title = type === "pre" ? "Pre-Rental Report" : "Post-Rental Report";
  const variant = type === "pre" ? "info" : "success";

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Heading as="h4" className="text-sm">
            {title}
          </Heading>
          <Badge variant={variant}>{date.toLocaleDateString()}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-gray-500">Mileage</span>
            <p className="font-medium">{Number(report.mileage).toLocaleString()} km</p>
          </div>
          <div>
            <span className="text-gray-500">Fuel Level</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${report.fuelLevel}%` }}
                />
              </div>
              <span className="font-medium text-xs">{report.fuelLevel}%</span>
            </div>
          </div>
        </div>

        {report.photoHashes.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 block mb-1">Photo Evidence</span>
            <div className="space-y-1">
              {report.photoHashes.map((hash, i) => (
                <div key={i} className="text-xs font-mono text-gray-600 truncate">
                  {hash}
                </div>
              ))}
            </div>
          </div>
        )}

        {report.damageNotes.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 block mb-1">Damage Notes</span>
            <ul className="text-sm text-gray-700 space-y-1">
              {report.damageNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">-</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-gray-500">
          Inspector: <ExplorerLink value={report.inspector} type="address" />
        </div>
      </CardContent>
    </Card>
  );
}
