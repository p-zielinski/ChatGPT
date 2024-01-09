import { prisma } from "@/db/config";
import { JWTPayload } from "@/lib/types";
import { decryptToken, errorHandler } from "@/lib/utils";
import { sign } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const editSchema = z
  .object({
    apiKey: z.string(),
  })
  .partial()
  .strict();

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = editSchema.parse(body);
    const token = req.cookies.get("accessToken")!.value!;
    const { userId } = decryptToken(token, process.env.JWT_SECRET!);
    const obj = { ...body };
    for (let key in obj) {
      if (obj[key] === undefined || obj[key] === "") {
        delete obj[key];
      }
    }
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...obj,
      },
    });
    const userCopy = {
      ...user,
      apiKey: undefined,
      password: undefined,
    };
    if (!apiKey) {
      return NextResponse.json(userCopy);
    }
    const refreshTokenPrevious = req.cookies.get("refreshToken")!.value!;

    const findToken = await prisma.refreshToken.findFirst({
      where: {
        value: refreshTokenPrevious,
      },
    });
    await prisma.refreshToken.delete({
      where: { id: findToken!.id },
    });

    const payload: JWTPayload = { userId };
    const accessToken = sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "50m",
    });
    const refreshToken = sign(payload, process.env.JWT_REFRESH_SECRET!);
    await prisma.refreshToken.create({
      data: {
        value: refreshToken,
      },
    });
    return new Response(JSON.stringify(userCopy), {
      status: 200,
      headers: {
        "Set-Cookie": `accessToken=${accessToken};Secure;HttpOnly;path=/,refreshToken=${refreshToken};Secure;HttpOnly;path=/`,
      },
    });
  } catch (err) {
    console.log(err);

    return errorHandler(err);
  }
}
