import { prisma } from "@/db/config";
import { errorHandler } from "@/lib/utils";
import { NextRequest } from "next/server";
import { hashSync } from "bcrypt";
import { z } from "zod";
import { sign } from "jsonwebtoken";
import ServerError, { JWTPayload } from "@/lib/types";

const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(60),
    apiKey: z.string(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const { apiKey, email, password } = signupSchema.parse(
      await req.json()
    );
    let user = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (user) throw new ServerError("User already exist", 409);
    user = await prisma.user.create({
      data: {
        apiKey,
        email,
        password: hashSync(password, 10),
      },
    });
    const payload: JWTPayload = { userId: user.id };
    const accessToken = sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "50m",
    });
    const refreshToken = sign(
        payload,
      process.env.JWT_REFRESH_SECRET!
    );
    await prisma.refreshToken.create({
      data: {
        value: refreshToken,
        userId: user.id
      },
    });
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        "Set-Cookie": `accessToken=${accessToken};Secure;HttpOnly;path=/,refreshToken=${refreshToken};Secure;HttpOnly;path=/`,
      },
    });
  } catch (err) {
    return errorHandler(err);
  }
}
