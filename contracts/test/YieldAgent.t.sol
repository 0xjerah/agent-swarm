// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/YieldAgent.sol";
import "../src/MasterAgent.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
        _decimals = dec;
        _mint(msg.sender, 1000000 * 10**dec);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockAavePool
 * @notice Mock Aave V3 Pool for testing
 */
contract MockAavePool {
    mapping(address => mapping(address => uint256)) public deposits;

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        deposits[asset][onBehalfOf] += amount;
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(deposits[asset][to] >= amount, "Insufficient balance");
        deposits[asset][to] -= amount;
        MockERC20(asset).mint(to, amount);
        return amount;
    }

    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        // Mock values
        return (1000e8, 0, 800e8, 8500, 7500, type(uint256).max);
    }
}

/**
 * @title MockRewardsController
 * @notice Mock Aave V3 Rewards Controller
 */
contract MockRewardsController {
    function claimAllRewards(
        address[] calldata /*assets*/,
        address to
    ) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts) {
        // Mock: return 10 reward tokens
        rewardsList = new address[](1);
        claimedAmounts = new uint256[](1);
        claimedAmounts[0] = 10 * 10**18;
        return (rewardsList, claimedAmounts);
    }

    function getAllUserRewards(
        address[] calldata /*assets*/,
        address /*user*/
    ) external view returns (address[] memory rewardsList, uint256[] memory unclaimedAmounts) {
        rewardsList = new address[](1);
        unclaimedAmounts = new uint256[](1);
        unclaimedAmounts[0] = 10 * 10**18;
        return (rewardsList, unclaimedAmounts);
    }
}

/**
 * @title YieldAgentTest
 * @notice Comprehensive tests for YieldAgent contract
 */
contract YieldAgentTest is Test {
    YieldAgent public yieldAgent;
    MasterAgent public masterAgent;
    MockAavePool public aavePool;
    MockRewardsController public rewardsController;
    MockERC20 public usdc;
    MockERC20 public aUsdc;

    address public owner = address(1);
    address public user = address(2);
    address public executor = address(3);

    uint256 constant DAILY_LIMIT = 1000 * 10**6; // 1000 USDC
    uint256 constant TARGET_ALLOCATION = 500 * 10**6; // 500 USDC

    event StrategyCreated(
        address indexed user,
        uint256 indexed strategyId,
        address token,
        address aToken,
        YieldAgent.StrategyType strategyType,
        uint256 targetAllocation
    );
    event FundsDeposited(address indexed user, uint256 indexed strategyId, uint256 amount);
    event YieldHarvested(address indexed user, uint256 indexed strategyId, uint256 yieldAmount);
    event FundsWithdrawn(address indexed user, uint256 indexed strategyId, uint256 amount);
    event StrategyDeactivated(address indexed user, uint256 indexed strategyId);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        aUsdc = new MockERC20("aUSDC", "aUSDC", 6);

        // Deploy mock Aave
        aavePool = new MockAavePool();
        rewardsController = new MockRewardsController();

        // Deploy contracts
        masterAgent = new MasterAgent();
        yieldAgent = new YieldAgent(
            address(masterAgent),
            address(aavePool),
            address(rewardsController)
        );

        // Register yield agent
        masterAgent.registerAgent(address(yieldAgent), "YIELD");

        vm.stopPrank();

        // Fund user
        usdc.mint(user, 10000 * 10**6); // 10k USDC
    }

    /*//////////////////////////////////////////////////////////////
                        STRATEGY CREATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCreateYieldStrategy() public {
        vm.startPrank(user);

        vm.expectEmit(true, true, false, true);
        emit StrategyCreated(
            user,
            0,
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        assertEq(strategyId, 0);
        assertEq(yieldAgent.getUserStrategyCount(user), 1);

        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertEq(strategy.user, user);
        assertEq(strategy.token, address(usdc));
        assertEq(strategy.aToken, address(aUsdc));
        assertTrue(uint8(strategy.strategyType) == uint8(YieldAgent.StrategyType.AAVE_SUPPLY));
        assertEq(strategy.targetAllocation, TARGET_ALLOCATION);
        assertEq(strategy.currentDeposited, 0);
        assertTrue(strategy.active);

        vm.stopPrank();
    }

    function testCannotCreateStrategyWithInvalidTokens() public {
        vm.startPrank(user);

        vm.expectRevert("Invalid token");
        yieldAgent.createYieldStrategy(
            address(0),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        vm.expectRevert("Invalid aToken");
        yieldAgent.createYieldStrategy(
            address(usdc),
            address(0),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        vm.stopPrank();
    }

    function testCannotCreateStrategyWithZeroAllocation() public {
        vm.startPrank(user);

        vm.expectRevert("Target must be positive");
        yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            0
        );

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        DEPOSIT TESTS
    //////////////////////////////////////////////////////////////*/

    function testExecuteDeposit() public {
        // Setup: user creates strategy and delegates permission
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(yieldAgent), type(uint256).max);
        vm.stopPrank();

        // Execute deposit
        vm.startPrank(executor);

        uint256 userUsdcBefore = usdc.balanceOf(user);

        vm.expectEmit(true, true, false, true);
        emit FundsDeposited(user, strategyId, TARGET_ALLOCATION);

        yieldAgent.executeDeposit(user, strategyId);

        uint256 userUsdcAfter = usdc.balanceOf(user);

        // Verify USDC was deposited
        assertEq(userUsdcBefore - userUsdcAfter, TARGET_ALLOCATION);

        // Verify strategy state updated
        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertEq(strategy.currentDeposited, TARGET_ALLOCATION);

        vm.stopPrank();
    }

    function testCannotDepositWhenTargetReached() public {
        // Setup and deposit once
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(yieldAgent), type(uint256).max);
        vm.stopPrank();

        vm.prank(executor);
        yieldAgent.executeDeposit(user, strategyId);

        // Try to deposit again
        vm.startPrank(executor);

        vm.expectRevert("Target allocation reached");
        yieldAgent.executeDeposit(user, strategyId);

        vm.stopPrank();
    }

    function testCannotDepositWithInsufficientPermission() public {
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        // No delegation
        vm.stopPrank();

        vm.startPrank(executor);

        vm.expectRevert("Insufficient permission");
        yieldAgent.executeDeposit(user, strategyId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        HARVEST TESTS
    //////////////////////////////////////////////////////////////*/

    function testHarvestYield() public {
        // Setup and deposit
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(yieldAgent), type(uint256).max);
        vm.stopPrank();

        vm.prank(executor);
        yieldAgent.executeDeposit(user, strategyId);

        // Fast forward 1 day
        vm.warp(block.timestamp + 1 days);

        // Harvest
        vm.startPrank(user);

        yieldAgent.harvestYield(strategyId);

        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertGt(strategy.totalYieldEarned, 0);

        vm.stopPrank();
    }

    function testCannotHarvestTooSoon() public {
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        vm.expectRevert("Too soon to harvest");
        yieldAgent.harvestYield(strategyId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAWAL TESTS
    //////////////////////////////////////////////////////////////*/

    function testWithdrawFromStrategy() public {
        // Setup and deposit
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(yieldAgent), type(uint256).max);
        vm.stopPrank();

        vm.prank(executor);
        yieldAgent.executeDeposit(user, strategyId);

        // Withdraw
        vm.startPrank(user);

        uint256 withdrawAmount = 100 * 10**6;
        uint256 userUsdcBefore = usdc.balanceOf(user);

        vm.expectEmit(true, true, false, true);
        emit FundsWithdrawn(user, strategyId, withdrawAmount);

        yieldAgent.withdrawFromStrategy(strategyId, withdrawAmount);

        uint256 userUsdcAfter = usdc.balanceOf(user);

        // Verify USDC was withdrawn
        assertEq(userUsdcAfter - userUsdcBefore, withdrawAmount);

        // Verify strategy state updated
        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertEq(strategy.currentDeposited, TARGET_ALLOCATION - withdrawAmount);

        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanDeposited() public {
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        vm.expectRevert("Insufficient balance");
        yieldAgent.withdrawFromStrategy(strategyId, 100 * 10**6);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        DEACTIVATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testDeactivateStrategy() public {
        vm.startPrank(user);

        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        vm.expectEmit(true, true, false, false);
        emit StrategyDeactivated(user, strategyId);

        yieldAgent.deactivateStrategy(strategyId);

        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertFalse(strategy.active);

        vm.stopPrank();
    }

    function testCannotDeactivateWithFunds() public {
        // Setup and deposit
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(yieldAgent), type(uint256).max);
        vm.stopPrank();

        vm.prank(executor);
        yieldAgent.executeDeposit(user, strategyId);

        // Try to deactivate
        vm.startPrank(user);

        vm.expectRevert("Must withdraw all funds first");
        yieldAgent.deactivateStrategy(strategyId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCanDeposit() public {
        vm.startPrank(user);
        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            TARGET_ALLOCATION
        );

        // Cannot deposit without permission
        assertFalse(yieldAgent.canDeposit(user, strategyId));

        // Can deposit with permission
        masterAgent.delegateToAgent(address(yieldAgent), DAILY_LIMIT, 30 days);
        assertTrue(yieldAgent.canDeposit(user, strategyId));

        vm.stopPrank();
    }

    // Commented out due to getUserAccountData being removed from contract (stack-too-deep issue)
    // function testGetUserAccountData() public {
    //     YieldAgent.UserAccountData memory accountData = yieldAgent.getUserAccountData(user);
    //     assertEq(accountData.totalCollateralBase, 1000e8);
    //     assertEq(accountData.totalDebtBase, 0);
    //     assertEq(accountData.availableBorrowsBase, 800e8);
    //     assertEq(accountData.healthFactor, type(uint256).max);
    // }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzzStrategyCreation(uint256 allocation) public {
        vm.assume(allocation > 0 && allocation < type(uint128).max);

        vm.startPrank(user);

        uint256 strategyId = yieldAgent.createYieldStrategy(
            address(usdc),
            address(aUsdc),
            YieldAgent.StrategyType.AAVE_SUPPLY,
            allocation
        );

        YieldAgent.YieldStrategy memory strategy = yieldAgent.getStrategy(user, strategyId);
        assertEq(strategy.targetAllocation, allocation);

        vm.stopPrank();
    }
}
