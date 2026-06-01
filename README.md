# Survey App

Static survey app deployable on GitHub Pages.

## Files

- `index.html`: participant survey flow.
- `admin.html`: admin login, response list, answer statistics, CSV/Excel export.
- `firebase-config.js`: Firebase web config and local demo admin fallback.
- `firestore.rules`: sample Firestore rules.

## Local demo

Open `index.html` directly in a browser.

When `firebase-config.js` has `enabled: false`, responses are saved to browser `localStorage`.

Admin demo:

- Admin ID: `admin`
- Password: `admin123`

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore.
3. Enable Firebase Authentication with Email/Password for admin access.
4. Create an admin user in Firebase Auth.
5. Edit `firebase-config.js`:

```js
window.SURVEY_FIREBASE_CONFIG = {
  enabled: true,
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Deploy the rules from `firestore.rules`.

Firebase web config is public by design. Do not store private secrets in this repo. Use Firebase Security Rules to protect reads and writes.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In GitHub:

1. Go to `Settings > Pages`.
2. Set source to `GitHub Actions`.
3. Push to `main` to deploy.

## Data behavior

- If the participant consents, the app stores `fullName` and normalized Vietnamese phone number.
- If a consenting participant submits with a phone number that already exists, the old response is overwritten.
- If the participant does not consent, the app stores an anonymous survey response and does not store personal information.
- The survey only shows success after the response is saved.
- After a browser completes the survey, the app stores a local completion marker and blocks retakes on reload.
- Desktop debug mode can be enabled from the bottom-left checkbox to allow repeated survey testing.
- Admin can view participants, answer counts, and export CSV or Excel-compatible `.xls`.
