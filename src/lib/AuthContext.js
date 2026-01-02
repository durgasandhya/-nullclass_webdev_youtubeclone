import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    localStorage.setItem("userProfile", JSON.stringify(userdata)); // For OTP login compatibility
  };
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile"); // Remove OTP user data too
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };
  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);
    } catch (error) {
      console.error(error);
    }
  };
  // Load user from localStorage on mount (for OTP login)
  useEffect(() => {
    const storedUser = localStorage.getItem("userProfile") || localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("Loaded user from localStorage:", userData);
      } catch (error) {
        console.error("Error loading user from localStorage:", error);
      }
    }
  }, []);

  // Firebase authentication listener (for Google Sign-in)
  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error(error);
          logout();
        }
      } else {
        // If Firebase user is null, check localStorage for OTP user
        const storedUser = localStorage.getItem("userProfile") || localStorage.getItem("user");
        if (!storedUser) {
          setUser(null);
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
