import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import { useTheme } from "./ThemeContext";
import AuthDialog from "@/components/AuthDialog";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { updateRegion, clearRegion } = useTheme();

  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const login = (userdata, isSouthIndia) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));

    // Update theme based on region flag from backend
    if (isSouthIndia !== undefined) {
      updateRegion(isSouthIndia);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    clearRegion();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    setIsAuthModalOpen(true);
  };

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
          login(response.data.result, response.data.isSouthIndia);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
      <AuthDialog />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

