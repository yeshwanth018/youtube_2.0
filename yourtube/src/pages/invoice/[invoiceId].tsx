import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

export default function InvoicePage() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return;
    
    // Attempt to fetch from /payment/invoice/:id/html
    axiosInstance
      .get(`/payment/invoice/${invoiceId}/html`)
      .then((res) => {
        setHtml(res.data);
      })
      .catch((err) => {
        console.error("Failed to load invoice:", err);
        setError("Invoice not found or failed to load.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 font-medium">
        Loading invoice receipt...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-red-500 mb-2">Error Loading Receipt</h1>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  return <div className="min-h-screen bg-[#f1f5f9]" dangerouslySetInnerHTML={{ __html: html }} />;
}
