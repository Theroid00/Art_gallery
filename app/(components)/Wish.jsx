"use client";
import { supabase } from "@/lib/supabase";

export default function Wishlist({artworkId})
{
const handleWishlist=async()=>{
  try{
    const viewer_id = localStorage.getItem("viewer_id");
    if (!viewer_id) {
       alert("Please Sign In to add art to your wishlist.");
       return;
    }
    
    // Check if item is already in wishlist
    const { data: existing, error: errCheck } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", parseInt(viewer_id))
      .eq("artwork_id", artworkId);

    if (errCheck) throw errCheck;

    if (existing && existing.length > 0) {
      alert("This item is already in your wishlist!");
      return;
    }

    // Insert live wishlist record
    const { error: errInsert } = await supabase.from("wishlist").insert({
      user_id: parseInt(viewer_id),
      artwork_id: artworkId,
    });

    if (errInsert) throw errInsert;

    alert("Added to wishlist!");
  } catch (error){
    console.error("Wishlist Error:", error);
    alert("Failed to add to wishlist: " + (error.message || error));
  }
};
   return (
    <button onClick={handleWishlist}
    className="text-2xl z-50 hover:scale-110 transition-transform"
    >
      ❤️
    </button>
   );
}
