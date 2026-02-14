import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongoose";
import NodeModel from "@/lib/db/models/Node";
import { INode } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Fetch node with all fields including authConfig (secrets are select: false)
    const node = await NodeModel.findById(params.id)
      .select("+authConfig.username +authConfig.headerName")
      .lean();

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Node not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: node });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();

    // Handle password/token updates
    // If password/token is empty string or not provided, we should probably keep existing
    // But for a simple PUT, usually we replace what's there.
    // Let's check what's sent.

    // If updating authConfig, we need to be careful not to wipe out secrets if they aren't sent
    // But since we can't retrieve them in frontend, the frontend can't send them back.
    // So logic: if frontend sends "", assume "no change".

    const updateData: any = { ...body };

    // Validate dependencies if updating them
    if (updateData.dependencies && Array.isArray(updateData.dependencies)) {
        const isValid = await NodeModel.validateDependencies(
            params.id as any,
            updateData.dependencies
        );

        if (!isValid) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid dependencies: circular reference detected",
                },
                { status: 400 }
            );
        }
    }

    if (updateData.authConfig) {
      // Retrieve existing to merge if needed, or just handle at mongoose level if we can?
      // Easier to just check keys.
      const existingNode = await NodeModel.findById(params.id).select("+authConfig.password +authConfig.token +authConfig.headerValue");

      if (!existingNode) {
        return NextResponse.json({ success: false, error: "Node not found" }, { status: 404 });
      }

      const newAuth = updateData.authConfig;
      const oldAuth = existingNode.authConfig as any || {};

      // Merge secrets if not provided (undefined or null, but not empty string)
      if (newAuth.type === oldAuth.type) {
        if (newAuth.password === undefined && oldAuth.password) {
          newAuth.password = oldAuth.password;
        }
        if (newAuth.token === undefined && oldAuth.token) {
          newAuth.token = oldAuth.token;
        }
        if (newAuth.headerValue === undefined && oldAuth.headerValue) {
          newAuth.headerValue = oldAuth.headerValue;
        }
      }
    }

    const node = await NodeModel.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Node not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: node });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const node = await NodeModel.findByIdAndDelete(params.id);

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Node not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}