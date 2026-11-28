# AGRI-161 · Native registration form

2026-11-25 · Implemented alongside AGRI-160 on `AGRI-160-mobile-login` at the user's request.

The [mobile auth screen](../../../reactNative/src/features/auth/screens/LoginScreen.tsx) follows the [web auth form](../../../frontend/src/components/modals/LoginModal.tsx) for its leaf mark, heading, description and Login / Register tabs. It keeps the Figma F02 field, back and primary-button styling from AGRI-160. The native layout is a scrolling panel with safe areas and the keyboard next actions. Registration adds **Họ và tên** and a new-password field. Switching tabs clears password, visibility and errors. No Google, CAPTCHA or recovery controls were added.

Registration uses the existing `POST /api/auth/register` contract. It trims the name, normalizes the email and checks required fields, the 100-character name maximum, the six-character password minimum and the 72-byte UTF-8 password maximum. The client stores only a validated User response in SecureStore and shows account-created confirmation after the write completes. Rejected requests expose a retryable error. The branch does not impose email verification before login, and Home remains part of the AGRI-158 integration.

## Verification

- Component tests reproduced the missing switcher before implementation, then passed 14/14. New cases exercise the real tab switch, cleared password and registration submission.
- Auth adapter tests passed 23/23, including the normalized registration payload, missing name / short password, and an unexpected 202.
- A live integration test against disposable ASP.NET Core and PostgreSQL passed. It created a User, verified the registration token at `GET /api/auth/me`, checked that a bad password leaves storage untouched, verified the token from a subsequent login and revoked both sessions.
- Typecheck, lint, Expo's offline dependency check and Android/iOS bundle exports passed.
- Physical Android smoke passed over USB with Expo Go 58.0.5. The login heading and Register tab rendered, and tapping Register exposed the full-name field. API behavior was verified in the separate live integration test. iOS runtime and GitHub Actions were not run.

## Shared form motion

2026-11-25 · The panel fades and moves up on entry over 320 ms. Switching forms fades and moves the fields up over 380 ms, with the header and tabs held in place. The native driver handles opacity and position, and the screen respects the system Reduce Motion setting. This update adds no dependency.

- The motion-enabled component test failed before implementation because no animation was scheduled. The full component suite then passed 16/16, including form entry, tab changes and the Reduce Motion path.
- The updated build opened over USB on physical Android. Switching in both directions displayed the correct fields. Reduce Motion was tested in the component suite.
- Fresh typecheck, lint, Expo offline dependency validation, and Android/iOS Hermes exports passed.

The later [shared session integration](../AGRI-160/README.md#integrated-navigation-and-startup-restore) opens protected Home for a verified registration response after saving the session.
