# QA Process

## Device matrix
- iOS physical device (latest iOS; dev client installed via Xcode/Expo)
- Android physical device (Android 13+; dev client)
- Optional: iOS Simulator for non-Unity smoke (Unity view disabled on simulator)

## Manual smoke tests
- Auth: Login/logout and onboarding completion
- Feed: Load home feed and open a post detail
- Media: Upload/share flow smoke (pick media, reach confirmation)
- Unity bridge: Open `UnityTestScene`, press the Unity test button, confirm JS log `The button has been tapped!`
- Navigation: Switch tabs and return to Unity screen without crash
- Networking: Run via `npm run tunnel` to validate remote device connectivity
- Unity batchmode: `npm run unity:validate` before device testing

## Secrets & .env
- Ensure `.env` exists locally (copy from `.env.example`)
- Never commit `.env` or share real API keys in logs, screenshots, or builds

## Acceptance criteria
- No crashes during smoke tests
- Unity ↔ React Native messaging confirmed on device
- Jest suite (`npm test`) passes locally and in CI
- Unity scenes in Build Settings match expected set before exports
