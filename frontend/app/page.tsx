import { redirect } from "next/navigation";

/** Landing route — same entry as Streamlit dashboard list tab. */
export default function Home() {
  redirect("/invoices");
}
