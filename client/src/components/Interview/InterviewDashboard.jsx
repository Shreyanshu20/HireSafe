import React, { useState } from "react";

const InterviewDashboard = ({ anomalies, onClose, onReportMalpractice }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [manualReportType, setManualReportType] = useState("");
  const [manualReportDescription, setManualReportDescription] = useState("");

  const anomalyTypes = [
    {
      value: "multiple_faces",
      label: "Multiple Faces",
      icon: "👥",
      color: "text-red-600",
    },
    {
      value: "no_face",
      label: "No Face Detected",
      icon: "❌",
      color: "text-orange-600",
    },
    {
      value: "looking_away",
      label: "Looking Away",
      icon: "👀",
      color: "text-yellow-600",
    },
    {
      value: "eyes_closed",
      label: "Eyes Closed",
      icon: "😴",
      color: "text-purple-600",
    },
  ];

  const getAnomalyIcon = (type) => {
    const anomaly = anomalyTypes.find((a) => a.value === type);
    return anomaly ? anomaly.icon : "⚠️";
  };

  const getAnomalyColor = (type) => {
    const anomaly = anomalyTypes.find((a) => a.value === type);
    return anomaly ? anomaly.color : "text-gray-600";
  };

  const getSeverityBadge = (confidence) => {
    if (confidence >= 0.8) return "bg-red-100 text-red-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-blue-100 text-blue-800";
  };

  const getSeverityText = (confidence) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const handleManualReport = () => {
    if (manualReportType && manualReportDescription) {
      onReportMalpractice(
        manualReportType,
        0.9,
        `Manual report: ${manualReportDescription}`
      );
      setManualReportType("");
      setManualReportDescription("");
    }
  };

  const exportAnomalies = () => {
    const data = anomalies.map((anomaly) => ({
      timestamp: anomaly.timestamp,
      type: anomaly.type,
      confidence: anomaly.confidence,
      description: anomaly.description,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-anomalies-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
  };

  return (
    <div className="h-full bg-gray-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Anomaly Dashboard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-300">
            Total Anomalies: {anomalies.length}
          </span>
          {anomalies.length > 0 && (
            <button
              onClick={exportAnomalies}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          {anomalyTypes.map((type) => {
            const count = anomalies.filter((a) => a.type === type.value).length;
            return (
              <div
                key={type.value}
                className="bg-gray-700 p-2 rounded text-center"
              >
                <div className="text-lg">{type.icon}</div>
                <div className="text-xs text-gray-300">{type.label}</div>
                <div className="text-sm font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anomaly List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-medium mb-3">Recent Anomalies</h4>

        {anomalies.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No anomalies detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies
              .slice()
              .reverse()
              .map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 ${
                    selectedAnomaly?.id === anomaly.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  onClick={() => setSelectedAnomaly(anomaly)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {getAnomalyIcon(anomaly.type)}
                      </span>
                      <span
                        className={`text-sm ${getAnomalyColor(anomaly.type)}`}
                      >
                        {anomaly.type.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getSeverityBadge(
                        anomaly.confidence
                      )}`}
                    >
                      {getSeverityText(anomaly.confidence)}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-300">
                    {anomaly.timestamp} • Confidence:{" "}
                    {(anomaly.confidence * 100).toFixed(1)}%
                  </div>

                  {anomaly.description && (
                    <div className="mt-1 text-xs text-gray-400">
                      {anomaly.description}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Manual Report Section */}
      <div className="border-t border-gray-700 p-4">
        <h4 className="text-sm font-medium mb-3">Manual Report</h4>

        <div className="space-y-3">
          <select
            value={manualReportType}
            onChange={(e) => setManualReportType(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="">Select anomaly type</option>
            {anomalyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          <textarea
            value={manualReportDescription}
            onChange={(e) => setManualReportDescription(e.target.value)}
            placeholder="Describe the observed behavior..."
            rows={2}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm resize-none"
          />

          <button
            onClick={handleManualReport}
            disabled={!manualReportType || !manualReportDescription}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm py-2 rounded"
          >
            Report Anomaly
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
