import { NextRequest, NextResponse } from "next/server";
import {
  verifyCloudProof,
  type IVerifyResponse,
  type ISuccessResult,
} from "@worldcoin/minikit-js";

interface VerifyRequest {
  payload: ISuccessResult;
  signal: string;
}

export async function POST(req: NextRequest) {
  try {
    const { payload, signal } = (await req.json()) as VerifyRequest;

    const app_id = process.env.WORLD_APP_ID as `app_${string}`;
    const action = process.env.WORLD_ACTION_ID!;

    if (!app_id || !action) {
      return NextResponse.json(
        { success: false, error: "World ID not configured on server" },
        { status: 500 },
      );
    }

    const verifyRes: IVerifyResponse = await verifyCloudProof(
      payload,
      app_id,
      action,
      signal,
    );

    if (verifyRes.success) {
      return NextResponse.json({
        success: true,
        verified: true,
        merkle_root: payload.merkle_root,
        nullifier_hash: payload.nullifier_hash,
        proof: payload.proof,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Cloud verification failed",
          details: verifyRes,
        },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
