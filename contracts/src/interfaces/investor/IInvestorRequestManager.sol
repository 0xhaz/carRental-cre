// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {IInvestorTypeRegistry} from "../erc3643/IInvestorTypeRegistry.sol";

/**
 * @title IInvestorRequestManager
 * @dev Interface for managing investor requests and interactions with the Investor Type Registry
 */
interface IInvestorRequestManager {
    /*//////////////////////////////////////////////////////////////
                            ENUMS
    //////////////////////////////////////////////////////////////*/
    enum RequestStatus {
        NONE,
        PENDING,
        WALLETCREATED,
        TOKENSLOCKED,
        APPROVED,
        REJECTED
    }

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new investor request is created
    event InvestorRequestCreated(
        address indexed user,
        IInvestorTypeRegistry.InvestorType requestedType,
        uint256 requiredLockAmount,
        uint256 timestamp
    );

    /// @notice Emitted when a multi-signature wallet is created for an investor
    event MultiSigWalletCreated(address indexed user, address indexed walletAddress, uint256 timestamp);

    /// @notice Emitted when tokens are locked in the investor's multi-signature wallet
    event TokensLocked(address indexed user, address indexed wallet, uint256 amount, uint256 timestamp);

    /// @notice Emitted when an investor request is approved
    event InvestorRequestApproved(
        address indexed user, IInvestorTypeRegistry.InvestorType investorType, uint256 timestamp
    );

    /// @notice Emitted when an investor request is rejected
    event InvestorRequestRejected(
        address indexed user, IInvestorTypeRegistry.InvestorType requestedType, uint256 timestamp
    );

    /// @notice Emitted when lock requirement for an investor type is updated
    event LockRequirementUpdated(IInvestorTypeRegistry.InvestorType investorType, uint256 oldAmount, uint256 newAmount);

    /// @notice Emitted when an investor is downgraded to a lower investor type
    event InvestorDowngraded(
        address indexed user,
        IInvestorTypeRegistry.InvestorType oldType,
        IInvestorTypeRegistry.InvestorType newType,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                        CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Request a change in investor status
     * @param requestedType The desired investor type
     */
    function requestInvestorStatus(IInvestorTypeRegistry.InvestorType requestedType) external;

    /**
     * @dev Create a multi-signature wallet for the investor
     * @param user The address of the investor requesting the wallet
     */
    function createMultiSigWallet(address user) external;

    /**
     * @dev Confirm that tokens have been locked in the investor's multi-signature wallet
     */
    function confirmTokensLocked() external;

    /**
     * @dev Approve an investor request
     * @param user The address of the investor whose request is being approved
     */
    function approveRequest(address user) external;

    /**
     * @dev Reject an investor request
     * @param user The address of the investor whose request is being rejected
     * @param reason The reason for rejection
     */
    function rejectRequest(address user, string calldata reason) external;

    /**
     * @dev Update the token lock requirement for a specific investor type
     * @param investorType The investor type to update
     * @param newAmount The new token lock amount
     */
    function updateLockRequirement(IInvestorTypeRegistry.InvestorType investorType, uint256 newAmount) external;

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Display attributes of a specific investor request
     * @return requestedType The requested investor type
     * @return requiredLockAmount The required token lock amount
     * @return multiSigWallet The address of the multi-signature wallet
     * @return status The current status of the request
     * @return createdAt The timestamp when the request was created
     * @return approvedAt The timestamp when the request was approved
     * @return rejectionReason The reason for rejection, if applicable
     */
    function getRequest(address user)
        external
        view
        returns (
            IInvestorTypeRegistry.InvestorType requestedType,
            uint256 requiredLockAmount,
            address multiSigWallet,
            RequestStatus status,
            uint256 createdAt,
            uint256 approvedAt,
            string memory rejectionReason
        );

    /**
     * @dev Retrieve the total request count and request by index
     */
    function getRequestCount() external view returns (uint256);

    /**
     * @dev Retrieve the user address for a request by its index
     * @param index The index of the request
     */
    function getRequestByIndex(uint256 index) external view returns (address user);

    /**
     * @dev Get the bank address associated with the request manager
     */
    function bank() external view returns (address);

    /**
     * @dev Get the token address associated with the request manager
     */
    function token() external view returns (address);

    /**
     * @dev Get the investor type registry associated with the request manager
     */
    function investorRegistry() external view returns (IInvestorTypeRegistry);

    /**
     * @dev Get the token lock requirement for a specific investor type
     */
    function lockRequirements(IInvestorTypeRegistry.InvestorType) external view returns (uint256);

    /**
     * @dev Check if a user has an active request
     */
    function hasActiveRequest(address user) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
            RENTAL CAR PLATFORM SPECIFIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set payment protocol address (authorized to record investments)
     * @param _paymentProtocol Address of the payment protocol
     */
    function setPaymentProtocol(address _paymentProtocol) external;

    /**
     * @notice Record investment in a specific vehicle
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @param amount Investment amount
     */
    function recordVehicleInvestment(address investor, uint256 vehicleId, uint256 amount) external;

    /**
     * @notice Get investment in a specific vehicle
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @return amount Investment amount in the vehicle
     */
    function getVehicleInvestment(address investor, uint256 vehicleId) external view returns (uint256 amount);

    /**
     * @notice Get total investment across all vehicles
     * @param investor Address of the investor
     * @return total Total investment amount
     */
    function getTotalInvestment(address investor) external view returns (uint256 total);

    /**
     * @notice Check if investor can invest in a vehicle based on limits
     * @param investor Address of the investor
     * @param vehicleId ID of the vehicle
     * @param amount Amount to invest
     * @return canInvest Whether the investor can make this investment
     * @return reason Reason code if cannot invest
     */
    function canInvestInVehicle(address investor, uint256 vehicleId, uint256 amount)
        external
        view
        returns (bool canInvest, uint8 reason);

    /**
     * @notice Get participant type registry address
     * @return Address of the participant type registry
     */
    function getParticipantRegistry() external view returns (address);
}
