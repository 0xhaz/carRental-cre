// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IWorldID — Interface for the World ID Router contract
interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

/// @title ByteHasher — Hash bytes to a field element for ZK proof compatibility
library ByteHasher {
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

/// @title WorldIDVerifier — On-chain World ID proof verification for RegShield
/// @notice Verifies World ID zero-knowledge proofs and stores per-address verification status.
///         Provides `isWorldIDVerified(address)` for CRE workflow and compliance checks.
/// @dev Uses the World ID Router on Sepolia (0x469449f251692e0779667583026b5a1e99512157)
contract WorldIDVerifier is Ownable {
    using ByteHasher for bytes;

    // ── Immutables ───────────────────────────────────────────────────────────
    IWorldID public immutable worldId;
    uint256 public immutable groupId;
    uint256 public immutable externalNullifierHash;

    // ── State ────────────────────────────────────────────────────────────────

    /// @notice Tracks used nullifier hashes to prevent Sybil attacks (one human = one verification)
    mapping(uint256 => bool) internal nullifierHashes;

    /// @notice Quick lookup: is this wallet World ID verified?
    mapping(address => bool) public isWorldIDVerified;

    /// @notice Audit trail: wallet → nullifier hash
    mapping(address => uint256) public userNullifierHash;

    /// @notice Total number of verified users
    uint256 public verifiedCount;

    // ── Events ───────────────────────────────────────────────────────────────
    event WorldIDVerified(address indexed user, uint256 nullifierHash);
    event WorldIDRevoked(address indexed user);

    // ── Errors ───────────────────────────────────────────────────────────────
    error DuplicateNullifier(uint256 nullifierHash);
    error AlreadyVerified(address user);
    error NotVerified(address user);

    // ── Constructor ──────────────────────────────────────────────────────────

    /// @param _worldId Address of the World ID Router contract
    /// @param _appId Application ID from the World ID Developer Portal (e.g. "app_xxx")
    /// @param _actionId Action identifier for this verification (e.g. "verify-regshield")
    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _actionId
    ) Ownable(msg.sender) {
        worldId = _worldId;
        groupId = 1; // Orb verification (highest assurance)
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _actionId)
            .hashToField();
    }

    // ── Core Verification ────────────────────────────────────────────────────

    /// @notice Verify a World ID proof and register the signal address as verified
    /// @param signal The user's wallet address (binds proof to address, prevents front-running)
    /// @param root The Semaphore merkle tree root from the proof
    /// @param nullifierHash Unique per user+action — used for Sybil resistance
    /// @param proof The Groth16 ZK proof (8 uint256 values)
    function verifyAndRegister(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        // Sybil resistance: each human can only verify once
        if (nullifierHashes[nullifierHash]) {
            revert DuplicateNullifier(nullifierHash);
        }

        // Prevent double-registration of same address
        if (isWorldIDVerified[signal]) {
            revert AlreadyVerified(signal);
        }

        // Verify the ZK proof via the World ID Router
        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        // Record verification
        nullifierHashes[nullifierHash] = true;
        isWorldIDVerified[signal] = true;
        userNullifierHash[signal] = nullifierHash;
        verifiedCount++;

        emit WorldIDVerified(signal, nullifierHash);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// @notice Revoke a user's World ID verification (compliance/emergency use)
    /// @param user The wallet address to revoke
    function revokeVerification(address user) external onlyOwner {
        if (!isWorldIDVerified[user]) {
            revert NotVerified(user);
        }
        isWorldIDVerified[user] = false;
        verifiedCount--;
        emit WorldIDRevoked(user);
    }
}
