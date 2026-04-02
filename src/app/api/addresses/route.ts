import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { z } from "zod";

const AddressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().min(6).max(6),
  isDefault: z.boolean().optional(),
});

// GET - Fetch all saved addresses for user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const addressesRef = collection(db, "addresses");
    const q = query(addressesRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    
    const addresses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// POST - Add new address
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const addressData = AddressSchema.parse(body);

    // If this is the default address, unset all other defaults
    if (addressData.isDefault) {
      const addressesRef = collection(db, "addresses");
      const q = query(
        addressesRef,
        where("userId", "==", userId),
        where("isDefault", "==", true)
      );
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map((doc) =>
        updateDoc(doc.ref, { isDefault: false })
      );
      await Promise.all(updatePromises);
    }

    const addressesRef = collection(db, "addresses");
    const docRef = await addDoc(addressesRef, {
      ...addressData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      address: { id: docRef.id, ...addressData },
    });
  } catch (error) {
    console.error("Error adding address:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid address data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to add address" },
      { status: 500 }
    );
  }
}

// PUT - Update address
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...addressData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Address ID required" },
        { status: 400 }
      );
    }

    const validatedData = AddressSchema.parse(addressData);

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      const addressesRef = collection(db, "addresses");
      const q = query(
        addressesRef,
        where("userId", "==", userId),
        where("isDefault", "==", true)
      );
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs
        .filter((doc) => doc.id !== id)
        .map((doc) => updateDoc(doc.ref, { isDefault: false }));
      await Promise.all(updatePromises);
    }

    const addressRef = doc(db, "addresses", id);
    await updateDoc(addressRef, {
      ...validatedData,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      address: { id, ...validatedData },
    });
  } catch (error) {
    console.error("Error updating address:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid address data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Address ID required" },
        { status: 400 }
      );
    }

    const addressRef = doc(db, "addresses", id);
    await deleteDoc(addressRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
