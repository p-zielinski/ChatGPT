import { prisma } from "@/db/config";
import ServerError from "@/lib/types";
import { decryptToken, errorHandler } from "@/lib/utils";
import { sign } from "jsonwebtoken";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const c = req.cookies;
    const token = c.get("refreshToken")?.value;
    if (!token) throw new ServerError("Token not provided", 409);
    const { userId } = decryptToken(
        token,
        process.env.JWT_REFRESH_SECRET!
    );
    if(!userId) throw new ServerError("Invalid token provided", 409);
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        value: token,
        userId
      },
    });
    if (!dbToken) throw new ServerError("Invalid token provided", 409);

    const accessToken = sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: "50m",
    });

    return new Response(JSON.stringify({ message: "success" }), {
      status: 200,
      headers: {
        "Set-Cookie": `accessToken=${accessToken};Secure;HttpOnly;path=/`,
      },
    });
  } catch (err) {
    return errorHandler(err);
  }
}
