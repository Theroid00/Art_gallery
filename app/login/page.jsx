"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ViewerAuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        const res = await fetch("/api/auth/login-viewer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to login");
        }

        localStorage.removeItem("artist_id");
        localStorage.removeItem("artist_name");
       
        localStorage.setItem("viewer_id", data.user_id);
        localStorage.setItem("viewer_name", data.name);
        localStorage.setItem("is_admin", data.is_admin ? "true" : "false");
        
        window.location.href = "/";
      } else {
        
        const res = await fetch("/api/auth/register-viewer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username, email }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to register");
        }

        alert("Welcome to the gallery! Registration successful. Please sign in now.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50 flex items-center justify-center p-6 pt-32">
      <div className="w-full max-w-xl border border-amber-50/20 bg-black p-10 rounded-2xl shadow-[0_0_40px_rgba(254,243,199,0.05)]">
        <h1 className="text-5xl font-serif text-center mb-2">
          {isLogin ? "Sign In" : "Join the Gallery"}
        </h1>
        <p className="text-center text-gray-400 mb-8">
          {isLogin ? "Welcome back. Log in to interact with artists." : "Create a collection, leave reviews, and support creators."}
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-200 p-4 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
            <div>
              <label className="block text-sm font-medium mb-1 tracking-wider text-gray-400">FULL NAME</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2 outline-none transition-colors"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 tracking-wider text-gray-400">USERNAME</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2 outline-none transition-colors"
                placeholder="jane_doe"
                pattern="[a-z0-9_.]{3,30}"
                title="3-30 chars. Only lowercase letters, numbers, _ and . allowed."
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, _ and . only · 3-30 chars</p>
            </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 tracking-wider text-gray-400">EMAIL ADDRESS</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2 outline-none transition-colors"
              placeholder="viewer@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 py-4 bg-amber-50 text-black text-lg font-serif font-bold uppercase tracking-widest hover:bg-white transition-colors rounded-xl disabled:opacity-50"
          >
            {isLoading ? "Processing..." : (isLogin ? "Enter Gallery" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-800">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-gray-400 hover:text-amber-50 text-sm tracking-widest transition-colors font-serif mb-4 block w-full"
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
