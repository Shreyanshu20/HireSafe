import React, { useState, useMemo } from "react";

const InterviewDashboard = ({ anomalies, userRole }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");

  console.log("📊 Dashboard received anomalies:", anomalies); // Keep this debug

  const getAnomalyInfo = (type) => {
    const anomalyMap = {
      multiple_people: {
        icon: "fa-solid fa-users",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        severity: "critical",
        category: "Security",
        description: "Multiple faces detected",
      },
      candidate_absent: {
        icon: "fa-solid fa-user-slash",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        severity: "critical",
        category: "Presence",
        description: "Candidate not visible",
      },
      no_movement_detected: {
        icon: "fa-solid fa-user-clock",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        severity: "critical",
        category: "Presence",
        description: "No movement detected",
      },
      looking_away_extended: {
        icon: "fa-solid fa-eye-slash",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        severity: "warning",
        category: "Attention",
        description: "Looking away from screen",
      },
      suspicious_head_movement: {
        icon: "fa-solid fa-arrows-alt",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        severity: "warning",
        category: "Behavior",
        description: "Suspicious head movement",
      },
      reading_behavior: {
        icon: "fa-solid fa-book-open",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        severity: "warning",
        category: "Cheating",
        description: "Potential reading behavior",
      },
      eyes_closed_extended: {
        icon: "fa-solid fa-eye-low-vision",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        severity: "moderate",
        category: "Focus",
        description: "Eyes closed too long",
      },
      high_stress_detected: {
        icon: "fa-solid fa-face-dizzy",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        severity: "moderate",
        category: "Wellness",
        description: "High stress detected",
      },
      poor_video_quality: {
        icon: "fa-solid fa-video-slash",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        severity: "technical",
        category: "Quality",
        description: "Poor video quality",
      },
      poor_lighting: {
        icon: "fa-solid fa-lightbulb",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        severity: "technical",
        category: "Setup",
        description: "Poor lighting conditions",
      },
      candidate_too_far: {
        icon: "fa-solid fa-search-minus",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        severity: "technical",
        category: "Setup",
        description: "Too far from camera",
      },
      candidate_too_close: {
        icon: "fa-solid fa-search-plus",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        severity: "technical",
        category: "Setup",
        description: "Too close to camera",
      },
    };

    return anomalyMap[type] || {
      icon: "fa-solid fa-exclamation-triangle",
      color: "text-slate-400",
      bgColor: "bg-slate-500/10",
      borderColor: "border-slate-500/30",
      severity: "technical",
      category: "Other",
      description: type?.replace(/_/g, " ") || "Unknown",
    };
  };

  const processedAnomalies = useMemo(() => {
    if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
      return {
        filtered: [],
        counts: { critical: 0, warning: 0, moderate: 0, technical: 0 },
      };
    }

    const counts = { critical: 0, warning: 0, moderate: 0, technical: 0 };

    const filtered = anomalies
      .map((anomaly) => {
        const info = getAnomalyInfo(anomaly.type);
        counts[info.severity]++;
        return { ...anomaly, info };
      })
      .filter((anomaly) => {
        if (filterSeverity === "all") return true;
        return anomaly.info.severity === filterSeverity;
      })
      .sort((a, b) => {
        // Sort by multiple criteria for better ordering
        // 1. First try rawTimestamp (if available)
        if (a.rawTimestamp && b.rawTimestamp) {
          return b.rawTimestamp - a.rawTimestamp; // Newest first
        }
        
        // 2. Then try id (assuming higher id = newer)
        if (a.id && b.id) {
          return b.id - a.id; // Higher id first
        }
        
        // 3. Finally try timestamp string parsing
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        
        if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB)) {
          return timeB - timeA; // Newest first
        }
        
        // 4. Fallback to array index (reverse order)
        const indexA = anomalies.indexOf(a);
        const indexB = anomalies.indexOf(b);
        return indexB - indexA; // Later added items first
      });

    console.log("🔄 Sorted anomalies:", filtered.map(a => ({ 
      id: a.id, 
      type: a.type, 
      timestamp: a.timestamp, 
      rawTimestamp: a.rawTimestamp 
    })));

    return { filtered, counts };
  }, [anomalies, filterSeverity]);

  if (userRole !== "interviewer") {
    return null;
  }

  return (
    <div className="bg-slate-900/70 backdrop-blur border border-white/10 rounded-xl h-full flex flex-col overflow-hidden">
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 3px;
          transition: all 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
        }
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 rgba(30, 41, 59, 0.3);
        }
      `}</style>

      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-white/10 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-200 text-sm font-medium flex items-center gap-2">
            <i className="fa-solid fa-shield-alt text-blue-400"></i>
            Monitor
          </h3>
          <span className="text-slate-400 text-xs">
            {anomalies?.length || 0} events
          </span>
        </div>
      </div>

      {/* Filter Tabs - Fixed Height */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-white/10 bg-slate-900/30">
        <div className="flex gap-1 text-xs overflow-x-auto">
          {[
            {
              key: "all",
              label: "All",
              count: anomalies?.length || 0
            },
            {
              key: "critical",
              label: "Critical",
              count: processedAnomalies.counts.critical
            },
            {
              key: "warning",
              label: "Warning",
              count: processedAnomalies.counts.warning
            },
            {
              key: "moderate",
              label: "Moderate",
              count: processedAnomalies.counts.moderate
            },
            {
              key: "technical",
              label: "Technical",
              count: processedAnomalies.counts.technical
            }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterSeverity(tab.key)}
              className={`px-2 py-1 rounded transition flex-shrink-0 ${
                filterSeverity === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content Area with Custom Scrollbar */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto px-3 py-2 custom-scrollbar">
          {processedAnomalies.filtered.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-700/50 flex items-center justify-center">
                <i className="fa-solid fa-clipboard-list text-slate-400"></i>
              </div>
              <p className="text-slate-400 text-xs">
                {filterSeverity === "all" ? "No events" : `No ${filterSeverity} events`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {processedAnomalies.filtered.map((anomaly, index) => (
                <div
                  key={anomaly.id || `anomaly-${index}`}
                  className={`${anomaly.info.bgColor} ${anomaly.info.borderColor} rounded-lg border-l-4 p-2.5 transition cursor-pointer hover:bg-opacity-60 ${
                    selectedAnomaly?.id === anomaly.id ? "ring-1 ring-blue-400" : ""
                  } ${index === 0 ? "ring-1 ring-green-400/50" : ""}`} // Highlight newest
                  onClick={() => setSelectedAnomaly(selectedAnomaly?.id === anomaly.id ? null : anomaly)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`${anomaly.info.color} text-sm flex-shrink-0 mt-0.5`}>
                      <i className={anomaly.info.icon}></i>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`${anomaly.info.color} text-xs font-medium capitalize truncate`}>
                          {anomaly.type?.replace(/_/g, " ") || "Unknown"}
                          {index === 0 && <span className="ml-1 text-green-400 text-[8px]">• NEW</span>}
                        </span>
                        <span className={`text-xs font-medium ${anomaly.info.color} ml-2 flex-shrink-0`}>
                          {Math.round((anomaly.confidence || 0) * 100)}%
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs mb-1 leading-tight">
                        {anomaly.info.description}
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 bg-slate-800/30 px-1.5 py-0.5 rounded truncate text-[10px]">
                          {anomaly.info.category}
                        </span>
                        <span className="text-slate-400 text-[10px] ml-2 flex-shrink-0">
                          {anomaly.timestamp}
                        </span>
                      </div>

                      {selectedAnomaly?.id === anomaly.id && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="text-[10px] text-slate-400 space-y-1">
                            <div><strong>Type:</strong> {anomaly.type}</div>
                            <div><strong>Confidence:</strong> {Math.round((anomaly.confidence || 0) * 100)}%</div>
                            <div><strong>Severity:</strong> {anomaly.info.severity}</div>
                            {anomaly.description && (
                              <div><strong>Details:</strong> {anomaly.description}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats - Fixed Height */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-white/10 bg-slate-900/50">
        <div className="grid grid-cols-4 gap-1 text-center">
          <div>
            <div className="text-red-400 text-sm font-medium">{processedAnomalies.counts.critical}</div>
            <div className="text-red-300 text-[10px]">Critical</div>
          </div>
          <div>
            <div className="text-orange-400 text-sm font-medium">{processedAnomalies.counts.warning}</div>
            <div className="text-orange-300 text-[10px]">Warning</div>
          </div>
          <div>
            <div className="text-yellow-400 text-sm font-medium">{processedAnomalies.counts.moderate}</div>
            <div className="text-yellow-300 text-[10px]">Moderate</div>
          </div>
          <div>
            <div className="text-blue-400 text-sm font-medium">{processedAnomalies.counts.technical}</div>
            <div className="text-blue-300 text-[10px]">Technical</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
