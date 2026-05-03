"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function getFirebase() {
  if (typeof window === "undefined") {
    return { app: undefined, auth: undefined, db: undefined, storage: undefined };
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return { app, auth, db, storage };
}

export function getClientAuth(): Auth {
  const { auth } = getFirebase();
  if (!auth) throw new Error("Firebase Auth chỉ khả dụng phía trình duyệt");
  return auth;
}

export function getClientDb(): Firestore {
  const { db } = getFirebase();
  if (!db) throw new Error("Firestore chỉ khả dụng phía trình duyệt");
  return db;
}

export function getClientStorage(): FirebaseStorage {
  const { storage } = getFirebase();
  if (!storage) throw new Error("Storage chỉ khả dụng phía trình duyệt");
  return storage;
}

function makeProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Detect environments where popup-based sign-in is unreliable: Cloud Shell
 * Web Preview, embedded webviews, and contexts where the page is loaded in
 * an iframe (cross-origin postMessage from the OAuth popup is blocked).
 */
function shouldUseRedirect() {
  if (typeof window === "undefined") return false;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  return /cloudshell\.dev$|webcontainer|stackblitz/i.test(host);
}

export async function signInWithGoogle(): Promise<User | null> {
  const auth = getClientAuth();
  const provider = makeProvider();

  if (shouldUseRedirect()) {
    await signInWithRedirect(auth, provider);
    return null; // page navigates away; result handled by consumeRedirect()
  }

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

/**
 * Call once on app boot to surface any pending redirect-based sign-in result
 * and any error so the UI can display it.
 */
export async function consumeRedirect(): Promise<User | null> {
  try {
    const auth = getClientAuth();
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export async function signOut() {
  const auth = getClientAuth();
  await fbSignOut(auth);
}

export { onAuthStateChanged };
