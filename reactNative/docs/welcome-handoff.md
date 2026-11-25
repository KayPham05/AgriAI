# AGRI-159 - Welcome handoff

S02 is a native, public introduction. It does not restore sessions, fetch account/catalog data, request camera permissions, or infer a leaf condition. Navigation foundations and destination screens are absent from the AGRI-199 code baseline. On 2026-11-24 the user supplied the Figma F02 file and selected its Sổ tay vườn nhà visual direction for this task.

The screen exposes one optional `onNavigate(intent)` boundary for the future navigation owner:

| Intent | Required destination | Context |
|---|---|---|
| `guest-diagnosis` | S11 image-source selection | Guest; selecting the CTA must not request camera permission |
| `login` | S03 login | No session is created by Welcome |
| `catalog` | S26 catalog landing | Public Guest/User navigation |

Without a supplied navigation handler, actions are visibly and accessibly disabled and the screen explains that diagnosis/catalog are being prepared. Do not wire these actions to unmatched routes, fake login, or simulated domain screens. The future root/navigation adapter must provide the callback once real destinations exist.

Apply the [Sổ tay vườn nhà reference](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-2) to Welcome: dark green brand/header and introduction, a full-width rice photograph, large light text, secondary pill CTA and a warm lower action area. The file has no S02 frame: this is a task-specific adaptation, retaining S02 copy and diagnosis/login/catalog intents. Do not introduce Home history fixtures or a five-tab navigator into Welcome.

Use native safe area and one scroll container. The header stays above the scroll body; the system status bar uses light content on green. Text and button labels remain scalable without line limits or fixed text-container heights. Display text uses 38/43, reduced to 32/40 below 360 logical points; content is capped at 640. Native touch controls keep the 48-point minimum. System font fallback remains in use; Manrope is not bundled, so exact font metrics are not claimed. No decorative animation or camera dependency is needed.

The active photo is `assets/welcome-rice-field.png`, downloaded as the original image asset from Figma layer `26:9`, not as a screenshot of the screen. The existing leaf mark is reused with a light tint on the green header. Both assets stay inside mobile, with no temporary Figma URL or web-workspace import at runtime. The previous coffee photo is retained as pre-existing work but is no longer referenced by Welcome. The rice photo is introductory imagery, not an uploaded image or an inference result. Image failure keeps the text and actions intact.

## Acceptance boundaries

- AGRI-159 owns Welcome and its navigation handoff. The user reconfirmed on 2026-11-24 that missing destination screens are dependencies, not authorization to implement those other tasks here. Report handoff checks separately from full-route acceptance; do not replace a blocked dependency with a fake route.
- Component tests can establish correct navigation intents, disabled handoff state, image-error recovery and absence of API calls.
- S02-T1 and S02-T2 require the actual S11/S26 destinations before end-to-end acceptance; callback assertions do not establish those destinations.
- S02-T3 needs device/emulator checks at normal and enlarged system font sizes. A JS renderer does not establish physical text wrapping, scroll reachability or safe-area clearance.
- UI completion, navigation integration and device evidence must be reported separately. No mock is evidence of successful API integration.

The explicit Android emulator layout smoke is [welcome_layout_smoke.py](../tests/e2e/welcome_layout_smoke.py); run it only on a dedicated emulator. It changes and restores display/font settings, checks native accessibility bounds and captures screenshots. It does not supply missing navigation destinations or prove TalkBack/iOS acceptance. Current task evidence is linked from the [AGRI-159 report](../../docs/reports/AGRI-159/README.md).
