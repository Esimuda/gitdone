import { PRODUCT_NAME } from "@/config/brand";

export function GET() {
  return Response.json({ status: "ok", service: PRODUCT_NAME });
}
