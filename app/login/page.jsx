"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import usersData from "@/lib/data/users.json";

export default function ViewerAuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  // Validation
  const [emailTouched, setEmailTouched] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Simulate connection latency
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 1. Search in static users data exported from DB
        let foundUser = usersData.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

        // 2. Search in client-side local users
        if (!foundUser) {
          const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
          foundUser = localUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        }

        if (!foundUser) {
          throw new Error("No user found with this email. Feel free to Join the Gallery by registering!");
        }

        localStorage.removeItem("artist_id");
        localStorage.removeItem("artist_name");
        localStorage.setItem("viewer_id", foundUser.user_id);
        localStorage.setItem("viewer_name", foundUser.name);
        localStorage.setItem("is_admin", foundUser.role === "admin" ? "true" : "false");

        window.location.href = "/";
      } else {
        if (!name.trim()) { throw new Error("Name is required"); }
        if (!username.trim()) { throw new Error("Username is required"); }
        if (username.length < 3) { throw new Error("Username must be at least 3 characters"); }

        // Simulate connection latency
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Check if user already exists
        const emailExistsStatic = usersData.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
        const emailExistsLocal = localUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());

        if (emailExistsStatic || emailExistsLocal) {
          throw new Error("Email already registered. Please sign in!");
        }

        const newUser = {
          user_id: Date.now(),
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role: "user"
        };

        localUsers.push(newUser);
        localStorage.setItem("local_users", JSON.stringify(localUsers));

        alert("Welcome to the gallery! Registration successful. Please sign in now.");
        setIsLogin(true);
        setName("");
        setUsername("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50 flex items-center justify-center p-6 pt-28">
      <div className="w-full max-w-xl glass p-10 rounded-2xl animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-display text-center mb-2">
          {isLogin ? "Sign In" : "Join the Gallery"}
        </h1>
        <p className="text-center text-gray-400 mb-8">
          {isLogin ? "Welcome back. Log in to interact with artists." : "Create a collection, leave reviews, and support creators."}
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-xl mb-6 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2.5 outline-none transition-colors"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">USERNAME *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2.5 outline-none transition-colors"
                  placeholder="jane_doe"
                  pattern="[a-z0-9_.]{3,30}"
                  title="3-30 chars. Only lowercase letters, numbers, _ and . allowed."
                />
                <p className="text-xs text-gray-600 mt-1">Lowercase letters, numbers, _ and . only · 3-30 chars</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">EMAIL ADDRESS *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className={`w-full bg-transparent border-b p-2.5 outline-none transition-colors ${
                emailTouched && !isEmailValid && email ? "border-red-500" : "border-gray-600 focus:border-amber-50"
              }`}
              placeholder="viewer@example.com"
            />
            {emailTouched && !isEmailValid && email && (
              <p className="text-xs text-red-400 mt-1">Please enter a valid email address</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 py-4 bg-amber-50 text-black text-lg font-display font-bold uppercase tracking-widest hover:bg-white transition-colors rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                Processing...
              </>
            ) : (
              isLogin ? "Enter Gallery" : "Create Account"
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-800">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setEmailTouched(false);
            }}
            className="text-gray-400 hover:text-amber-50 text-sm tracking-widest transition-colors font-display mb-4 block w-full"
          >
            {isLogin
              ? "NEW HERE? CREATE AN ACCOUNT"
              : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
          </button>

          <button
            onClick={() => router.push("/auth")}
            className="text-amber-400/50 hover:text-amber-400 text-xs tracking-widest transition-colors uppercase"
          >
            Are you a Creator? Go to Artist Portal
          </button>
        </div>
      </div>
    </div>
  );
}
