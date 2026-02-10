// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import {ICompliance} from "../interfaces/compliance/ICompliance.sol";

/**
 * @title ComplianceRegistry
 * @dev Simple mock compliance registry for testing purposes
 */
contract ComplianceRegistry is ICompliance {
    mapping(address => bool) private _modules;
    address[] private _moduleList;

    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);
    event TokenAgentAdded(address indexed agent);
    event TokenAgentRemoved(address indexed agent);

    function canTransfer(
        address,
        /*from*/
        address,
        /*to*/
        uint256 /*amount*/
    )
        external
        pure
        override
        returns (bool)
    {
        return true;
    }

    function transferred(address from, address to, uint256 amount) external override {}

    function created(address to, uint256 amount) external override {}

    function destroyed(address from, uint256 amount) external override {}

    function addModule(address module) external override {
        if (module == address(0)) revert Compliance__InvalidModuleAddress();
        if (_modules[module]) revert Compliance__ModuleAlreadyBound();

        _modules[module] = true;
        _moduleList.push(module);
    }

    function removeModule(address module) external override {
        if (!_modules[module]) revert Compliance__ModuleNotBound();

        _modules[module] = false;

        for (uint256 i = 0; i < _moduleList.length; i++) {
            if (_moduleList[i] == module) {
                _moduleList[i] = _moduleList[_moduleList.length - 1];
                _moduleList.pop();
                break;
            }
        }
    }

    function getModules() external view override returns (address[] memory) {
        return _moduleList;
    }

    function isModuleBound(address module) external view override returns (bool) {
        return _modules[module];
    }

    function isTrustedContract(
        address /*contractAddress*/
    )
        external
        pure
        override
        returns (bool isTrusted)
    {
        return false;
    }
}
