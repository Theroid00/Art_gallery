"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [biography, setBiography] = useState("");
  const [country, setCountry] = useState("");
  const [profileFile, setProfileFile] = useState(null);

  // Validation
  const [emailTouched, setEmailTouched] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [fileError, setFileError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (file && file.size > 5 * 1024 * 1024) {
      setFileError("File size must be under 5MB");
      setProfileFile(null);
      return;
    }
    setProfileFile(file);
  };

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
        const res = await fetch("/api/auth/login-artist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to login");
        }

        localStorage.removeItem("viewer_id");
        localStorage.removeItem("viewer_name");
        localStorage.setItem("artist_id", data.artist_id);
        localStorage.setItem("artist_name", data.name);

        router.push("/dashboard");
      } else {
        if (!name.trim()) throw new Error("Name is required");
        if (!username.trim()) throw new Error("Username is required");
        if (username.length < 3) throw new Error("Username must be at least 3 characters");
        if (!biography.trim()) throw new Error("Biography is required");
        if (fileError) throw new Error(fileError);

        // 1. Upload Profile Image if provided
        let uploadedImageUrl = "";
        if (profileFile) {
          const formData = new FormData();
          formData.append("file", profileFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Image upload failed");
          uploadedImageUrl = uploadData.url;
        }

        // 2. Submit Registration Data
        const res = await fetch("/api/auth/register-artist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            biography: biography.trim(),
            country: country.trim(),
            profile_image: uploadedImageUrl,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to register");
        }

        alert("Registered successfully! Please login now.");
        setIsLogin(true);
        setName("");
        setUsername("");
        setBiography("");
        setCountry("");
        setProfileFile(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50 flex items-center justify-center p-6 pt-28 pb-16">
      <div className="w-full max-w-xl glass p-10 rounded-2xl animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-display text-center mb-2">
          {isLogin ? "Artist Portal" : "Join as Artist"}
        </h1>
        <p className="text-center text-gray-400 mb-8">
          {isLogin ? "Welcome back. Access your studio space." : "Showcase your masterpieces to the world."}
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-xl mb-6 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="Leonardo da Vinci"
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
                  placeholder="leonardo_artist"
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
              placeholder="artist@example.com"
            />
            {emailTouched && !isEmailValid && email && (
              <p className="text-xs text-red-400 mt-1">Please enter a valid email address</p>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">COUNTRY</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2.5 outline-none transition-colors"
                  placeholder="Italy"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">PROFILE IMAGE</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2 outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-black hover:file:bg-amber-100"
                />
                {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
                <p className="text-xs text-gray-600 mt-1">Max file size: 5MB</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">
                  BIOGRAPHY *
                  <span className="float-right text-gray-600">{biography.length}/500</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  className="w-full bg-transparent border border-gray-600 focus:border-amber-50 p-2.5 outline-none transition-colors rounded-lg mt-1"
                  placeholder="Tell us about your artistic journey..."
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-4 bg-amber-50 text-black text-lg font-display font-bold uppercase tracking-widest hover:bg-white transition-colors rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                Processing...
              </>
            ) : (
              isLogin ? "Enter Studio" : "Create Profile"
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-800">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setEmailTouched(false);
              setFileError("");
            }}
            className="text-gray-400 hover:text-amber-50 text-sm tracking-widest transition-colors font-display"
          >
            {isLogin
              ? "NEW HERE? REGISTER AS AN ARTIST"
              : "ALREADY REGISTERED? LOG IN"}
          </button>
        </div>
      </div>
    </div>
  );
}
