# Fix: Google Sign-in on Safari (signInWithRedirect)

## Problem

`signInWithPopup` is blocked by Safari (desktop and iOS), including when the app runs as a PWA home screen shortcut. Sign-in works on Chromium-based browsers (Brave, Chrome) but fails silently on Safari — the page goes blank or nothing happens after clicking "Continue with Google".

## Root Cause

`src/contexts/AuthContext.tsx` calls `signInWithPopup(auth, googleProvider)`. Safari (WebKit) blocks programmatically opened popups in many contexts, especially in PWA mode. The popup either gets blocked or fails to return the auth result.

## Solution

Use `signInWithRedirect` on Safari/WebKit and handle the redirect result with `getRedirectResult` on app load. Keep `signInWithPopup` for Chromium-based browsers (better UX — no page navigation).

### Detection logic

```typescript
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  || (navigator.userAgent.includes('WebKit') && !navigator.userAgent.includes('Chrome'));
```

### Auth flow

- **Chromium**: `signInWithPopup` (current behavior, unchanged)
- **Safari**: `signInWithRedirect` → page navigates away to Google → returns to app → `getRedirectResult` picks up the result on app load

## Files to Modify

- `src/contexts/AuthContext.tsx` — only file to change

## Context References

- `src/contexts/AuthContext.tsx` — current signIn implementation
- `src/lib/firebase.ts` — auth instance

---

## IMPLEMENTATION PLAN

### Task 1: Update AuthContext to use redirect on Safari

**File:** `src/contexts/AuthContext.tsx`

**Changes needed:**

1. Add `getRedirectResult` to imports from `firebase/auth`
2. Add `signInWithRedirect` to imports from `firebase/auth`
3. Add Safari detection helper
4. In the `signIn` function: branch on Safari → use `signInWithRedirect`, else keep `signInWithPopup`
5. Add a `useEffect` on mount that calls `getRedirectResult(auth)` to pick up the result after the redirect returns

**Key implementation:**

```typescript
import {
  // existing imports...
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';

// Safari detection (covers Safari desktop, iOS Safari, iOS PWA)
function isSafariOrWebKit(): boolean {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) ||
    (ua.includes('AppleWebKit') && !ua.includes('Chrome'));
}

// Inside AuthProvider:

// Handle redirect result on app load (for Safari sign-in flow)
useEffect(() => {
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        // User successfully signed in via redirect — auth state listener will update user
        console.log('Redirect sign-in successful:', result.user.email);
      }
    })
    .catch((error) => {
      console.error('Redirect sign-in error:', error);
    });
}, []);

// Updated signIn function:
const signIn = async () => {
  const provider = new GoogleAuthProvider();
  if (isSafariOrWebKit()) {
    await signInWithRedirect(auth, provider);
    // Page will navigate away — no return value here
  } else {
    await signInWithPopup(auth, provider);
  }
};
```

**Notes:**
- `signInWithRedirect` navigates away, so `await` won't return in the normal sense — it triggers navigation. The function just needs to call it.
- `getRedirectResult` is safe to call on every app load (returns `null` if no pending redirect)
- The existing `onAuthStateChanged` listener in AuthContext will automatically update the user state once the redirect result resolves — `getRedirectResult` just needs to be called to process it
- No UI changes needed

---

## Validation Commands

```bash
cd /home/yusuke/.openclaw/workspace/repos/free-lunch
npm run build
npm run lint
```

---

## Manual Validation

1. Open https://free-lunch-85447.web.app in Safari on iPhone
2. Tap "Continue with Google"
3. ✅ Page navigates to Google sign-in (no blank page, no popup)
4. ✅ After authenticating with Google, redirected back to app
5. ✅ User is logged in, dashboard loads
6. Test on Brave/Chrome: ✅ popup flow still works (no regression)

---

## Acceptance Criteria

- [ ] Google Sign-in works on Safari (iOS and desktop)
- [ ] Google Sign-in works on Brave/Chrome (no regression)
- [ ] `npm run build` passes
- [ ] No lint errors
- [ ] Committed, built with correct `.env.local`, deployed

---

## Pre-deploy Checklist

- [ ] `.env.local` exists with correct Firebase config before running `npm run build`
- [ ] `npm run build` succeeds (verify Firebase API key embedded: `grep AIzaSy dist/assets/*.js`)
- [ ] `firebase deploy --only hosting` (or `npm run firebase:deploy`)
