# Google Play — Data safety (copy into Console)

Use these answers when filling **App content → Data safety**. Adjust if your release differs.

| Question | Answer |
| --- | --- |
| Does your app collect or share user data? | **Yes** — limited, mostly optional network use |
| Is all data encrypted in transit? | **Yes** (HTTPS to Groq when user enables AI) |
| Can users request data deletion? | **Yes** — uninstall app or clear app storage |
| Account required? | **No** |

### Data types (declare as applicable)

| Type | Collected? | Shared? | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Health & fitness (nutrition, calories) | Stored on device only | No | App functionality | N/A — not transmitted to developer |
| Photos (food) | User selects; may send to Groq | With Groq if user adds API key | App functionality | Yes (manual entry works without AI) |
| User-provided content (food names, profile) | On device | No | App functionality | No |

### Developer does not collect

Plate has **no backend**. The developer does not receive nutrition logs, photos, or API keys. Declare that **you (the developer) do not collect** those types unless you add analytics later.

### Third party

- **Groq** — user-initiated API calls when a key is set; link Groq privacy policy in the form if required.