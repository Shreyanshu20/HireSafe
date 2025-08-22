import React from "react";
import { useAuth } from "../../context/AuthContext";
import ActivityLog from "./ActivityLog";

function DashBoard() {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Log */}
          <div className="lg:col-span-2">
            <ActivityLog />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashBoard;
