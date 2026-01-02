export const getAuth = jest.fn(() => ({}));
export const GoogleAuthProvider = jest.fn();
export const signInWithPopup = jest.fn(() => Promise.resolve({ user: {} }));
export const signOut = jest.fn(() => Promise.resolve());
export const onAuthStateChanged = jest.fn((auth, callback) => {
  callback(null);
  return jest.fn(); // unsubscribe function
});
