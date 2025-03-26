"use client";

import { signInWithPopup, User } from "firebase/auth";
import { auth, googleProvider } from "@/config/firebaseConfig";
import { useState } from "react";

const SignIn = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      console.log("User info:", result.user);
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {user ? (
        <div>
          <p>Hoşgeldin, {user.displayName}</p>
          {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full" />}
        </div>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Google İle Giriş Yap
        </button>
      )}
    </div>
  );
};

export default SignIn;
