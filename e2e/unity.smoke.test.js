/* eslint-env detox/detox, jest */

describe('Unity bridge smoke', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it.skip('navigates to UnityTestScene and confirms UI loads', async () => {
    // TODO: add navigation testIDs or a deep link to reach UnityTestScene.
    // Expect Unity AR screen content once routing is wired for E2E.
    await expect(element(by.text('Unity AR Test'))).toBeVisible();
  });
});
