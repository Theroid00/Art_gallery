"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Query users table for the email and role='artist'
        const { data: foundUsers, error: errQuery } = await supabase
          .from("users")
          .select("*")
          .eq("email", email.trim().toLowerCase())
          .eq("role", "artist");

        if (errQuery) throw errQuery;

        const foundUser = foundUsers?.[0];
        if (!foundUser) {
          throw new Error("No artist account found with this email. Please join as an artist!");
        }

        // Verify password
        if (foundUser.password_hash !== password.trim()) {
          throw new Error("Incorrect password. Please try again.");
        }

        // Fetch associated artist profile
        const { data: artistProfiles, error: errArtist } = await supabase
          .from("artists")
          .select("artist_id, name, slug")
          .eq("user_id", foundUser.user_id);

        if (errArtist) throw errArtist;
        const artistProfile = artistProfiles?.[0];
        if (!artistProfile) {
          throw new Error("Artist profile not found. Please contact administration.");
        }

        localStorage.removeItem("viewer_id");
        localStorage.removeItem("viewer_name");
        localStorage.removeItem("is_admin");
        localStorage.setItem("artist_id", artistProfile.artist_id);
        localStorage.setItem("artist_name", artistProfile.name);

        router.push("/dashboard");
      } else {
        if (!name.trim()) throw new Error("Name is required");
        if (!username.trim()) throw new Error("Username is required");
        if (username.length < 3) throw new Error("Username must be at least 3 characters");
        if (password.length < 4) throw new Error("Password must be at least 4 characters");
        if (!biography.trim()) throw new Error("Biography is required");
        if (fileError) throw new Error(fileError);

        // Check if email already exists
        const { data: existingEmails, error: errEmail } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", email.trim().toLowerCase());

        if (errEmail) throw errEmail;
        if (existingEmails && existingEmails.length > 0) {
          throw new Error("Email already registered. Please sign in!");
        }

        // Check if username already exists
        const { data: existingUsernames, error: errUser } = await supabase
          .from("users")
          .select("user_id")
          .eq("username", username.trim().toLowerCase());

        if (errUser) throw errUser;
        if (existingUsernames && existingUsernames.length > 0) {
          throw new Error("Username already taken. Please choose another!");
        }

        // 1. Upload Profile Image if provided
        let uploadedImageUrl = "/artists/leonardo.jpg"; // Premium default placeholder
        if (profileFile) {
          try {
            const fileExt = profileFile.name.split(".").pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("gallery")
              .upload(filePath, profileFile, {
                cacheControl: "3600",
                upsert: true,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from("gallery")
              .getPublicUrl(filePath);

            uploadedImageUrl = publicUrl;
          } catch (uploadErr) {
            console.error("Storage upload failed, falling back to default:", uploadErr);
          }
        }

        // 2. Insert into users table
        const { data: userData, error: errInsertUser } = await supabase
          .from("users")
          .insert({
            name: name.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password_hash: password.trim(),
            role: "artist",
          })
          .select("user_id")
          .single();

        if (errInsertUser) throw errInsertUser;

        // 3. Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

        // 4. Insert into artists table
        const { error: errInsertArtist } = await supabase.from("artists").insert({
          user_id: userData.user_id,
          name: name.trim(),
          slug: slug,
          biography: biography.trim(),
          country: country.trim(),
          profile_image: uploadedImageUrl,
        });

        if (errInsertArtist) throw errInsertArtist;

        alert("Registered successfully as an artist! Please sign in now.");
        setIsLogin(true);
        setName("");
        setUsername("");
        setPassword("");
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

          <div>
            <label className="block text-xs font-medium mb-1 tracking-wider text-gray-400">PASSWORD *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-gray-600 focus:border-amber-50 p-2.5 outline-none transition-colors"
              placeholder="••••••••"
              minLength={4}
            />
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

