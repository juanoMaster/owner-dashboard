// Legacy redirect — el tenant "pinilla" migró al slug "el-mirador". No eliminar, hay links viejos circulando.
import { redirect } from "next/navigation"
export default function PinillaPage() {
  redirect("/el-mirador")
}
