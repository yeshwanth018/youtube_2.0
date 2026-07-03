import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import { useTheme } from "./ThemeContext";

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
    if (handlegooglesignin.inProgress) return;
    handlegooglesignin.inProgress = true;
    try {
      // Blur the active element (Sign in button) so that pressing Enter
      // on prompts/alerts does not trigger the click event again.
      if (typeof document !== "undefined" && document.activeElement) {
        document.activeElement.blur();
      }

      // 1. Prompt for Email
      const emailInput = window.prompt(
        "Enter email to sign in:",
        "developer@example.com"
      );
      if (!emailInput) return;
      const email = emailInput.trim();

      const username = email.split("@")[0];
      const displayName = username.charAt(0).toUpperCase() + username.slice(1) + " User";

      const payload = {
        email,
        name: displayName,
        image: "https://github.com/shadcn.png"
      };

      // 2. Call initiate-login endpoint
      let initResponse = await axiosInstance.post("/user/initiate-login", payload);

      // If the backend indicates a phone number is required
      if (initResponse.data.requirePhone) {
        const phoneInput = window.prompt(
          "A phone number is required to send the SMS OTP for your region. Please enter your mobile number:",
          "+919876543210"
        );
        if (!phoneInput) return;

        // Re-call initiate-login with the phone number
        payload.phone = phoneInput.trim();
        initResponse = await axiosInstance.post("/user/initiate-login", payload);
      }

      const { channel, destination, isSouthIndia, region } = initResponse.data;



      // 3. Prompt for 6-digit OTP
      const otpInput = window.prompt(
        `Enter the 6-digit OTP code to verify:\n(Sent via ${channel.toUpperCase()} to ${destination} - Region: ${region || "Unknown"})`
      );
      if (!otpInput) return;
      const otp = otpInput.trim();

      // 4. Call verify-otp endpoint
      const verifyResponse = await axiosInstance.post("/user/verify-otp", {
        email,
        otp,
      });

      if (verifyResponse.data.result) {
        login(verifyResponse.data.result, verifyResponse.data.isSouthIndia);
        alert("✨ Sign in successful!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please check your OTP and try again.");
    } finally {
      handlegooglesignin.inProgress = false;
    }
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
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

