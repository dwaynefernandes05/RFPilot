import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Building2,
  AlertTriangle,
  ExternalLink,
  Package,
  FileText,
  DollarSign,
  Play,
  Cpu,
  Loader2,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RFPDetails() {

  

  const [rfp, setRfp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

 const { rfpId } = useParams();
const decodedId = decodeURIComponent(rfpId || "");

useEffect(() => {
  if (!decodedId) return;

  setLoading(false);
  console.log("Fetching RFP with ID:", decodedId);
  
  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  fetch(`http://127.0.0.1:8000/rfps/${encodeURIComponent(decodedId)}`, {
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeoutId);
      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      
      const text = await res.text();
      console.log("Raw response:", text);
      
      if (!res.ok) throw new Error(`RFP not found (status: ${res.status})`);
      
      const data = JSON.parse(text);
      console.log("RFP data received:", data);
      
      // Check if error object is returned
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRfp(data);
      setError(null);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      console.error("Fetch error:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      
      if (err.name === 'AbortError') {
        setError("Request timeout - Backend not responding");
      } else if (err.message.includes('Failed to fetch')) {
        setError("Cannot connect to backend at http://127.0.0.1:8000");
      } else {
        setError(err.message);
      }
      
      setRfp(null);
    })
    .finally(() => {
      console.log("Fetch complete, setting loading to false");
      setLoading(false);
    });
}, [decodedId]);





  if (loading) {
    return (
      <MainLayout title="Loading RFP...">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!rfp || rfp.error) {
    return (
      <MainLayout title="RFP Not Found">
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">
            {error || "RFP data not available"}
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg max-w-2xl mx-auto">
              <p className="text-red-500 font-mono text-sm">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Check console for details
              </p>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={rfp.rfp_title}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT MAIN CARD */}
        <motion.div className="lg:col-span-2 card-elevated p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground">
                {decodedId}
              </p>
              <h1 className="text-2xl font-bold mt-1">
                {rfp.rfp_title}
              </h1>
            </div>

            <Button size="icon" variant="ghost" asChild>
              <a href={rfp.tender_source} target="_blank">
                <ExternalLink className="h-5 w-5" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <Info label="Buyer" icon={<Building2 />} value={rfp.buyer} />
            <Info label="Scope Items" icon={<Package />} value={`${rfp.scope_items}`} />
            <Info label="Est. Value" icon={<DollarSign />} value={rfp.estimated_project_value} />
            <Info label="Status" icon={<FileText />} value={rfp.status} />
            <Info label="Days Remaining" icon={<Calendar />} value={`${rfp.days_remaining} days`} />
          </div>
        </motion.div>

        {/* RIGHT DEADLINE BOX */}
        <motion.div className="card-elevated p-6 border-2 border-red-500 bg-red-500/5">
  <div className="flex items-center gap-2 mb-4">
    <AlertTriangle className="h-5 w-5 text-red-500" />
    <h3 className="font-semibold text-red-500">Submission Deadline</h3>
  </div>

  <div className="text-center">
    <p className="text-3xl font-bold text-red-500">
      {rfp.submission_deadline}
    </p>

    <div className="mt-4 flex justify-center">
      <span
        className={`px-4 py-1 rounded-full text-sm font-semibold ${
          rfp.priority === "High"
            ? "bg-red-600 text-white"
            : "bg-yellow-400 text-black"
        }`}
      >
        Priority: {rfp.priority}
      </span>
    </div>
  </div>
</motion.div>

      </div>

      {/* ACTION BAR */}
      <div className="card-elevated p-4 mt-6 flex gap-4">
        <Button
          size="lg"
          onClick={() => {
            setIsAnalyzing(true);
            setTimeout(() => setIsAnalyzing(false), 3000);
          }}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analyzing
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Analyze Full RFP (AI)
            </>
          )}
        </Button>

        <Button variant="outline">
          <Cpu className="h-4 w-4 mr-2" />
          Analyze Technical Specs
        </Button>

        <Button variant="outline">
          <DollarSign className="h-4 w-4 mr-2" />
          Pricing Intelligence
        </Button>
      </div>
    </MainLayout>
  );
}

function Info({ label, value, icon }: any) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}
