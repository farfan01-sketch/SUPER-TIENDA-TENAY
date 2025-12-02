import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Config } from "@/lib/models/Config";

async function getOrCreateConfig() {
  let config = await Config.findOne({ singletonKey: "main" }).lean();
  if (!config) {
    const created = await Config.create({
      singletonKey: "main",
      storeName: "Super Tienda Tenay",
      logoPath: "/uploads/logo.png",
      ticketFooter: "Gracias por su compra.",
    });
    config = created.toObject();
  }
  return config;
}

export async function GET() {
  try {
    await connectDB();
    const config = await getOrCreateConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error en GET /api/config:", error);
    return NextResponse.json(
      {
        message: "Error al obtener configuración",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      storeName,
      address,
      phone,
      taxId,
      logoPath,
      ticketFooter,
    } = body as {
      storeName?: string;
      address?: string;
      phone?: string;
      taxId?: string;
      logoPath?: string;
      ticketFooter?: string;
    };

    let config = await Config.findOne({ singletonKey: "main" });
    if (!config) {
      config = new Config({ singletonKey: "main" });
    }

    if (typeof storeName === "string" && storeName.trim()) {
      config.storeName = storeName.trim();
    }
    if (typeof address === "string") {
      config.address = address.trim();
    }
    if (typeof phone === "string") {
      config.phone = phone.trim();
    }
    if (typeof taxId === "string") {
      config.taxId = taxId.trim();
    }
    if (typeof logoPath === "string" && logoPath.trim()) {
      config.logoPath = logoPath.trim();
    }
    if (typeof ticketFooter === "string") {
      config.ticketFooter = ticketFooter;
    }

    await config.save();

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error en PUT /api/config:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar configuración",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
