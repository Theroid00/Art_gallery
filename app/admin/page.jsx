"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ users: 0, artists: 0, artworks: 0, totalDonations: 0, reviews: 0 });
  const [adminId, setAdminId] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const viewerId = localStorage.getItem("viewer_id");
    if (!viewerId) { router.push("/login"); return; }
    setAdminId(viewerId);

    async function checkAdminStatus() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("user_id", parseInt(viewerId))
          .single();

        if (error || !data || data.role !== "admin") {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
          loadData();
        }
      } catch (err) {
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [router]);

  const loadData = async () => {
    try {
      // 1. Load users
      const { data: usersData } = await supabase
        .from("users")
        .select("user_id, name, username, email, role, created_at")
        .order("created_at", { ascending: false });

      // 2. Load artworks
      const { data: artworksData } = await supabase
        .from("artworks")
        .select("*");

      // 3. Load artists
      const { data: artistsData } = await supabase
        .from("artists")
        .select("*");

      // 4. Load donations stats
      const { data: donationsData } = await supabase
        .from("donations")
        .select("amount");

      // 5. Load reviews count
      const { count: reviewsCount } = await supabase
        .from("artist_reviews")
        .select("*", { count: "exact", head: true });

      // 6. Load orders
      const { data: ordersRaw } = await supabase
        .from("orders")
        .select(`
          order_id,
          buyer_name,
          shipping_address,
          ordered_at,
          artwork:artworks(
            artwork_id,
            title,
            price,
            image_url,
            artist:artists(name)
          )
        `)
        .order("ordered_at", { ascending: false });

      const uData = usersData || [];
      const aData = artworksData || [];
      const artData = artistsData || [];
      const ordRaw = ordersRaw || [];

      // Process stats
      const totalDonations = donationsData ? donationsData.reduce((sum, d) => sum + parseFloat(d.amount), 0) : 0;
      const adminUsersCount = uData.filter(u => u.role === "user" || u.role === "admin").length;

      const statsData = {
        users: adminUsersCount,
        artists: artData.length,
        artworks: aData.length,
        totalDonations: totalDonations,
        reviews: reviewsCount || 0,
      };

      // Process formatted artists to merge with users table view
      const formattedArtists = artData.map((artist) => ({
        ...artist,
        role: "artist",
        user_id: artist.artist_id,
        created_at: artist.created_at || new Date().toISOString(),
      }));

      // Create artist name lookup for artworks
      const artistMap = {};
      artData.forEach((a) => {
        artistMap[a.artist_id] = a.name;
      });
      const artworksWithArtist = aData.map((a) => ({
        ...a,
        artist_name: artistMap[a.artist_id] || `Artist #${a.artist_id}`,
      }));

      // Filter out raw artist entries from users table to prevent duplicate visual rows
      const allPeople = [...uData.filter(u => u.role !== "artist"), ...formattedArtists];

      const orders = ordRaw.map((o) => ({
        order_id: o.order_id,
        buyer_name: o.buyer_name,
        shipping_address: o.shipping_address,
        ordered_at: o.ordered_at,
        artwork_id: o.artwork?.artwork_id,
        artwork_title: o.artwork?.title || "Curated Piece",
        price: o.artwork?.price || 0,
        image_url: o.artwork?.image_url || "",
        artist_name: o.artwork?.artist?.name || "Anonymous Artist",
      }));

      setUsers(allPeople);
      setArtworks(artworksWithArtist);
      setStats(statsData);
      setOrders(orders);
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    try {
      // Prevent admin from deleting themselves
      if (parseInt(adminId) === parseInt(userId)) {
        alert("Cannot delete your own admin account.");
        return;
      }

      // Delete dependent records first (wishlist, artist_reviews, donations)
      await supabase.from("wishlist").delete().eq("user_id", userId);
      await supabase.from("artist_reviews").delete().eq("user_id", userId);
      await supabase.from("donations").delete().eq("user_id", userId);

      // If they are an artist, delete their artworks and artist profile too
      const { data: artistRows } = await supabase
        .from("artists")
        .select("artist_id")
        .eq("user_id", userId);

      if (artistRows && artistRows.length > 0) {
        for (const artist of artistRows) {
          await supabase.from("artist_reviews").delete().eq("artist_id", artist.artist_id);
          await supabase.from("donations").delete().eq("artist_id", artist.artist_id);
          await supabase.from("artworks").delete().eq("artist_id", artist.artist_id);
          await supabase.from("artists").delete().eq("artist_id", artist.artist_id);
        }
      }

      const { error: errDel } = await supabase.from("users").delete().eq("user_id", userId);
      if (errDel) throw errDel;

      setUsers(users.filter((u) => u.user_id !== userId));
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const deleteArtwork = async (artworkId) => {
    if (!confirm("Permanently delete this artwork?")) return;
    try {
      // Remove from wishlists first
      await supabase.from("wishlist").delete().eq("artwork_id", artworkId);

      // Delete the artwork
      const { error } = await supabase.from("artworks").delete().eq("artwork_id", artworkId);
      if (error) throw error;

      setArtworks(artworks.filter((a) => a.artwork_id !== artworkId));
    } catch (err) {
      alert("Failed to delete artwork: " + err.message);
    }
  };


  // Filter logic
  const filteredUsers = users.filter(u =>
    !searchQuery ||
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArtworks = artworks.filter(a =>
    !searchQuery ||
    (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.artist_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    (o.buyer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.artwork_title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.artist_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin === null) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="spinner text-amber-50 mx-auto mb-4" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p className="text-gray-400 tracking-widest uppercase text-sm">Verifying access...</p>
      </div>
    </div>
  );

  if (isAdmin === false) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="text-6xl mb-2">🔒</div>
      <h1 className="text-4xl font-display text-red-400">Access Denied</h1>
      <p className="text-gray-400">You do not have admin privileges.</p>
      <Link href="/" className="text-amber-400 underline text-sm tracking-widest uppercase mt-4">Go Home</Link>
    </div>
  );

  const tabs = ["users", "artworks", "orders"];

  return (
    <div className="min-h-screen bg-black text-white pt-28 px-4 sm:px-6 md:px-8 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-white/10 pb-6 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display text-amber-50 mb-1">Admin Panel</h1>
          <p className="text-gray-500 text-sm tracking-wider">Gallery Management Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-10 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {[
            { label: "Users", value: stats.users, color: "text-blue-400" },
            { label: "Artists", value: stats.artists, color: "text-amber-400" },
            { label: "Artworks", value: stats.artworks, color: "text-purple-400" },
            { label: "Donations", value: `₹${stats.totalDonations}`, color: "text-green-400" },
            { label: "Reviews", value: stats.reviews, color: "text-pink-400" },
          ].map(s => (
            <div key={s.label} className="glass p-4 sm:p-5 rounded-2xl text-center hover:border-white/20 transition-colors">
              <p className={`text-2xl sm:text-3xl md:text-4xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-2 tracking-widest uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm uppercase tracking-widest font-bold transition-all ${
                  activeTab === tab
                    ? "bg-amber-50 text-black"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full sm:max-w-xs bg-white/5 border border-white/10 rounded-full px-5 py-2 text-sm text-white outline-none focus:border-amber-50/40 transition-colors placeholder-gray-600"
            />
          </div>
        </div>

        {/* Users Table */}
        {activeTab === "users" && (
          <div className="glass rounded-2xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 uppercase tracking-widest text-xs border-b border-white/10">
                  <tr>
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left hidden md:table-cell">Username</th>
                    <th className="p-4 text-left">Email</th>
                    <th className="p-4 text-left">Role</th>
                    <th className="p-4 text-left hidden md:table-cell">Joined</th>
                    <th className="p-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-600">No users found</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={`${u.role}-${u.user_id}`} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-gray-600">{u.user_id}</td>
                      <td className="p-4 font-medium text-gray-200">{u.name || "—"}</td>
                      <td className="p-4 text-gray-500 hidden md:table-cell">@{u.username || "—"}</td>
                      <td className="p-4 text-gray-400">{u.email || "—"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.role === "admin" ? "bg-red-500/15 text-red-400" :
                          u.role === "artist" ? "bg-amber-500/15 text-amber-400" :
                          "bg-blue-500/15 text-blue-400"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        {u.role !== "admin" && u.role !== "artist" && (
                          <button onClick={() => deleteUser(u.user_id)} className="text-red-400 hover:text-red-300 text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Artworks Table */}
        {activeTab === "artworks" && (
          <div className="glass rounded-2xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 uppercase tracking-widest text-xs border-b border-white/10">
                  <tr>
                    <th className="p-4 text-left">Image</th>
                    <th className="p-4 text-left">Title</th>
                    <th className="p-4 text-left">Artist</th>
                    <th className="p-4 text-left">Price</th>
                    <th className="p-4 text-left hidden md:table-cell">Category</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArtworks.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-600">No artworks found</td></tr>
                  ) : filteredArtworks.map((a) => (
                    <tr key={a.artwork_id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-900">
                          <Image src={a.image_url} alt={a.title} fill className="object-cover" unoptimized />
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-200 max-w-[150px] truncate">{a.title}</td>
                      <td className="p-4 text-amber-400/70">{a.artist_name}</td>
                      <td className="p-4 text-gray-400">₹{Number(a.price).toLocaleString()}</td>
                      <td className="p-4 text-gray-500 hidden md:table-cell">{a.category_id}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.is_sold ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                        }`}>
                          {a.is_sold ? "Sold" : "Available"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => deleteArtwork(a.artwork_id)} className="text-red-400 hover:text-red-300 text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {activeTab === "orders" && (
          <div className="glass rounded-2xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 uppercase tracking-widest text-xs border-b border-white/10">
                  <tr>
                    <th className="p-4 text-left">Order ID</th>
                    <th className="p-4 text-left">Artwork</th>
                    <th className="p-4 text-left hidden sm:table-cell">Artist</th>
                    <th className="p-4 text-left">Buyer</th>
                    <th className="p-4 text-left hidden md:table-cell">Address</th>
                    <th className="p-4 text-left">Price</th>
                    <th className="p-4 text-left hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-600">No orders found</td></tr>
                  ) : filteredOrders.map((o) => (
                    <tr key={o.order_id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-gray-500 font-mono">#{o.order_id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0">
                            <Image src={o.image_url} alt={o.artwork_title} fill className="object-cover" unoptimized />
                          </div>
                          <span className="font-medium text-gray-200 truncate max-w-[120px]">{o.artwork_title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-amber-400/70 hidden sm:table-cell">{o.artist_name}</td>
                      <td className="p-4 text-gray-200">{o.buyer_name}</td>
                      <td className="p-4 text-gray-500 max-w-[200px] truncate hidden md:table-cell">{o.shipping_address}</td>
                      <td className="p-4 text-green-400 font-bold">₹{Number(o.price).toLocaleString()}</td>
                      <td className="p-4 text-gray-600 hidden md:table-cell">{new Date(o.ordered_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Orders summary */}
            {filteredOrders.length > 0 && (
              <div className="border-t border-white/10 p-4 flex justify-between items-center text-sm">
                <span className="text-gray-500">{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</span>
                <span className="text-green-400 font-bold">
                  Total: ₹{filteredOrders.reduce((sum, o) => sum + Number(o.price || 0), 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
