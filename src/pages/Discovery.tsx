import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Eye, Trash2 } from "lucide-react";

const API = "http://127.0.0.1:8000"; // must match backend port

export default function Discovery() {
  const [rfps, setRfps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();

  // -----------------------------
  // Fetch RFPS
  // -----------------------------
  const fetchRFPs = async () => {
    const res = await fetch(`${API}/rfps`);
    const data = await res.json();
    setRfps(data);
    return data.length;
  };

  // -----------------------------
  // Run Sales Agent + Poll
  // -----------------------------
  const runSalesAgent = async () => {
    setIsRunning(true);
    setRfps([]);

    await fetch(`${API}/run`, { method: "POST" });

    const poll = setInterval(async () => {
      const count = await fetchRFPs();

      if (count > 0) {
        clearInterval(poll);
        setIsRunning(false);
      }
    }, 1500);
  };

  // -----------------------------
  // Clear RFPS
  // -----------------------------
  const deleteAllRFPs = async () => {
    if (!confirm("Delete all discovered RFPs?")) return;
    await fetch(`${API}/rfps`, { method: "DELETE" });
    setRfps([]);
  };

  useEffect(() => {
    fetchRFPs();
  }, []);

  // -----------------------------
  // Filter
  // -----------------------------
  const filtered = rfps.filter(
    (r) =>
      r.rfp_title?.toLowerCase().includes(search.toLowerCase()) ||
      r.buyer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout title="RFP Discovery">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 gap-2">
        <Input
          placeholder="Search RFPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-1/3"
        />

        <div className="flex gap-2">
          <Button variant="destructive" onClick={deleteAllRFPs}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>

          <Button onClick={runSalesAgent} disabled={isRunning}>
            {isRunning ? "Discovering RFPs..." : "Run Sales Agent"}
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Est. Value</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((rfp) => (
              <TableRow key={rfp.rfp_id}>
                <TableCell className="font-mono">
                  {rfp.rfp_id}
                </TableCell>

                <TableCell>{rfp.rfp_title}</TableCell>

                <TableCell>{rfp.submission_deadline}</TableCell>

                <TableCell>{rfp.estimated_project_value}</TableCell>

                {/* PRIORITY */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      rfp.priority === "High" || rfp.priority === "Critical"
                        ? "border-red-500 text-red-500"
                        : "border-yellow-500 text-yellow-500"
                    }
                  >
                    {rfp.priority}
                  </Badge>
                </TableCell>

                {/* STATUS */}
                <TableCell>
                  <Badge variant="secondary">{rfp.status}</Badge>
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
  navigate(`/rfp/${encodeURIComponent(rfp.rfp_id)}`)


}

                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isRunning && rfps.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            No RFPs discovered yet
          </p>
        )}
      </div>
    </MainLayout>
  );
}
