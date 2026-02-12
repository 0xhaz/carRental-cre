// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ClaimTopics} from "../../src/compliance/ClaimTopics.sol";

contract ClaimTopicsTest is Test {
    function testClaimTopicsConstants() public pure {
        assertEq(ClaimTopics.KYC_VERIFIED, 1, "KYC_VERIFIED constant mismatch");
        assertEq(ClaimTopics.ACCREDITED_INVESTOR, 2, "ACCREDITED_INVESTOR constant mismatch");
        assertEq(ClaimTopics.REGIONAL_ELIGIBILITY, 3, "REGIONAL_ELIGIBILITY constant mismatch");
        assertEq(ClaimTopics.DRIVER_LICENSE_VALID, 4, "DRIVER_LICENSE_VALID constant mismatch");
        assertEq(ClaimTopics.INSURANCE_VERIFIED, 5, "INSURANCE_VERIFIED constant mismatch");
        assertEq(ClaimTopics.CREDIT_SCORE_RANGE, 6, "CREDIT_SCORE_RANGE constant mismatch");
        assertEq(ClaimTopics.BUSINESS_REGISTERED, 7, "BUSINESS_REGISTERED constant mismatch");
        assertEq(ClaimTopics.VEHICLE_OWNERSHIP_PROOF, 8, "VEHICLE_OWNERSHIP_PROOF constant mismatch");
    }

    function testGetRenterClaims() public pure {
        uint256[] memory renterClaims = ClaimTopics.getRenterClaims();
        assertEq(renterClaims.length, 4, "Renter claims length mismatch");
        assertEq(renterClaims[0], ClaimTopics.KYC_VERIFIED, "Renter claim 0 mismatch");
        assertEq(renterClaims[1], ClaimTopics.DRIVER_LICENSE_VALID, "Renter claim 1 mismatch");
        assertEq(renterClaims[2], ClaimTopics.INSURANCE_VERIFIED, "Renter claim 2 mismatch");
        assertEq(renterClaims[3], ClaimTopics.CREDIT_SCORE_RANGE, "Renter claim 3 mismatch");
    }

    function testGetRentorClaims() public pure {
        uint256[] memory rentorClaims = ClaimTopics.getRentorClaims();
        assertEq(rentorClaims.length, 3, "Rentor claims length mismatch");
        assertEq(rentorClaims[0], ClaimTopics.KYC_VERIFIED, "Rentor claim 0 mismatch");
        assertEq(rentorClaims[1], ClaimTopics.BUSINESS_REGISTERED, "Rentor claim 1 mismatch");
        assertEq(rentorClaims[2], ClaimTopics.VEHICLE_OWNERSHIP_PROOF, "Rentor claim 2 mismatch");
    }

    function testGetInvestorClaims() public pure {
        uint256[] memory investorClaims = ClaimTopics.getInvestorClaims();
        assertEq(investorClaims.length, 3, "Investor claims length mismatch");
        assertEq(investorClaims[0], ClaimTopics.KYC_VERIFIED, "Investor claim 0 mismatch");
        assertEq(investorClaims[1], ClaimTopics.ACCREDITED_INVESTOR, "Investor claim 1 mismatch");
        assertEq(investorClaims[2], ClaimTopics.REGIONAL_ELIGIBILITY, "Investor claim 2 mismatch");
    }

    function testGetRenterClaimsIndependence() public pure {
        uint256[] memory renterClaims = ClaimTopics.getRenterClaims();
        renterClaims[0] = 999; // Modify the returned array
        uint256[] memory renterClaims2 = ClaimTopics.getRenterClaims();
        assertEq(renterClaims2[0], ClaimTopics.KYC_VERIFIED, "Renter claims array should be independent");
    }

    function testClaimTopicName() public pure {
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.KYC_VERIFIED), "KYC_VERIFIED");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.ACCREDITED_INVESTOR), "ACCREDITED_INVESTOR");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.REGIONAL_ELIGIBILITY), "REGIONAL_ELIGIBILITY");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.DRIVER_LICENSE_VALID), "DRIVER_LICENSE_VALID");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.INSURANCE_VERIFIED), "INSURANCE_VERIFIED");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.CREDIT_SCORE_RANGE), "CREDIT_SCORE_RANGE");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.BUSINESS_REGISTERED), "BUSINESS_REGISTERED");
        assertEq(ClaimTopics.getClaimTopicName(ClaimTopics.VEHICLE_OWNERSHIP_PROOF), "VEHICLE_OWNERSHIP_PROOF");
        assertEq(ClaimTopics.getClaimTopicName(9999), "UNKNOWN");
    }

    function testIsValidClaimTopic() public pure {
        assertTrue(ClaimTopics.isValidClaimTopic(ClaimTopics.KYC_VERIFIED), "KYC_VERIFIED should be valid");
        assertTrue(
            ClaimTopics.isValidClaimTopic(ClaimTopics.ACCREDITED_INVESTOR), "ACCREDITED_INVESTOR should be valid"
        );
        assertTrue(
            ClaimTopics.isValidClaimTopic(ClaimTopics.REGIONAL_ELIGIBILITY), "REGIONAL_ELIGIBILITY should be valid"
        );
        assertTrue(
            ClaimTopics.isValidClaimTopic(ClaimTopics.DRIVER_LICENSE_VALID), "DRIVER_LICENSE_VALID should be valid"
        );
        assertTrue(ClaimTopics.isValidClaimTopic(ClaimTopics.INSURANCE_VERIFIED), "INSURANCE_VERIFIED should be valid");
        assertTrue(ClaimTopics.isValidClaimTopic(ClaimTopics.CREDIT_SCORE_RANGE), "CREDIT_SCORE_RANGE should be valid");
        assertTrue(
            ClaimTopics.isValidClaimTopic(ClaimTopics.BUSINESS_REGISTERED), "BUSINESS_REGISTERED should be valid"
        );
        assertTrue(
            ClaimTopics.isValidClaimTopic(ClaimTopics.VEHICLE_OWNERSHIP_PROOF),
            "VEHICLE_OWNERSHIP_PROOF should be valid"
        );
        assertFalse(ClaimTopics.isValidClaimTopic(9999), "9999 should be invalid");
    }
}
