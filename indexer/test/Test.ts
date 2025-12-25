import assert from "assert";
import {
  TestHelpers,
} from "generated";
const { MockDb, LastMonad } = TestHelpers;

describe("LastMonad contract CreatorRewardClaimed event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for LastMonad contract CreatorRewardClaimed event
  const event = LastMonad.CreatorRewardClaimed.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("LastMonad_CreatorRewardClaimed is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await LastMonad.CreatorRewardClaimed.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualLastMonadCreatorRewardClaimed = mockDbUpdated.entities.LastMonad_CreatorRewardClaimed.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedLastMonadCreatorRewardClaimed: any = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      creator: event.params.creator,
      amount: event.params.amount,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualLastMonadCreatorRewardClaimed, expectedLastMonadCreatorRewardClaimed, "Actual LastMonadCreatorRewardClaimed should be the same as the expectedLastMonadCreatorRewardClaimed");
  });
});
