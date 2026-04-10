import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const { artwork_id, buyer_name, shipping_address } = await req.json();

        if (!artwork_id) {
            return Response.json({ error: "Artwork ID is required" }, { status: 400 });
        }
        if (!buyer_name || !buyer_name.trim()) {
            return Response.json({ error: "Buyer name is required" }, { status: 400 });
        }
        if (!shipping_address || !shipping_address.trim()) {
            return Response.json({ error: "Shipping address is required" }, { status: 400 });
        }

        // Check if artwork is already sold
        const [artworkRows] = await db.query("SELECT is_sold FROM artworks WHERE artwork_id = ?", [artwork_id]);
        if (artworkRows.length === 0) {
            return Response.json({ error: "Artwork not found" }, { status: 404 });
        }
        if (artworkRows[0].is_sold) {
            return Response.json({ error: "This artwork has already been sold" }, { status: 400 });
        }

        // Mark artwork as sold
        await db.query(
            "UPDATE artworks SET is_sold = true WHERE artwork_id = ?",
            [artwork_id]
        );

        // Record the order
        await db.query(
            "INSERT INTO orders (artwork_id, buyer_name, shipping_address) VALUES (?, ?, ?)",
            [artwork_id, buyer_name.trim(), shipping_address.trim()]
        );

        return Response.json({ message: "Purchase completed successfully! Masterpiece secured." });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
