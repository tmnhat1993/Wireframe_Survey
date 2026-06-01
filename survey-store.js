(function () {
const STORAGE_KEY = "survey-app-responses";
const FIREBASE_SDK_VERSION = "10.12.5";
const FIREBASE_CONFIG = window.SURVEY_FIREBASE_CONFIG;

let firebaseClientPromise;

function hasFirebaseConfig() {
  return Boolean(
    FIREBASE_CONFIG.enabled &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.authDomain &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.appId
  );
}

function readLocalResponses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalResponses(responses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getFirebaseClient() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!firebaseClientPromise) {
    firebaseClientPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`)
    ]).then(([appModule, firestoreModule, authModule]) => {
      const app = appModule.initializeApp(FIREBASE_CONFIG);
      const db = firestoreModule.getFirestore(app);
      const auth = authModule.getAuth(app);

      return { app, db, auth, firestoreModule, authModule };
    });
  }

  return firebaseClientPromise;
}

async function saveSurveyResponse(payload) {
  const firebaseClient = await getFirebaseClient();

  if (firebaseClient) {
    const { db, firestoreModule } = firebaseClient;
    const docRef = await firestoreModule.addDoc(firestoreModule.collection(db, "surveyResponses"), {
      ...payload,
      createdAt: firestoreModule.serverTimestamp()
    });

    return { id: docRef.id, provider: "firebase" };
  }

  const responses = readLocalResponses();
  const localRecord = {
    ...payload,
    id: createId(),
    createdAt: new Date().toISOString()
  };
  responses.push(localRecord);
  writeLocalResponses(responses);

  return { id: localRecord.id, provider: "local" };
}

async function listSurveyResponses() {
  const firebaseClient = await getFirebaseClient();

  if (firebaseClient) {
    const { db, firestoreModule } = firebaseClient;
    const querySnapshot = await firestoreModule.getDocs(
      firestoreModule.query(
        firestoreModule.collection(db, "surveyResponses"),
        firestoreModule.orderBy("createdAt", "desc")
      )
    );

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;

      return { id: doc.id, ...data, createdAt };
    });
  }

  return readLocalResponses().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function signInAdmin(adminId, password) {
  const firebaseClient = await getFirebaseClient();

  if (!firebaseClient) {
    return null;
  }

  const email = adminId.includes("@") ? adminId : `${adminId}@admin.local`;
  await firebaseClient.authModule.signInWithEmailAndPassword(firebaseClient.auth, email, password);
  return firebaseClient.auth.currentUser;
}

function getStoreMode() {
  return hasFirebaseConfig() ? "firebase" : "local";
}

window.SurveyStore = {
  getStoreMode,
  listSurveyResponses,
  saveSurveyResponse,
  signInAdmin
};
})();
