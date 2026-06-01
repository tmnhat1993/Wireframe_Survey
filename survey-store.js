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

function getDedupPhone(payload) {
  return payload.consentGiven && payload.participant?.phone ? payload.participant.phone : "";
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createPhoneDocumentId(phone) {
  if (crypto.subtle) {
    const bytes = new TextEncoder().encode(phone);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return `phone_${toHex(digest)}`;
  }

  return `phone_${phone.replace(/\D/g, "")}`;
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
  const dedupPhone = getDedupPhone(payload);

  if (firebaseClient) {
    const { db, firestoreModule } = firebaseClient;
    const responseCollection = firestoreModule.collection(db, "surveyResponses");
    const firebaseRecord = {
      ...payload,
      createdAt: firestoreModule.serverTimestamp()
    };

    if (dedupPhone) {
      const documentId = await createPhoneDocumentId(dedupPhone);
      const docRef = firestoreModule.doc(responseCollection, documentId);

      await firestoreModule.setDoc(docRef, {
        ...firebaseRecord,
        overwrittenAt: firestoreModule.serverTimestamp()
      });

      return { id: documentId, provider: "firebase", mode: "overwrite" };
    }

    const docRef = await firestoreModule.addDoc(responseCollection, firebaseRecord);

    return { id: docRef.id, provider: "firebase", mode: "create" };
  }

  const responses = readLocalResponses();
  const existingIndex = dedupPhone
    ? responses.findIndex((response) => response.participant?.phone === dedupPhone)
    : -1;
  const localRecord = {
    ...payload,
    id: existingIndex >= 0 ? responses[existingIndex].id : createId(),
    createdAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    responses[existingIndex] = {
      ...localRecord,
      overwrittenAt: new Date().toISOString()
    };
  } else {
    responses.push(localRecord);
  }

  writeLocalResponses(responses);

  return { id: localRecord.id, provider: "local", mode: existingIndex >= 0 ? "overwrite" : "create" };
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
