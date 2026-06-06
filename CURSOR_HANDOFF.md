# Cursor Handoff Log

Last updated: 2026-06-06

## Project

Static mobile-first survey app for an OMO Sieu Toc / Do Thi activation.

Workspace:

```text
/Users/nhattran/Documents/Quiz
```

Remote:

```text
origin https://github.com/tmnhat1993/Wireframe_Survey.git
```

Current branch:

```text
main
```

Important git state at handoff:

```text
main is ahead of origin/main by local commits; after committing this handoff file, it will be ahead by 13 commits
untracked: screenshots/, screenshots.zip
```

Do not commit `screenshots/` or `screenshots.zip` unless explicitly requested.

## How to Run

The app is static. Current local server used during work:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/admin.html
```

The browser often caches static files, so HTML currently references CSS/JS with version query strings:

```text
styles.css?v=20260606-07
firebase-config.js?v=20260606-07
questions.js?v=20260606-07
survey-store.js?v=20260606-07
app.js?v=20260606-07
```

If styles or JS look stale, bump those query strings.

## Main Files

- `index.html`: participant survey flow.
- `app.js`: participant flow state, validation, routing, answers, submit.
- `questions.js`: survey schema and option labels.
- `styles.css`: all styling.
- `survey-store.js`: Firebase/localStorage persistence.
- `admin.html`: admin page structure.
- `admin.js`: admin login, list, filters, charts, CSV export.
- `firebase-config.js`: Firebase web config and local fallback admin credentials.
- `firestore.rules`: Firestore rules.
- `.firebaserc`, `firebase.json`: Firebase CLI config for project/rules deployment.
- `vercel.json`: static Vercel routing/cache config.

## Current User-Facing Flow

1. Intro screen
   - `main-logo.png`
   - `starter-img.png`
   - image button `btn-start-now.png`
   - click routes to customer information screen.

2. Customer information screen
   - Customer fields:
     - Full name
     - Gender: Nam/Nu
     - Age range: `18-24`, `24-45`, `45+`
     - Consent checkbox
   - If consent is checked, payload stores `fullName`, `gender`, `ageRange`.
   - If consent is not checked, quick confirmation popup is shown. Payload stores anonymous record with only `gender`, `ageRange`; no `fullName`.
   - Debug mode checkbox appears only on desktop, bottom-left. It allows retaking the survey.
   - Completion marker in localStorage blocks retakes unless debug mode is enabled.

3. Quiz screen
   - One question per screen.
   - Must choose an answer before next/submit.
   - Question card layout:
     - `main-logo.png`, width 169px.
     - Title: `Bo cau hoi khao sat`, centered, `#00F1F5`, 30px.
     - Question label holder: `question-label-holder.png`.
     - Label text: `Cau current/total`.
     - Question card border: `2px solid #1007A0`.
     - Question card radius: `29px`.
     - Question card padding: `24px 24px 32px`.
     - Navigation buttons are image buttons:
       - back: `btn-go-back.png`
       - continue: `btn-continue.png`
       - same row, equal width, gap 5px, no background.
   - Bottom decor:
     - `bottom-decor.png` absolute bottom, behind content.
     - bottom illustration centered:
       - Q1: `question-1-bottom-img.png`, width 232px.
       - Q2: `question-2-bottom-img.png`, width 246px.
       - Q3: `question-3-bottom-img.png`, width 230px.
       - Q4: `question-4-bottom-img.png`, width 202px.
       - Q5: `question-5-bottom-img.png`, width 415px.
       - Q6: no bottom image, hidden.

4. Submit screen
   - Saves to Firebase when `window.SURVEY_FIREBASE_CONFIG.enabled === true`.
   - Local demo saves to localStorage when Firebase is disabled.

5. Thank-you screen
   - Shown only after save succeeds.

## Current Survey Schema

`questions.js` has `SURVEY_VERSION = "2.0.0"`.

Questions:

1. `q1`: Ban co dang su dung che do giat nhanh tai nha khong?
   - `A`: Dang su dung che do giat nhanh
   - `B`: Da tung su dung nhung khong phu hop
   - `C`: Chua tung su dung

2. `q2`: Ban danh gia the nao ve do sach cua quan ao sau khi su dung che do giat nhanh 15 phut cung san pham OMO Sieu Toc?
   - `A`: Khong sach
   - `B`: Binh thuong
   - `C`: Rat sach

3. `q3`: Ban danh gia the nao ve mui huong cua san pham OMO Sieu Toc luu lai tren quan ao khong?
   - `A`: Khong thom
   - `B`: Binh thuong
   - `C`: Rat thom

4. `q4`: Ban an tuong gi nhat ve Omo Sieu toc?
   - `A`: Tiet kiem dien, nuoc va thoi gian khi giat nhanh
   - Other textarea: stored as `{ type: "other", text: "..." }`

5. `q5`: Ban se mua OMO Sieu Toc cho lan giat toi cua ban khong?
   - `A`: Chac chan se mua
   - `B`: Se can nhac
   - `C`: Chua co nhu cau

6. `q6`: Ban an tuong dieu gi nhat trong trai nghiem Do Thi x OMO Sieu toc? (Ve san pham, ve trai nghiem)
   - `A`: Hieu nang giat nhanh trong 15 phut
   - `B`: Xem demo giat nhanh thuc te
   - `C`: Trai nghiem Tram giat sieu toc rat moi me
   - Other textarea: stored as `{ type: "other", text: "..." }`

For questions with textarea other:

- If textarea has text, radio choices are cleared.
- If a radio is selected, textarea is cleared.
- Only one answer is stored.

## Data Shape

Consented participant:

```json
{
  "submittedAt": "ISO string",
  "consentGiven": true,
  "anonymous": false,
  "participant": {
    "fullName": "Nguyen Van A",
    "gender": "male",
    "ageRange": "18-24"
  },
  "answers": {
    "q1": "A",
    "q2": "B",
    "q3": "C",
    "q4": "A",
    "q5": "C",
    "q6": {
      "type": "other",
      "text": "..."
    }
  },
  "metadata": {
    "source": "web",
    "version": "2.0.0",
    "storeMode": "firebase",
    "consentTextVersion": "vn-consent-2026-06-01"
  }
}
```

Anonymous participant:

```json
{
  "consentGiven": false,
  "anonymous": true,
  "participant": {
    "gender": "female",
    "ageRange": "24-45"
  }
}
```

## Admin Behavior

Admin page:

```text
/admin.html
```

When Firebase enabled:

- Uses Firebase Auth.
- Admin ID can be email, or non-email ID is transformed to `adminId@admin.local`.
- Reads `surveyResponses` collection.

When Firebase disabled:

- Local fallback:
  - ID: `admin`
  - Password: `admin123`

Admin features:

- Metrics:
  - total participants
  - consent count
  - anonymous count
- Date filters:
  - start date 00:00:00
  - end date 23:59:59.999
- Answer charts:
  - row/bar style.
  - includes `Khac` bucket for textarea questions.
- Participant table:
  - paginated, 10 rows per page.
  - anonymous names display as `An danh`.
  - gender/age still displayed for anonymous responses.
- CSV export:
  - respects active date filter.
  - exports other answers as `Khac: text`.

## Firebase

Current project config in `firebase-config.js`:

```text
projectId: surveydata-fd3b6
authDomain: surveydata-fd3b6.firebaseapp.com
```

Current `firestore.rules`:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /surveyResponses/{responseId} {
      allow create: if true;
      allow update: if true;
      allow read: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

Important: rules have been updated locally, but Firebase CLI could not deploy/delete because local Firebase auth token is invalid.

Attempted command:

```bash
firebase firestore:delete surveyResponses --recursive --project surveydata-fd3b6 --yes
```

Result:

```text
Deletion failed. Errors: Failed to fetch documents to delete >= 3 times.
Debug showed invalid_token / UNAUTHENTICATED.
```

Need user to run:

```bash
firebase login --reauth
firebase deploy --only firestore:rules --project surveydata-fd3b6
firebase firestore:delete surveyResponses --recursive --project surveydata-fd3b6 --yes
```

Or delete `surveyResponses` manually in Firebase Console.

## LocalStorage Keys

```text
survey-app-responses
survey-app-completed-participant
survey-app-debug-mode
survey-app-data-version
```

`app.js` clears local demo responses/completion marker when `survey-app-data-version` does not match `SURVEY_VERSION`.

## Visual Assets

Assets are in:

```text
assets/img/
```

Important active assets:

```text
main-logo.png
starter-img.png
starter-illustration.png
btn-start-now.png
continue-survey.png
btn-go-back.png
btn-continue.png
question-label-holder.png
bottom-decor.png
question-1-bottom-img.png
question-2-bottom-img.png
question-3-bottom-img.png
question-4-bottom-img.png
question-5-bottom-img.png
thankyou-bottom-img.png
loading-img.png
policy-modal-bg.png
anonymous-img-1.png
btn-understand.png
btn-understand-and-continue.png
```

There is no `question-6-bottom-img.png`; Q6 intentionally hides the bottom illustration.

## Recent Commits Not Pushed

Current branch is ahead of `origin/main`. Recent local commits:

```text
741cb6d Adjust quiz label and illustrations
84e0d32 Tune quiz answer layout
2b26849 Redesign quiz question layout
138b547 Adjust gender radio checkmark
61643a0 Center consent checkbox mark
ea6100c Align gender controls in one row
1d59b38 Update OMO survey schema
b5c8b06 Refine customer info controls
eca5584 Add image button interactions
c5bfaa7 Force refreshed global styles
bb85e6c Redesign customer info screen
ef98cbc Add survey intro screen assets
```

Push has not been done after these commits.

## Verification Already Run

Syntax checks repeatedly run:

```bash
node --check app.js
node --check admin.js
node --check survey-store.js
node --check questions.js
```

Browser checks used Playwright from Codex runtime with Google Chrome executable:

```bash
NODE_PATH=/Users/nhattran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/nhattran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ...
```

Verified:

- Intro button routes to customer information screen.
- Customer information validation.
- Anonymous payload stores gender/ageRange only.
- Consent payload stores fullName/gender/ageRange.
- Textarea other answers clear radio and save `{ type: "other", text }`.
- Full 6-question flow reaches thank-you screen.
- Admin local fallback reads/display stats, anonymous table, and `Khac` chart bucket.
- Quiz layout metrics:
  - question label holder `top: -96px`, `left: 32px`.
  - label span `top: 37%`, `right: 7%`, font 17px.
  - question card padding `24px 24px 32px`.
  - bottom image widths per question match requested values.
  - Q6 bottom image hidden.

## Known Pending Items

1. Push local commits to GitHub when user asks:

```bash
git push origin main
```

2. Firebase cleanup/deploy blocked until user reauthenticates Firebase CLI:

```bash
firebase login --reauth
```

3. `screenshots/` and `screenshots.zip` are untracked. They were generated earlier for design handoff and are not part of app code.

4. If the user says style is stale in browser, bump query versions in `index.html` and `admin.html`.

5. If a real `question-6-bottom-img.png` is added later, update `showQuestion()` in `app.js` and CSS width for `[data-question="6"]`; currently Q6 intentionally hides image.
