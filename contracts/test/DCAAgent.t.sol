// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DCAAgent.sol";
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
 * @title MockSwapRouter
 * @notice Mock Uniswap V3 router for testing
 */
contract MockSwapRouter {
    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        // Simple mock: return 90% of input (simulating swap with slippage)
        amountOut = (params.amountIn * 90) / 100;

        // Transfer input token from sender
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        // Transfer output token to recipient
        MockERC20(params.tokenOut).mint(params.recipient, amountOut);

        return amountOut;
    }
}

/**
 * @title DCAAgentTest
 * @notice Comprehensive tests for DCAAgent contract
 */
contract DCAAgentTest is Test {
    DCAAgent public dcaAgent;
    MasterAgent public masterAgent;
    MockSwapRouter public swapRouter;
    MockERC20 public usdc;
    MockERC20 public weth;

    address public owner = address(1);
    address public user = address(2);
    address public executor = address(3);

    uint256 constant DAILY_LIMIT = 1000 * 10**6; // 1000 USDC
    uint256 constant AMOUNT_PER_PURCHASE = 100 * 10**6; // 100 USDC
    uint256 constant INTERVAL = 1 days;
    uint24 constant POOL_FEE = 3000; // 0.3%
    uint256 constant SLIPPAGE_BPS = 50; // 0.5%

    event DCAScheduleCreated(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountPerPurchase,
        uint256 intervalSeconds,
        uint24 poolFee
    );
    event DCAExecuted(
        address indexed user,
        uint256 indexed scheduleId,
        uint256 amountSpent,
        uint256 amountReceived
    );
    event DCAScheduleCancelled(address indexed user, uint256 indexed scheduleId);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        weth = new MockERC20("WETH", "WETH", 18);

        // Deploy mock router
        swapRouter = new MockSwapRouter();

        // Deploy contracts
        masterAgent = new MasterAgent();
        dcaAgent = new DCAAgent(address(masterAgent), address(swapRouter));

        // Register DCA agent
        masterAgent.registerAgent(address(dcaAgent), "DCA");

        vm.stopPrank();

        // Fund user
        usdc.mint(user, 10000 * 10**6); // 10k USDC
    }

    /*//////////////////////////////////////////////////////////////
                        SCHEDULE CREATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCreateDCASchedule() public {
        vm.startPrank(user);

        vm.expectEmit(true, true, false, true);
        emit DCAScheduleCreated(user, 0, AMOUNT_PER_PURCHASE, INTERVAL, POOL_FEE);

        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        assertEq(scheduleId, 0);
        assertEq(dcaAgent.getUserScheduleCount(user), 1);

        DCAAgent.DCASchedule memory schedule = dcaAgent.getSchedule(user, scheduleId);
        assertEq(schedule.user, user);
        assertEq(schedule.inputToken, address(usdc));
        assertEq(schedule.outputToken, address(weth));
        assertEq(schedule.amountPerPurchase, AMOUNT_PER_PURCHASE);
        assertEq(schedule.intervalSeconds, INTERVAL);
        assertEq(schedule.poolFee, POOL_FEE);
        assertEq(schedule.slippageBps, SLIPPAGE_BPS);
        assertTrue(schedule.active);

        vm.stopPrank();
    }

    function testCannotCreateScheduleWithInvalidTokens() public {
        vm.startPrank(user);

        vm.expectRevert("Invalid input token");
        dcaAgent.createDCASchedule(
            address(0),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        vm.expectRevert("Invalid output token");
        dcaAgent.createDCASchedule(
            address(usdc),
            address(0),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        vm.stopPrank();
    }

    function testCannotCreateScheduleWithInvalidPoolFee() public {
        vm.startPrank(user);

        vm.expectRevert("Invalid pool fee");
        dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            1000, // Invalid fee
            SLIPPAGE_BPS
        );

        vm.stopPrank();
    }

    function testCannotCreateScheduleWithExcessiveSlippage() public {
        vm.startPrank(user);

        vm.expectRevert("Slippage too high");
        dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            1001 // >10%
        );

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        EXECUTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testExecuteDCA() public {
        // Setup: user creates schedule and delegates permission
        vm.startPrank(user);
        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );
        masterAgent.delegateToAgent(address(dcaAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(masterAgent), type(uint256).max);
        usdc.approve(address(dcaAgent), type(uint256).max);
        vm.stopPrank();

        // Fast forward past interval
        vm.warp(block.timestamp + INTERVAL + 1);

        // Execute DCA
        vm.startPrank(executor);

        uint256 userUsdcBefore = usdc.balanceOf(user);

        dcaAgent.executeDCA(user, scheduleId);

        uint256 userUsdcAfter = usdc.balanceOf(user);

        // Verify USDC was spent
        assertEq(userUsdcBefore - userUsdcAfter, AMOUNT_PER_PURCHASE);

        // Verify WETH was received (90% of input due to mock)
        uint256 expectedWeth = (AMOUNT_PER_PURCHASE * 90) / 100;
        assertGt(weth.balanceOf(user), 0);

        vm.stopPrank();
    }

    function testCannotExecuteTooSoon() public {
        // Warp to realistic timestamp to avoid uint underflow issues
        vm.warp(100000);

        // Setup and execute first time
        vm.startPrank(user);
        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );
        masterAgent.delegateToAgent(address(dcaAgent), DAILY_LIMIT, 30 days);
        usdc.approve(address(masterAgent), type(uint256).max);
        usdc.approve(address(dcaAgent), type(uint256).max);
        vm.stopPrank();

        // Execute first time (should succeed immediately after creation)
        vm.startPrank(executor);
        dcaAgent.executeDCA(user, scheduleId);
        vm.stopPrank();

        // Try to execute again immediately (should fail - too soon)
        vm.startPrank(executor);
        vm.expectRevert("Too soon to execute");
        dcaAgent.executeDCA(user, scheduleId);
        vm.stopPrank();
    }

    function testCannotExecuteInactiveSchedule() public {
        // Setup and cancel
        vm.startPrank(user);
        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );
        dcaAgent.cancelSchedule(scheduleId);
        vm.stopPrank();

        // Try to execute
        vm.warp(block.timestamp + INTERVAL + 1);
        vm.startPrank(executor);

        vm.expectRevert("Schedule not active");
        dcaAgent.executeDCA(user, scheduleId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        CANCEL TESTS
    //////////////////////////////////////////////////////////////*/

    function testCancelSchedule() public {
        vm.startPrank(user);

        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        vm.expectEmit(true, true, false, false);
        emit DCAScheduleCancelled(user, scheduleId);

        dcaAgent.cancelSchedule(scheduleId);

        DCAAgent.DCASchedule memory schedule = dcaAgent.getSchedule(user, scheduleId);
        assertFalse(schedule.active);

        vm.stopPrank();
    }

    function testCannotCancelInactiveSchedule() public {
        vm.startPrank(user);

        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        dcaAgent.cancelSchedule(scheduleId);

        vm.expectRevert("Schedule not active");
        dcaAgent.cancelSchedule(scheduleId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCanExecute() public {
        vm.startPrank(user);
        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );
        vm.stopPrank();

        // Cannot execute immediately
        assertFalse(dcaAgent.canExecute(user, scheduleId));

        // Can execute after interval
        vm.warp(block.timestamp + INTERVAL);
        assertTrue(dcaAgent.canExecute(user, scheduleId));
    }

    function testGetUserScheduleCount() public {
        vm.startPrank(user);

        assertEq(dcaAgent.getUserScheduleCount(user), 0);

        dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        assertEq(dcaAgent.getUserScheduleCount(user), 1);

        dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            AMOUNT_PER_PURCHASE * 2,
            INTERVAL,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        assertEq(dcaAgent.getUserScheduleCount(user), 2);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzzScheduleCreation(uint256 amount, uint256 interval) public {
        vm.assume(amount > 0 && amount < type(uint128).max);
        vm.assume(interval > 0 && interval < 365 days);

        vm.startPrank(user);

        uint256 scheduleId = dcaAgent.createDCASchedule(
            address(usdc),
            address(weth),
            amount,
            interval,
            POOL_FEE,
            SLIPPAGE_BPS
        );

        DCAAgent.DCASchedule memory schedule = dcaAgent.getSchedule(user, scheduleId);
        assertEq(schedule.amountPerPurchase, amount);
        assertEq(schedule.intervalSeconds, interval);

        vm.stopPrank();
    }
}
