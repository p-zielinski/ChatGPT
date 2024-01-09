import { prisma } from "@/db/config";
import ServerError from "@/lib/types";
import {decryptToken, errorHandler} from "@/lib/utils";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const c = req.cookies;
    const token = c.get("refreshToken")?.value;
    if (!token) throw new ServerError("Token not provided", 409);
    const { userId } = decryptToken(
        token,
        process.env.JWT_REFRESH_SECRET!
    );
    if (!userId) throw new ServerError("Token not provided", 409);
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        value: token,
        userId
      },
    });
    if (!dbToken) throw new ServerError("Invalid token provided", 409);
    await prisma.refreshToken.delete({
      where: {
        id: dbToken.id,
      },
    });
    return new Response(
      JSON.stringify({ message: "Logged out user from server" }),
      {
        status: 200,
        headers: {
          "Set-Cookie": `accessToken=;Expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/,refreshToken=;Secure;HttpOnly;Expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`,
        },
      }
    );
  } catch (err) {
    return errorHandler(err);
  }
}
