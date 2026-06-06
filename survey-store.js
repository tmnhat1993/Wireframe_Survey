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
    const responseCollection = firestoreModule.collection(db, "surveyResponses");
    const firebaseRecord = {
      ...payload,
      createdAt: firestoreModule.serverTimestamp()
    };

    const docRef = await firestoreModule.addDoc(responseCollection, firebaseRecord);

    return { id: docRef.id, provider: "firebase", mode: "create" };
  }

  const responses = readLocalResponses();
  const localRecord = {
    ...payload,
    id: createId(),
    createdAt: new Date().toISOString()
  };

  responses.push(localRecord);
  writeLocalResponses(responses);

  return { id: localRecord.id, provider: "local", mode: "create" };
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
    throw new Error("Firebase chưa được cấu hình.");
  }

  const email = adminId.includes("@") ? adminId : `${adminId}@admin.local`;
  await firebaseClient.authModule.signInWithEmailAndPassword(firebaseClient.auth, email, password);
  return firebaseClient.auth.currentUser;
}

async function waitForAuthReady() {
  const firebaseClient = await getFirebaseClient();

  if (!firebaseClient) {
    return null;
  }

  if (firebaseClient.auth.currentUser) {
    return firebaseClient.auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = firebaseClient.authModule.onAuthStateChanged(firebaseClient.auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function getCurrentAdminUser() {
  return waitForAuthReady();
}

async function signOutAdmin() {
  const firebaseClient = await getFirebaseClient();

  if (!firebaseClient) {
    return;
  }

  await firebaseClient.authModule.signOut(firebaseClient.auth);
}

async function deleteAllSurveyResponses() {
  const firebaseClient = await getFirebaseClient();

  if (firebaseClient) {
    const { db, firestoreModule } = firebaseClient;
    const snapshot = await firestoreModule.getDocs(firestoreModule.collection(db, "surveyResponses"));
    const docs = snapshot.docs;

    for (let index = 0; index < docs.length; index += 500) {
      const batch = firestoreModule.writeBatch(db);
      docs.slice(index, index + 500).forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
    }

    return { provider: "firebase", count: docs.length };
  }

  const responses = readLocalResponses();
  const count = responses.length;
  writeLocalResponses([]);

  return { provider: "local", count };
}

function getStoreMode() {
  return hasFirebaseConfig() ? "firebase" : "local";
}

window.SurveyStore = {
  getStoreMode,
  listSurveyResponses,
  saveSurveyResponse,
  signInAdmin,
  signOutAdmin,
  getCurrentAdminUser,
  deleteAllSurveyResponses
};
})();
